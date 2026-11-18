#!/usr/bin/env node
// stdio transport: newline-delimited JSON-RPC on stdin/stdout, diagnostics on stderr only.
import { createInterface } from "node:readline";
import "../src/loader.mjs";

// stdout carries protocol messages only: anything a module prints goes to stderr instead
console.log = console.info = console.debug = console.error;

const log = (line) => process.stderr.write(`[mufassall-mcp] ${line}\n`);

let server;
try {
  const { createMufassallServer } = await import("../src/main.ts");
  server = createMufassallServer(log);
} catch (e) {
  log(`failed to start: ${e?.stack ?? e}`);
  process.exit(1);
}

process.stdout.on("error", (e) => {
  // the client went away
  if (e.code === "EPIPE") process.exit(0);
  throw e;
});

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const out = server.handleLine(line);
  if (out) process.stdout.write(`${out}\n`);
});
// no process.exit here: pending stdout writes drain, then the process ends on its own
rl.on("close", () => log("stdin closed"));
log("ready on stdio");
