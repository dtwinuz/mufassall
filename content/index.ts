import type { LessonInput, LessonText } from "@mufassall/scene-schema";
import callbacks from "./public/callbacks/lesson";
import callbacksEn from "./public/callbacks/en";
import callbacksRu from "./public/callbacks/ru";
import callbacksUz from "./public/callbacks/uz";
import payments from "./public/payments/lesson";
import paymentsEn from "./public/payments/en";
import paymentsRu from "./public/payments/ru";
import paymentsUz from "./public/payments/uz";

export const LANGS = ["uz", "ru", "en"] as const;
export type Lang = (typeof LANGS)[number];

export interface Track {
  id: string;
  lessons: string[];
}

export interface LessonEntry<T extends LessonInput = LessonInput> {
  lesson: T;
  text: Record<Lang, LessonText<T>>;
}

/** Public lessons only. Internal lessons are served by the API and never bundled here. */
export const lessons: Record<string, LessonEntry> = {
  callbacks: { lesson: callbacks, text: { uz: callbacksUz, ru: callbacksRu, en: callbacksEn } },
  payments: { lesson: payments, text: { uz: paymentsUz, ru: paymentsRu, en: paymentsEn } },
};

export const tracks: Track[] = [
  { id: "reliability", lessons: ["callbacks"] },
  { id: "payments", lessons: ["payments"] },
];
