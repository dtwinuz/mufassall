// Vite resolves "?raw" imports to the file text (used by _core.test.ts).
declare module "*?raw" {
  const text: string;
  export default text;
}
