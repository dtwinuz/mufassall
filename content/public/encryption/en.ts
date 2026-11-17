import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Encryption and secrets",
  summary:
    "A notes app keeps people's private notes. We find every place where a stolen copy is readable: the network, the disk, the backups and the config file, and close them one by one.",
  learn: [
    "What a TLS handshake checks and why certificates must renew themselves",
    "Encryption at rest, and why a key next to the data protects nothing",
    "Envelope encryption: a data key per record, a master key that never leaves the KMS",
    "Secrets in a secrets manager with short leases, and key rotation without re-encrypting everything",
  ],
  nodes: {
    app: "Phone app",
    api: "Notes API",
    db: "Database",
    attacker: "Attacker",
    ca: "Certificate authority",
    backup: "Backups",
    kms: "KMS",
    secrets: "Secrets manager",
  },
  metrics: {
    "open-spots": "Readable copies",
    p95: "Response p95",
    errors: "Failed requests",
  },
  steps: {
    plain: {
      short: "Plain HTTP",
      title: "Notes travel in plain text",
      body: "The app sends notes over plain HTTP. On a cafe Wi-Fi, anyone on the same network can record every packet.\n\nThey see the note, and they see the `Authorization` token, so they can act as the user later. There are four places where the data is readable: the wire, the disk, the backups and the config file.",
      watch: "A token sent in plain text is as good as a password handed over.",
      fields: {
        Host: "Which server the request is for. Without TLS, this and everything below is visible on the way.",
        Authorization: "The user's session token. Whoever copies it is the user until it expires.",
        text: "The private note itself, readable by every router on the path.",
      },
    },
    tls: {
      short: "TLS",
      title: "TLS handshake: a shared key and a proof of identity",
      body: "Before any data, the app and the server agree on a fresh key: each sends the public half of a `key_share`, and both compute the same secret. Nobody watching can compute it.\n\nThe server also sends its certificate: a signed statement from a CA that this key belongs to `api.example.com`. The app checks the name, the signature and the dates. The first request on a new connection pays one extra round trip, so p95 grows a little.",
      fields: {
        SNI: "The name the app wants. One IP can serve many sites; this picks the right certificate.",
        key_share: "The public half of a one-time key. The two halves give both sides the same secret.",
        subject: "Who the certificate is for. Must match the name the app asked for.",
        issuer: "Who signed it. The app trusts only a short built-in list of issuers.",
        "valid until": "The expiry date. After it, every client refuses the certificate.",
        Finished: "From here the traffic is encrypted. The sniffer now sees only noise.",
      },
    },
    expired: {
      short: "Expired",
      title: "The certificate expired at midnight",
      body: "Someone renewed the certificate by hand once a year. This year the reminder went to a person who had left.\n\nAt midnight every app starts refusing the server. Nothing in the code changed, yet 100% of requests fail until a new certificate is installed.",
      watch: "An expiry date is a planned outage that someone forgot to cancel.",
      fields: {
        "valid until": "The certificate's last valid moment, yesterday.",
        "client clock": "The phone's own time. The check is done on the client, not on the server.",
        expired: "The client closes the connection. The user sees a network error.",
      },
    },
    renew: {
      short: "Auto renew",
      title: "Certificates renew themselves",
      body: "The server now asks the CA for a new certificate on its own, with the ACME protocol. It proves it controls the domain and gets a certificate for 90 days.\n\nRenewal starts when a third of the lifetime is left, and an alert fires if less than 14 days remain. A short lifetime is fine when nobody has to remember it.",
      fields: {
        identifiers: "The names the certificate must cover.",
        status: "`pending` until the CA checks that the server really controls the domain.",
        finalize: "Where the server sends its key request once the check passes, to receive the certificate.",
      },
    },
    backup: {
      short: "Backups",
      title: "A backup leaks, and it is plain text",
      body: "Nightly backups go to a storage bucket. One bucket had a wrong permission, and a file got copied.\n\nTLS protects data on the move, not data lying on a disk. The backup is the database as is: every note, readable with ordinary tools.",
      watch: "Every copy of the data counts: replicas, backups, exports, logs.",
      fields: {
        strings: "A plain tool that prints readable text from any file. No password needed.",
        u_42: "The note's owner. One leaked file gives every user's notes.",
      },
    },
    "at-rest": {
      short: "At rest",
      title: "Encrypt the notes before saving them",
      body: "The API now encrypts the note with AES-256-GCM before the `INSERT`. The database, its disk and its backups hold only ciphertext.\n\nThe key is in the API's config file and loaded at start. The leaked backup is now useless, and the cost is a few milliseconds per request.",
      fields: {
        text_enc: "The encrypted note. Without the key it is random bytes.",
        nonce: "A unique value per encryption. Reusing one with the same key breaks GCM, so it is stored next to the row.",
      },
    },
    "key-leak": {
      short: "Key leak",
      title: "The key sits next to the data",
      body: "A container image with the config file was pushed to a public registry by mistake. It holds the database password and the encryption key.\n\nWith the key, the old backup decrypts in seconds. The key is two years old and used for every row: changing it means re-encrypting the whole table, so nobody did.",
      watch: "Encryption moves the problem to the key. Where the key lives decides everything.",
      fields: {
        db_password: "The database password, in the same file as the code. Hidden here.",
        notes_key: "The one key for all notes. Anyone holding it reads every backup ever made. Hidden here.",
        notes_key_created: "Never rotated. Every note from two years is encrypted with it.",
      },
    },
    envelope: {
      short: "Envelope",
      title: "Envelope encryption with a KMS",
      body: "The master key now lives in a KMS and never leaves it. For each note the API asks for a fresh data key: it gets the key in plain form to encrypt with, and the same key wrapped by the master key.\n\nThe API encrypts the note, stores the wrapped key next to the row and forgets the plain one. To read, it sends the wrapped key back to the KMS, which checks permissions and logs the call. A copy of the database without access to the KMS is just noise.",
      watch: "Do not call the KMS on every read. Keep unwrapped data keys in memory for a few minutes, never on disk.",
      fields: {
        key_spec: "What kind of data key to make: 256-bit AES.",
        plaintext: "The data key in plain form. Used in memory, then thrown away. Hidden here.",
        ciphertext_blob: "The same data key wrapped by the master key. Safe to store next to the note.",
        key_version: "Which version of the master key wrapped it. Needed later for rotation.",
      },
    },
    secrets: {
      short: "Secrets",
      title: "No secrets in code: a secrets manager",
      body: "The database password moves out of the config file. At start the API proves who it is with its machine identity and gets a database login from the secrets manager.\n\nThe login lives one hour and is renewed while the API runs. The image and the repository now hold no secret at all, and a leaked one stops working by itself.",
      fields: {
        "X-Auth-Token": "A short-lived token issued to this machine, not typed by a person. Hidden here.",
        username: "A login made for this API instance. Each instance gets its own.",
        password: "The database password, valid for this lease only. Hidden here.",
        lease_duration: "One hour in seconds. After that the database rejects the login.",
      },
    },
    rotate: {
      short: "Rotation",
      title: "Rotation without re-encrypting the data",
      body: "Every year the KMS makes a new master key version, and old versions stay to decrypt old data. New notes get version `4` at once.\n\nA background job re-wraps the stored data keys: it sends each wrapped key to the KMS and stores the new wrap. Only the small keys change, the notes stay as they are. Database logins rotate on their own every hour.",
      fields: {
        source_key_version: "The version that wrapped this data key before.",
        key_version: "The new version. When no row uses version `3`, it can be disabled.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Find every place a copy of the data lives, then close each one.\n\n1) TLS on every connection, with certificates that renew themselves and an alert before expiry. 2) Encrypt at rest, including backups. 3) Envelope encryption: data keys per record, the master key only in the KMS. 4) Secrets in a secrets manager with short leases, never in code. 5) Rotate by re-wrapping keys, not by re-encrypting data.",
    },
  },
};

export default text;
