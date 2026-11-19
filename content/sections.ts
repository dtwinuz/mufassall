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
  { id: "scaling", lessons: ["vertical-horizontal", "load-balancing", "stateless", "connection-pooling", "caching", "cache-invalidation", "cdn"] },
  {
    id: "data",
    lessons: [
      "sql-nosql",
      "indexes", "cursor-pagination",
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
  { id: "communication", lessons: ["apis", "api-gateway", "queues", "pubsub", "realtime", "callbacks", "webhooks"] },
  { id: "reliability", lessons: ["redundancy", "rate-limiting", "timeouts-retries", "circuit-breaker", "observability", "slo-error-budget", "backpressure"] },
  { id: "architecture", lessons: ["microservices", "service-discovery", "sagas", "cdc", "outbox-pattern", "distributed-locks", "batch-stream", "multi-tenancy", "event-sourcing"] },
  { id: "security", lessons: ["authentication", "authorization", "encryption", "secrets-management", "pii-masking"] },
  { id: "shipping", lessons: ["testing", "cicd", "graceful-shutdown", "zero-downtime-migrations", "feature-flags"] },
  {
    id: "systems",
    lessons: ["hld-lld", "design-url-shortener", "design-news-feed", "design-chat", "design-video-streaming", "design-search-autocomplete", "design-job-scheduler"],
  },
  {
    id: "business",
    lessons: [
      "payments", "kyc-onboarding",
      "money-and-rounding", "double-entry-ledger",
      "reconciliation",
      "subscription-billing",
      "digital-signature",
      "document-lifecycle",
      "audit-log",
      "notification-delivery",
      "bulk-import",
      "refunds-and-chargebacks", "inventory-reservation",
      "document-numbering",
    ],
  },
  { id: "cases", lessons: ["case-discord-messages", "case-figma-multiplayer"] },
  {
    id: "projects",
    lessons: [
      "project-dtwinuz-landscape",
      "project-deploy-kit",
      "project-mufassall",
      "project-bitg",
      "project-teletwin-web",
      "project-operobot2",
      "project-gym-dtwin",
      "project-halvet",
      "project-wonmor-io",
      "project-muhr",
      "project-sanad",
      "project-shaffof",
      "project-vutric",
      "project-tilouz",
      "project-uz-open-data",
      "project-research",
    ],
  },
];
