import { createServer } from "./protocol";
import { RESOURCES, TOOLS } from "./tools";

export const SERVER_NAME = "mufassall";
export const SERVER_VERSION = "0.1.0";

const INSTRUCTIONS =
  "mufassall is a system-design course of step-by-step scenes (uz, ru, en). Start with list_lessons, " +
  "read one with get_lesson, turn its design into Mermaid / D2 / PlantUML with export_diagram, " +
  "check a new or edited lesson with validate_lesson, and get the Lab practice checks with practice_rubric.";

export function createMufassallServer(log?: (line: string) => void) {
  return createServer({
    name: SERVER_NAME,
    title: "mufassall lessons",
    version: SERVER_VERSION,
    instructions: INSTRUCTIONS,
    tools: TOOLS,
    resources: RESOURCES,
    log,
  });
}
