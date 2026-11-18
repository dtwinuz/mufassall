/**
 * Reads the data a `lesson.ts` (or `en.ts`) file exports: JSON, or the object literal passed to
 * `defineLesson(...)` / after `export default`. A hand-written single-pass scanner (no regex
 * backtracking, no eval): unquoted keys, '...' / "..." / `...` strings, trailing commas,
 * comments, `20_000` and `as const` are accepted; spreads, variables and `${}` are not.
 */

export class SourceError extends Error {
  readonly line: number;
  readonly column: number;
  constructor(message: string, line: number, column: number) {
    super(`${message} (line ${line}, column ${column})`);
    this.line = line;
    this.column = column;
  }
}

/** The value a lesson source text describes. Throws `SourceError` with a position. */
export function parseLessonSource(src: string): unknown {
  const trimmed = src.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // not strict JSON: read it as a JS literal below
    }
  }
  const start = literalStart(src);
  const p = new Parser(src, start);
  const value = p.value();
  return value;
}

/** Index of the first non-blank char at or after `i`. */
function nextChar(src: string, i: number): number {
  while (i < src.length && (src[i] === " " || src[i] === "\t" || src[i] === "\n" || src[i] === "\r")) i++;
  return i;
}

/**
 * Where the data starts: the argument of `defineLesson(`, or a `{` right after `export default`
 * or after the first `=` (`const text: LessonText<...> = {`), or the text itself if it opens with
 * `{` / `[`. An `import { x }` brace is never taken for the literal.
 */
function literalStart(src: string): number {
  const define = src.indexOf("defineLesson(");
  if (define >= 0) {
    const at = nextChar(src, define + "defineLesson(".length);
    if (src[at] === "{") return at;
  }
  const exp = src.indexOf("export default");
  if (exp >= 0) {
    const at = nextChar(src, exp + "export default".length);
    if (src[at] === "{") return at;
  }
  for (let eq = src.indexOf("="); eq >= 0; eq = src.indexOf("=", eq + 1)) {
    if (src[eq + 1] === "=" || src[eq + 1] === ">" || src[eq - 1] === "=" || src[eq - 1] === "!") continue;
    const at = nextChar(src, eq + 1);
    if (src[at] === "{" || src[at] === "[") return at;
  }
  const first = nextChar(src, 0);
  if (src[first] === "{" || src[first] === "[") return first;
  throw new SourceError("no object literal found", 1, 1);
}

const isIdStart = (c: string) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
const isDigit = (c: string) => c >= "0" && c <= "9";
const isIdPart = (c: string) => isIdStart(c) || isDigit(c);

class Parser {
  private i: number;
  private readonly s: string;
  /** nesting guard: lesson files are shallow, a deep input is hostile */
  private depth = 0;

  constructor(s: string, start: number) {
    this.s = s;
    this.i = start;
  }

  fail(message: string, at = this.i): never {
    let line = 1;
    let col = 1;
    for (let k = 0; k < at && k < this.s.length; k++) {
      if (this.s[k] === "\n") {
        line++;
        col = 1;
      } else col++;
    }
    throw new SourceError(message, line, col);
  }

  skip(): void {
    const s = this.s;
    while (this.i < s.length) {
      const c = s[this.i]!;
      if (c === " " || c === "\t" || c === "\n" || c === "\r") this.i++;
      else if (c === "/" && s[this.i + 1] === "/") {
        const end = s.indexOf("\n", this.i);
        this.i = end < 0 ? s.length : end + 1;
      } else if (c === "/" && s[this.i + 1] === "*") {
        const end = s.indexOf("*/", this.i + 2);
        if (end < 0) this.fail("unclosed comment");
        this.i = end + 2;
      } else break;
    }
  }

  value(): unknown {
    this.skip();
    const c = this.s[this.i];
    if (c === undefined) this.fail("unexpected end of input");
    let v: unknown;
    if (c === "{") v = this.object();
    else if (c === "[") v = this.array();
    else if (c === '"' || c === "'" || c === "`") v = this.string();
    else if (c === "-" || c === "+" || c === "." || isDigit(c)) v = this.number();
    else if (isIdStart(c)) {
      const at = this.i;
      const word = this.ident();
      if (word === "true") v = true;
      else if (word === "false") v = false;
      else if (word === "null") v = null;
      else this.fail(`"${word}" is not a literal value (variables and calls are not supported)`, at);
    } else this.fail(`unexpected "${c}"`);
    this.skipCast();
    return v;
  }

  /** `as const` / `satisfies T` after a value carry no data */
  skipCast(): void {
    for (;;) {
      this.skip();
      const at = this.i;
      if (!isIdStart(this.s[this.i] ?? "")) return;
      const word = this.ident();
      if (word !== "as" && word !== "satisfies") {
        this.i = at;
        return;
      }
      this.skip();
      if (!isIdStart(this.s[this.i] ?? "")) this.fail(`a type name after "${word}"`);
      this.ident();
    }
  }

