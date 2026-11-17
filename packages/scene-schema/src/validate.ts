import { z } from "zod";
import { FLOWS, LEVELS, type LessonInput, NODE_KINDS, NODE_STATES, STEP_KINDS, TIERS } from "./index";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "id: lowercase latin, digits and dashes");

const nodePatch = z
  .object({
    kind: z.enum(NODE_KINDS),
    at: z.tuple([z.number().int(), z.number().int()]),
    state: z.enum(NODE_STATES),
  })
  .partial()
  .strict();

const edgePatch = z
  .object({
    from: id,
    to: id,
    flow: z.enum(FLOWS),
    rate: z.number().min(0).max(12),
    cut: z.boolean(),
  })
  .partial()
  .strict();

export const stepSchema = z
  .object({
    id,
    kind: z.enum(STEP_KINDS),
    nodes: z.record(id, nodePatch.nullable()).optional(),
    edges: z.record(id, edgePatch.nullable()).optional(),
    metrics: z.record(id, z.number()).optional(),
    focus: z.array(id).optional(),
  })
  .strict();

export const lessonSchema = z
  .object({
    slug: id,
    level: z.enum(LEVELS),
    minutes: z.number().int().positive().max(30),
    tier: z.enum(TIERS),
    metrics: z.array(z.object({ id, unit: z.string(), better: z.enum(["up", "down"]) }).strict()).max(6),
    steps: z.array(stepSchema).min(2).max(16),
  })
  .strict();

/** Strict check of a lesson's shape (typos, extra keys, ranges). Throws with a readable path. */
export function validateLesson(lesson: LessonInput): void {
  const r = lessonSchema.safeParse(lesson);
  if (!r.success) {
    const where = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`lesson "${lesson.slug}": ${where}`);
  }
}
