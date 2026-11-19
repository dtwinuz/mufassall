import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Masking personal data",
  summary:
    "A name, a phone, a passport number, a card number, an address, even an IP: personal data enters through one form and then quietly spreads to logs, the error tracker, analytics, support screens and the staging database. How to keep the raw value in one place, show only what each reader needs, and still be able to erase a person when they ask.",
  learn: [
    "What counts as personal data, and why an id is almost always enough outside the main database",
    "Masking, tokenization, encryption and hashing: which one is reversible, by whom, and why a plain hash of a phone falls to brute force in a second",
    "Redaction at the edge of every sink: structured logs, error trackers, analytics exports, support screens and non-prod copies",
    "Revealing a value by role, with a reason and an audit entry; erasure requests against an append-only ledger, solved by crypto-shredding",
  ],
  nodes: {
    app: "Mobile app",
    support: "Support panel",
    api: "Customer API",
    db: "Customer DB",
    logs: "Log store",
    staging: "Staging DB",
    tracker: "Error tracker",
    analytics: "Analytics",
    keys: "Key service",
    masker: "Masking job",
  },
  metrics: {
    logpii: "Personal values in logs",
    copies: "Places with raw personal data",
    crack: "Hashed phones recovered",
    views: "Full values shown on screens",
    erase: "Copies left after erasure",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "An installment form and where its data goes",
      body: "A shop sells on installments. To sign a contract the app sends a name, phone, passport number, card number and address. The API saves them in the customer database, writes logs, and every night copies the whole database to staging for testers.\n\nRaw personal data already lives in two places, and support screens show full values about 9 000 times a day. Everything in this lesson is fake: `+998 90 000 00 00`, `AA1234567`, the `4111` test card.",
      fields: {
        full_name: "Personal data: it names a person directly.",
        phone: "Personal data, and a key to the person in other systems: messengers, banks, delivery.",
        passport: "A document number: among the most sensitive fields, enough to impersonate someone.",
        card_number: "The card number (PAN): card-industry rules (PCI DSS) govern every system it touches.",
        address: "Personal data: together with a name, it locates a person.",
        "X-Forwarded-For": "The client's IP address. It also counts as personal data in many laws.",
        customer_id: "A meaningless id. Outside the database, this is what other systems should carry.",
      },
    },
    "log-leak": {
      short: "Logs",
      title: "The whole customer ends up in the logs",
      body: "A scoring call times out and the error handler logs the request together with the customer object. The error tracker's SDK attaches the request body to the event by default.\n\nNow every failed request copies a name, phone, passport and address into a log store that 40 engineers can search for 30 days, and into a third-party tracker that keeps it for 90. That is 18 000 personal values a day, in four places instead of two.",
      watch: "Logs are copied everywhere: shipped, indexed, archived, exported. A value written to a log is a value you can no longer delete in one place.",
      fields: {
        request_id: "This alone is enough to find the request and, through it, the customer.",
        customer: "The whole object serialised: whatever fields are added later will leak too.",
        phone: "A raw phone in a searchable index.",
        passport: "A raw passport number, readable by everyone with log access.",
        "error tracker": "A second copy, at a vendor, with its own retention.",
      },
    },
    redact: {
      short: "Redact",
      title: "Redact by field name before anything leaves the process",
      body: "The structured logger gets a redaction list: these field names are replaced with `[redacted]` at any depth, before the line is written. The tracker SDK stops sending request bodies, and a `beforeSend` hook scrubs anything that slips through.\n\nThe log keeps `request_id` and `customer_id`. An engineer who really needs the person looks them up in the database, where access is controlled. Back to two places.",
      watch: "Redaction by name sees only fields. A phone glued into a message string, `\"SMS failed for +998...\"`, passes. Log ids, not values.",
      check: {
        q: "A developer adds a field `passport_series` next to `passport`. What happens with a deny list of names?",
        options: [
          "It is redacted too: it starts with passport",
          "It leaks until someone adds it to the list",
          "The logger refuses to start",
        ],
        answer: 1,
        why: "A deny list only knows the names written into it. That is why the stronger rule is to log a small allow list of safe fields (ids, statuses, durations) and treat everything else as redacted by default.",
      },
      fields: {
        redact: "Field names to replace, at any depth of the object.",
        sendRequestBody: "Off: the tracker gets the stack trace and ids, not the body.",
        customer_id: "Enough to investigate; the value stays where access is controlled.",
        "[redacted]": "What remains in the log instead of the value.",
      },
    },
    "four-ways": {
      short: "4 ways",
      title: "Mask, encrypt, tokenize, hash: four different promises",
      body: "**Masking** keeps a few characters for the eye, `AA*****67`; nothing can bring the rest back. **Encryption** is reversible by whoever holds the key, so it is right for values the business must read again, such as a passport for a contract. **Tokenization** swaps the value for a random token and keeps the original in a separate vault; the token means nothing anywhere else.\n\n**Hashing** is one-way and deterministic: the same input always gives the same output. That makes it useful for matching, and dangerous for short values, as the next step shows. Card numbers should not reach the shop at all: the provider's form tokenizes them, the shop keeps the token and the last four digits.",
      check: {
        q: "Support must read the passport in a contract dispute, analytics must count unique customers, logs need nothing. Which treatment for each?",
        options: [
          "Hash everywhere: it is one-way, so it is safe",
          "Encrypt in the database for support, a keyed hash for analytics, nothing in the logs",
          "Mask everywhere: the last digits are enough for all three",
        ],
        answer: 1,
        why: "Support needs the real value back, so only encryption (or a vault) works. Analytics needs equality, not the value, so a keyed hash fits. Logs need neither: an id is enough. A plain hash fails analytics as soon as the input is guessable.",
      },
      fields: {
        mask: "Partial display. Irreversible, fine for screens and receipts.",
        encrypt: "Reversible with a key that lives in a key service, not next to the data.",
        tokenize: "A random stand-in; only the vault maps it back.",
        hash: "One-way but repeatable: anyone can hash a guess and compare.",
        last4: "The only part of a card a shop normally keeps.",
      },
    },
    hash: {
      short: "Hash",
      title: "A hashed phone is not anonymous",
      body: "The analytics export replaces phones with `sha256(phone)` and is called anonymous. But a Uzbek mobile number is `998` plus 9 digits: at most 1 000 000 000 possibilities.\n\nOne GPU computes about 10 billion SHA-256 hashes per second. Whoever gets the file hashes every possible number in a tenth of a second and gets back all 410 000 phones. The export holds raw personal data after all: three places now.",
      watch: "Any field with a small or guessable set of values falls the same way: phones, passport numbers, birth dates, card numbers.",
      fields: {
        phone_sha256: "Deterministic and unkeyed: anyone can recompute it.",
        candidates: "All possible numbers. Small enough to try every one.",
        "one GPU": "No cluster needed: a gaming card does it.",
        "410 000": "Every customer, not a sample.",
      },
    },
    hmac: {
      short: "HMAC",
      title: "A keyed hash: HMAC with a secret key",
      body: "The API computes `phone_ref = HMAC-SHA256(key, phone)` with a 32-byte key held in the key service, and the export carries only the ref. Without the key there is nothing to brute-force: a guess cannot be checked.\n\nThe same phone still gives the same ref, so analytics can count and join inside its own dataset. Each consumer gets its own key, so two exports cannot be matched with each other, and a key can be rotated by recomputing refs.",
      check: {
        q: "Why not a random salt per row, as with passwords?",
        options: [
          "A per-row salt is better: use it",
          "With a per-row salt the same phone looks different every time: no lookup, no counting, no joins",
          "Salts make hashing slower",
        ],
        answer: 1,
        why: "A password is only checked against its own row, so a per-row salt costs nothing. Personal data refs must be found by value. And a salt is stored next to the hash, so 1 000 000 000 guesses per row are still cheap. A secret key (a pepper) is what an attacker with the file does not have.",
      },
      fields: {
        version: "Keys are versioned, so refs say which key made them.",
        value: "The key itself: only the key service and the API ever see it.",
        "HMAC-SHA256": "A hash mixed with a secret key: repeatable only for the key holder.",
        "never sees the key": "The file alone gives nothing to brute-force.",
        "same ref": "Equality survives, so counting unique customers still works.",
        "own key": "Different keys for different consumers stop cross-matching.",
      },
    },
    reveal: {
      short: "Reveal",
      title: "Support sees the last digits; the full value needs a reason",
      body: "The support panel shows `AA*****67` and `+998 ** *** ** 00` by default. An agent with the reveal role can open one field, with a reason that points to a ticket. The value is shown for 60 seconds and an audit entry records who, which field, which customer and why, but not the value itself.\n\nAnalysts have no reveal role at all. Full values on screens drop from 9 000 a day to 35, each one explained.",
      check: {
        q: "An agent reveals 400 passports in one evening, each with the reason \"check\". What catches it?",
        options: [
          "Nothing: the agent had the role",
          "A per-agent daily limit and an alert on the audit entries; the reason must name a real ticket",
          "Masking the passport in the audit entry",
        ],
        answer: 1,
        why: "Roles decide who may reveal; they do not notice abuse. The audit entries do, if someone looks: a limit such as 20 reveals a day, an alert above it, and a ticket check turn a silent export into a visible incident.",
      },
      fields: {
        field: "One field at a time, not the whole profile.",
        reason: "Tied to a ticket, so a reviewer can check it later.",
        visible_for_s: "The value disappears from the screen after a minute.",
        audit_id: "The record of the reveal. It holds no personal value itself.",
      },
    },
    staging: {
      short: "Staging",
      title: "Staging gets a masked copy, not the real one",
      body: "The nightly copy now runs through a masking job. Names come from a seeded generator, phones become `+998 00` plus digits derived from the customer id (no operator uses `00`), passports keep their format with letters `XX` that are never issued, cards keep only test tokens.\n\nThe same customer gets the same fake values in every table, so joins and tests still work. Testers and contractors work with realistic data that belongs to no one. One place with raw data is left: the production database.",
      check: {
        q: "A developer adds `customers.email2` but writes no masking rule for it. What should the job do?",
        options: [
          "Copy it as it is: it is only one column",
          "Stop and fail the dump until the column has a rule",
          "Silently drop the column",
        ],
        answer: 1,
        why: "A masking job must fail closed. Copying an unknown column leaks it; dropping it silently breaks staging in confusing ways. Failing the run makes someone decide: mask, generate or drop.",
      },
      fields: {
        seeded: "Generated, repeatable fake values: the same run gives the same names.",
        "same fake": "Derived from the id, so relations between tables survive.",
        "valid format": "Passes validation in the app, but cannot belong to anyone.",
        "pii.yaml": "The list of personal columns and their rule, reviewed like code.",
        "stops the job": "Fail closed: no rule, no copy.",
      },
    },
    erase: {
      short: "Erasure",
      title: "A customer asks to be erased",
      body: "Privacy laws in many countries let a person ask for their data to be deleted. The obvious `DELETE` fails: six contracts reference the customer. Payments in the ledger must be kept for 5 years and the ledger is append-only. The audit log is hash-chained, so deleting a row breaks the chain. And 35 nightly backups each hold the full row.\n\nThe person's data survives in four places that the system is designed never to change.",
      watch: "Erasure is not one DELETE. Every copy counts: rows, logs, exports, backups.",
      fields: {
        ERROR: "Foreign keys protect the contracts that still need the customer.",
        ledger: "Money records the law requires to keep, and that must never be edited.",
        audit_log: "Append-only and chained: editing it is exactly what it must prevent.",
        backups: "Old copies that nobody will edit row by row.",
      },
    },
    shred: {
      short: "Shred",
      title: "Crypto-shredding: delete the key, not the rows",
      body: "Profile fields (name, phone, address) were encrypted from the start with a key per customer, kept in the key service, not in the database. Erasure deletes that key. The rows stay, contracts and totals still add up, but the fields are noise everywhere, in all 35 backups too.\n\nThe passport is under a legal hold for the contracts; its key is deleted when the hold ends. The ledger and the audit never held a name, only `c_5120`. Logs and the tracker keep 14 and 30 days, so their copies age out.",
      check: {
        q: "Why must the per-customer keys not live in the same database as the data?",
        options: [
          "It is fine: the key table is small",
          "The database backups would keep a copy of each key next to the encrypted data, so deleting it erases nothing",
          "Keys in a database are slower to read",
        ],
        answer: 1,
        why: "Crypto-shredding works only if every copy of the key is gone. Keys in the same database are in the same 35 backups, so a restore brings the person back. A key service has its own short retention for deleted keys.",
      },
      fields: {
        "outside the DB backups": "The one place where deleting a key really deletes it.",
        erased: "The row stays for the contracts, marked as erased.",
        "all 35 backups": "The encrypted bytes there are useless without the key.",
        "legal hold": "Some data must be kept by law; it is erased when the hold ends.",
        "never a name": "Ledger and audit carry only ids, so they need no change.",
        "14 days": "Short retention makes old copies disappear without a cleanup job.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Seven rules for personal data.\n\n1) Keep the raw value in one database; everywhere else carry an id. 2) Redact at the edge of every sink: logger, error tracker, analytics, prefer an allow list of safe fields. 3) Pick the treatment by who must read the value back: mask for screens, encryption for the business, tokens for cards, a keyed hash (HMAC) for matching. 4) A plain hash of a phone or passport is not anonymous: brute force takes a second. 5) Show the last digits; reveal the full value by role, with a reason and an audit entry, and watch those entries. 6) Non-prod copies are masked or synthetic, and the masking job fails closed. 7) Plan erasure up front: per-person keys outside the database, crypto-shredding for append-only stores and backups, short retention for logs.",
    },
  },
  scenarios: {
    "debug-body": {
      label: "Debug body log",
      steps: {
        "debug-leak": {
          short: "Debug log",
          title: "A debug middleware logs the raw request body",
          body: "To chase a payment bug, someone switches on `DEBUG_HTTP` in production. The middleware logs every request body as one text string, including `POST /v1/cards` where customers bind a card.\n\nThe redaction list contains `card_number`, but it matches field names in structured data, and here the body is a single string. For three days, 1 300 card bindings a day go to the logs and the tracker: 3 900 full card numbers, CVV included.",
          check: {
            q: "Redaction is configured for `card_number`. Why did the number get through?",
            options: [
              "The redaction list had a typo",
              "The middleware logged the body as one string; redaction by field name never looks inside it",
              "The tracker ignores redaction",
            ],
            answer: 1,
            why: "Redaction works on structure. Once a body is flattened into a string, the field name is just text inside a value. Bodies must not be logged at all, and a pattern scanner downstream is the safety net for text.",
          },
          fields: {
            DEBUG_HTTP: "A switch meant for a laptop, turned on in production.",
            body: "The raw body as one string: invisible to field-name redaction.",
            "field names": "What redaction looks at: keys, not the text inside values.",
            "3 900": "Every card bound in those three days, with its security code.",
          },
        },
        "debug-stop": {
          short: "Stop",
          title: "Log the shape of a request, never its body",
          body: "The HTTP log line now has a fixed shape: method, path, status, size, duration and the request id. Headers and bodies are never logged, whatever the level. The service refuses to start with `DEBUG_HTTP` in production.\n\nAs a safety net, the log pipeline scans text for runs of 13 to 19 digits that pass the Luhn check of card numbers, replaces them and pages the security channel. New leaks stop at zero.",
          fields: {
            Never: "A rule in code, not a setting someone can flip.",
            refused: "The dangerous switch cannot reach production at all.",
            Luhn: "The card checksum: it tells a card number from an order number.",
            paged: "A leak is an incident, not a line in a dashboard.",
          },
        },
        "debug-clean": {
          short: "Clean up",
          title: "Delete every copy that already exists",
          body: "Stopping new leaks does not remove the 3 900 lines already written. The team deletes them by query in the three daily indices, deletes 212 tracker events through the vendor's API and asks the vendor to purge its copies, and rewrites the archived log objects, removing their old versions.\n\nCard data in logs is a PCI DSS incident: the payment provider and the risk team are told, and they decide about the cards. The count of places with raw data is back to two.",
          fields: {
            "delete by query": "Removes only the matching lines, not whole days of logs.",
            "212 events": "Each event in the tracker held a body with a card.",
            "old object versions": "Versioned storage keeps the old file unless the versions go too.",
            "PCI DSS": "Card-industry rules: a leaked card number must be reported, not just deleted.",
          },
        },
      },
    },
  },
};

export default text;