  ident(): string {
    const from = this.i;
    while (this.i < this.s.length && isIdPart(this.s[this.i]!)) this.i++;
    return this.s.slice(from, this.i);
  }

  enter(): void {
    if (++this.depth > 64) this.fail("nested too deep");
  }

  object(): Record<string, unknown> {
    this.enter();
    this.i++;
    const out: Record<string, unknown> = {};
    for (;;) {
      this.skip();
      const c = this.s[this.i];
      if (c === "}") {
        this.i++;
        break;
      }
      let key: string;
      if (c === '"' || c === "'") key = this.string();
      else if (c !== undefined && (isIdStart(c) || isDigit(c))) key = this.ident();
      else if (c === "." && this.s.startsWith("...", this.i)) this.fail("spread (...) is not supported");
      else this.fail(c === undefined ? "unclosed object" : `unexpected "${c}" where a key was expected`);
      this.skip();
      if (this.s[this.i] !== ":") this.fail(`":" expected after key "${key}"`);
      this.i++;
      // own-property define: a "__proto__" key stays plain data
      Object.defineProperty(out, key, { value: this.value(), enumerable: true, writable: true, configurable: true });
      this.skip();
      if (this.s[this.i] === ",") this.i++;
      else if (this.s[this.i] !== "}") this.fail('"," or "}" expected');
    }
    this.depth--;
    return out;
  }

  array(): unknown[] {
    this.enter();
    this.i++;
    const out: unknown[] = [];
    for (;;) {
      this.skip();
      if (this.s[this.i] === "]") {
        this.i++;
        break;
      }
      if (this.i >= this.s.length) this.fail("unclosed array");
      out.push(this.value());
      this.skip();
      if (this.s[this.i] === ",") this.i++;
      else if (this.s[this.i] !== "]") this.fail('"," or "]" expected');
    }
    this.depth--;
    return out;
  }

  string(): string {
    const s = this.s;
    const q = s[this.i]!;
    const from = this.i;
    this.i++;
    let out = "";
    for (;;) {
      const c = s[this.i];
      if (c === undefined) this.fail("unclosed string", from);
      this.i++;
      if (c === q) return out;
      if (q === "`" && c === "$" && s[this.i] === "{") this.fail("template placeholders (${...}) are not supported", this.i - 1);
      if ((c === "\n" || c === "\r") && q !== "`") this.fail("line break inside a quoted string", this.i - 1);
      if (c !== "\\") {
        out += c;
        continue;
      }
      const e = s[this.i];
      this.i++;
      switch (e) {
        case "n":
          out += "\n";
          break;
        case "t":
          out += "\t";
          break;
        case "r":
          out += "\r";
          break;
        case "b":
          out += "\b";
          break;
        case "f":
          out += "\f";
          break;
        case "v":
          out += "\v";
          break;
        case "0":
          out += "\0";
          break;
        case "\r":
          if (s[this.i] === "\n") this.i++;
          break;
        case "\n":
          break;
        case "u": {
          let hex: string;
          if (s[this.i] === "{") {
            const end = s.indexOf("}", this.i);
            if (end < 0 || end - this.i > 7) this.fail("bad \\u{...} escape");
            hex = s.slice(this.i + 1, end);
            this.i = end + 1;
          } else {
            hex = s.slice(this.i, this.i + 4);
            this.i += 4;
          }
          const code = Number.parseInt(hex, 16);
          if (!/^[0-9a-fA-F]{1,6}$/.test(hex) || code > 0x10ffff) this.fail("bad \\u escape");
          out += String.fromCodePoint(code);
          break;
        }
        case "x": {
          const hex = s.slice(this.i, this.i + 2);
          if (!/^[0-9a-fA-F]{2}$/.test(hex)) this.fail("bad \\x escape");
          out += String.fromCharCode(Number.parseInt(hex, 16));
          this.i += 2;
          break;
        }
        case undefined:
          this.fail("unclosed string", from);
          break;
        default:
          out += e;
      }
    }
  }

  number(): number {
    const s = this.s;
    const from = this.i;
    if (s[this.i] === "-" || s[this.i] === "+") this.i++;
    while (this.i < s.length) {
      const c = s[this.i]!;
      const exponentSign = (c === "-" || c === "+") && (s[this.i - 1] === "e" || s[this.i - 1] === "E");
      if (isDigit(c) || c === "." || c === "_" || c === "e" || c === "E" || exponentSign) this.i++;
      else break;
    }
    const text = s.slice(from, this.i).replaceAll("_", "");
    const n = Number(text);
    if (text === "" || text === "-" || text === "+" || !Number.isFinite(n)) this.fail(`bad number "${s.slice(from, this.i)}"`, from);
    return n;
  }
}
