export { LessonPlayer, type LessonPlayerProps } from "./LessonPlayer";
export { Scene, SceneDefs, type SceneProps } from "./Scene";
export { iso, lessonBounds, edgeSegment, fromIso, gridBounds } from "./iso";
export { type LabStrings, type UiStrings, fill } from "./ui";
// the editor lives at "@mufassall/scene-engine/lab-editor" so lesson pages never download it
export { type LabDoc, decodeDoc, encodeDoc, fromScene, sanitize, toLessonCode } from "./lab";
export { downloadPng, downloadSvg, standaloneSvg } from "./export";
export {
  designState,
  hasExchanges,
  toD2,
  toMermaidFlowchart,
  toMermaidSequence,
  toPlantUmlComponents,
  toPlantUmlSequence,
  type TextExportOptions,
  type SequenceText,
} from "./textexport";
export { practiceFor, type Practice } from "./practice";
export { PRACTICE_UI, practiceStrings } from "./practice-ui";
