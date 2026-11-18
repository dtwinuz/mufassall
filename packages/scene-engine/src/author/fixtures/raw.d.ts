// Vite resolves "?raw" imports to the file text (used by bpmn.test.ts).
declare module "*?raw" {
  const text: string;
  export default text;
}
