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
  { id: "scaling", lessons: ["vertical-horizontal", "load-balancing", "stateless", "caching", "cache-invalidation", "cdn"] },
  {
    id: "data",
    lessons: [
      "sql-nosql",
      "indexes",
      "geo-search", "full-text-search", "vector-search",
      "storage-engines",
      "bloom-filter",
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
  { id: "communication", lessons: ["apis", "queues", "pubsub", "realtime", "callbacks", "webhooks"] },
  { id: "reliability", lessons: ["redundancy", "rate-limiting", "timeouts-retries", "observability", "slo-error-budget", "backpressure"] },
  { id: "architecture", lessons: ["microservices", "service-discovery", "sagas", "cdc", "outbox-pattern", "distributed-locks", "batch-stream", "multi-tenancy", "event-sourcing"] },
  { id: "security", lessons: ["authentication", "authorization", "encryption", "secrets-management"] },
  { id: "shipping", lessons: ["testing", "cicd", "zero-downtime-migrations", "feature-flags"] },
  {
    id: "systems",
    lessons: ["hld-lld", "design-url-shortener", "design-news-feed", "design-chat", "design-video-streaming", "design-search-autocomplete", "design-job-scheduler"],
  },
  {
    id: "business",
    lessons: [
      "payments",
      "money-and-rounding", "double-entry-ledger",
      "reconciliation",
      "subscription-billing",
      "digital-signature",
      "document-lifecycle",
      "audit-log",
      "notification-delivery",
      "bulk-import",
      "refunds-and-chargebacks",
      "document-numbering",
    ],
  },
  { id: "cases", lessons: ["case-discord-messages", "case-figma-multiplayer"] },
];
