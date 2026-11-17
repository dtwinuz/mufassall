/**
 * The course map: sections ("folders") and their lessons in reading order.
 * A slug listed here must exist under ./public/<slug>/ (lesson.ts + uz/ru/en); the test enforces it.
 */
export interface Section {
  id: string;
  lessons: readonly string[];
}

export const sections: readonly Section[] = [
  { id: "foundations", lessons: ["request-lifecycle", "latency-throughput", "napkin-math"] },
  { id: "scaling", lessons: ["vertical-horizontal", "load-balancing", "stateless", "caching", "cdn"] },
  {
    id: "data",
    lessons: [
      "sql-nosql",
      "indexes",
      "storage-engines",
      "replication",
      "sharding",
      "consistent-hashing",
      "unique-ids",
      "cap",
      "consensus",
      "transactions",
      "files",
    ],
  },
  { id: "communication", lessons: ["apis", "queues", "pubsub", "realtime", "callbacks"] },
  { id: "reliability", lessons: ["redundancy", "rate-limiting", "timeouts-retries", "observability"] },
  { id: "architecture", lessons: ["microservices", "service-discovery", "sagas", "batch-stream"] },
  { id: "security", lessons: ["authentication", "authorization", "encryption"] },
  { id: "shipping", lessons: ["testing", "cicd"] },
  { id: "systems", lessons: ["hld-lld", "design-url-shortener", "design-news-feed", "design-chat"] },
  { id: "business", lessons: ["payments"] },
];
