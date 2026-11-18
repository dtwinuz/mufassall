# @mufassall/mcp

A local [MCP](https://modelcontextprotocol.io) server over stdio, so an AI agent can read, check and
export mufassall lessons. It has no dependencies and no build step. Node (23.6 or newer) runs the
course's TypeScript sources directly through its built-in type stripping, and `src/loader.mjs` adds
the one thing Node is missing: it resolves extensionless imports like `./lab`.

- Protocol: JSON-RPC 2.0, one message per line, MCP `2025-06-18`. If a client asks for `2025-03-26`
  or `2024-11-05`, the server answers in that version and drops `structuredContent` and tool titles.
  If a client asks for an unknown version, the server answers with `2025-06-18`.
- stdout carries protocol messages only. Logs go to stderr.

## Tools

| tool | input | output |
| --- | --- | --- |
| `list_lessons` | `lang?`, `section?` | slug, title, section, steps, level, minutes |
| `get_lesson` | `slug`, `lang?` | steps (title, plain text, focus, message start lines), final design scene, metrics, scenarios, quiz checks with answers |
| `validate_lesson` | `lesson` (object, `{lesson, text}` bundle, or `lesson.ts` source), `text?` (`{uz, ru, en}` objects or sources), `lang?` | `valid`, errors and warnings from the scene schema (zod) and the author-mode checks |
| `export_diagram` | `slug`, `format`, `lang?` | `mermaid-flowchart`, `mermaid-sequence`, `d2`, `plantuml` (sequence), `plantuml-components` |
| `practice_rubric` | `slug`, `lang?` | the Lab practice rules (with an English sentence each) and the three hint levels |

`lang` is `uz`, `ru` or `en` and defaults to `en`. Every tool returns a text block and `structuredContent`.

Resources: `mufassall://lessons/{slug}` returns the `get_lesson` JSON in English. Add `/uz`, `/ru` or `/en` for another language.

`validate_lesson` reads source text without running it. Strict JSON works, and so does the object
literal inside `defineLesson(...)`, after `export default`, or after `const text: ... =`. A source that
builds values with code (shared `const`s, spreads, `${}`) is refused, and the error gives the line. In
that case, send the lesson as an object.

## Use with Claude Code

From the repo root:

```sh
claude mcp add mufassall -- node packages/mcp/bin/server.mjs
```

Or commit a project `.mcp.json`:

```json
{
  "mcpServers": {
    "mufassall": {
      "command": "node",
      "args": ["packages/mcp/bin/server.mjs"]
    }
  }
}
```

Other clients (Claude Desktop, Cursor and others) take the same `command` and `args`. Use an absolute path to
`server.mjs` if the client does not start in the repo.

## Try it by hand

```sh
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"sh","version":"1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"export_diagram","arguments":{"slug":"caching","format":"mermaid-flowchart"}}}' \
  | node packages/mcp/bin/server.mjs
```

## Tests

`pnpm exec vitest run packages/mcp`. The tests cover a session driven through the handler, a real stdio
session (`node bin/server.mjs`), the source reader checked against every course lesson file, and the
argument checker.
