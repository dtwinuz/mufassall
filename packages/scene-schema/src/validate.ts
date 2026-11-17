import { z } from "zod";
import { EDGE_MODES, FLOWS, LEVELS, type LessonInput, NODE_KINDS, NODE_STATES, STEP_KINDS, TIERS, WIRE_FORMATS } from "./index";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "id: lowercase latin, digits and dashes");

const nodePatch = z
  .object({
    kind: z.enum(NODE_KINDS),
    at: z.tuple([z.number().int(), z.number().int()]),
    state: z.enum(NODE_STATES),
    load: z.number().int().min(0).max(100),
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
    mode: z.enum(EDGE_MODES),
  })
  .partial()
  .strict();

const wireMessage = z
  .object({
    head: z.string().min(1),
    headers: z.array(z.tuple([z.string().min(1), z.string()])).optional(),
    body: z.string().optional(),
    format: z.enum(WIRE_FORMATS),
  })
  .strict();

const exchange = z
  .object({
    edge: id,
    request: wireMessage,
    response: wireMessage.optional(),
    marks: z.array(z.string().min(1)).max(9).optional(),
    masked: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const stepSchema = z
  .object({
    id,
    kind: z.enum(STEP_KINDS),
    nodes: z.record(id, nodePatch.nullable()).optional(),
    edges: z.record(id, edgePatch.nullable()).optional(),
    metrics: z.record(id, z.number()).optional(),
    focus: z.array(id).optional(),
    exchange: exchange.optional(),
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
    scenarios: z
      .array(z.object({ id, from: id, steps: z.array(stepSchema).min(1).max(6) }).strict())
      .max(4)
      .optional(),
  })
  .strict()
  .superRefine((lesson, ctx) => {
    const base = lesson.steps.map((s) => s.id);
    const taken = new Set(base);
    const ids = new Set<string>();
    lesson.scenarios?.forEach((sc, i) => {
      const at = (msg: string, ...path: (string | number)[]) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scenarios", i, ...path], message: msg });
      if (ids.has(sc.id)) at(`duplicate scenario id "${sc.id}"`, "id");
      ids.add(sc.id);
      const from = base.indexOf(sc.from);
      if (from < 0) at(`branches from unknown step "${sc.from}"`, "from");
      else if (from === base.length - 1) at("cannot branch from the last step", "from");
      sc.steps.forEach((s, j) => {
        if (taken.has(s.id)) at(`step id "${s.id}" is already used by the base story or another scenario`, "steps", j, "id");
        taken.add(s.id);
      });
    });
  });

/** Strict check of a lesson's shape (typos, extra keys, ranges). Throws with a readable path. */
export function validateLesson(lesson: LessonInput): void {
  const r = lessonSchema.safeParse(lesson);
  if (!r.success) {
    const where = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`lesson "${lesson.slug}": ${where}`);
  }
}
