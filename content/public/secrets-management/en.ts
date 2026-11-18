import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Secrets management",
  summary:
    "A shop backend keeps its database password in a committed .env file shared by five services. It leaks, and the emergency rotation takes checkout down. A secrets manager fixes both: services prove who they are with a workload identity, get their own short-lived database users, secrets are encrypted at rest, keys rotate with overlapping versions, and every read is audited.",
  learn: [
    "Why a long-lived shared password in a repo or env file is one leak away from a breach",
    "Workload identity instead of a static token, and dynamic per-service database users with a lease",
    "Envelope encryption at rest and rotation without downtime through two overlapping versions",
    "An audit log of every secret read and a break-glass path for when the manager itself is down",
  ],
  nodes: {
    dev: "Developer",
    repo: "Git repo",
    orders: "Orders service",
    reports: "Reports job",
    db: "Shop DB",
    intruder: "Intruder",
    secrets: "Secrets manager",
    issuer: "Identity issuer",
    kms: "KMS",
    partner: "Partner API",
    audit: "Audit log",
    oncall: "On-call",
    safe: "Sealed safe",
  },
  metrics: {
    copies: "Static secret copies",
    blast: "Services per leak",
    "rotation-down": "Rotation downtime",
    audited: "Reads audited",
  },
  steps: {
    envfile: {
      short: "Env file",
      title: "The password lives in a file in the repo",
      body: "The orders service reads its database login from a `.env` file. The file is committed, so every clone, laptop, CI cache and backup has it. The reports job and three other services use the same user `app` with the same password.\n\nNine places hold a password that works forever and opens the whole shop database. Nobody has ever changed it, because nobody knows what would break.",
      fields: {
        DB_USER: "One user for every service. The database cannot tell them apart.",
        DB_PASSWORD: "A long-lived secret in plain text. In git history it stays even after you delete the line.",
        "same file": "Five services share it: one leak opens all five.",
        "never rotated": "Changing it means editing five files and redeploying five services at once.",
      },
    },
    leak: {
      short: "Leak",
      title: "A backup of the repo leaks, someone logs in",
      body: "A laptop backup with the repo was public for three days. At 02:14 someone connects to the database from an unknown address with user `app`, and the database lets them in: the password is correct. Two minutes later the customers table is copied out.\n\nThe logs show `user=app`, the same name as every service. Nothing distinguishes the intruder from the orders service except the IP address.",
      watch: "A secret that has ever been in git must be treated as leaked.",
      check: {
        q: "What limits the damage of the next leak the most?",
        options: [
          "Move the password to a private repo",
          "Give each service its own short-lived database user issued at runtime",
          "Make the password longer",
        ],
        answer: 1,
        why: "A private repo still copies the secret to every clone, and a longer password leaks just as easily. A per-service user that expires in an hour opens one service's tables for at most an hour, and it is never written to a file.",
      },
      fields: {
        "connection authorized": "The password was right, so the database had no reason to refuse.",
        "user=app": "The shared user: the log cannot say which service, or whether it was a service at all.",
        "203.0.113.50": "An address outside the network. Without an allow-list it is only a clue afterwards.",
        COPY: "Bulk export of the whole table in one statement.",
      },
    },
    rotate: {
      short: "Rotation",
      title: "Emergency rotation takes checkout down",
      body: "The admin changes the password at 02:31. Every service still holds the old one in memory and in its `.env`, so new connections fail and connection pools drain. Checkout answers `503` until each of the five services is redeployed with the new file.\n\nFour minutes of downtime, and the new password went into git the same way as the old one.",
      watch: "If rotating a secret needs a coordinated redeploy, it will not be rotated until it has leaked.",
      check: {
        q: "What lets a secret change without breaking running services?",
        options: [
          "Rotate only at night when traffic is low",
          "Restart every service right after the change",
          "Keep the old and the new version valid for a while, so clients move over before the old one is revoked",
        ],
        answer: 2,
        why: "Night or restarts still leave a moment where some clients hold a dead secret. An overlap window means there is never a moment with only one valid version that some client does not have yet.",
      },
      fields: {
        "ALTER ROLE": "The old password stops working immediately for new connections.",
        "password authentication failed": "Every service still sends the old password.",
        "503": "The pool has no live connections left, so requests fail.",
        "in git again": "Same process, same leak path.",
      },
    },
    manager: {
      short: "Manager",
      title: "Secrets move to a secrets manager",
      body: "The password leaves the repo, and git history is cleaned. Services now fetch it at startup from a **secrets manager**: a service that stores secrets, checks who is asking and returns only what that caller is allowed to read.\n\nBut to talk to the manager, each service needs a token, and that token sits in an env variable. It is a new static secret: the **secret zero** problem.",
      watch: "Moving a static secret into another static secret is progress, not a solution.",
      fields: {
        "X-Secret-Token": "A static token, valid until someone revokes it. It leaks like the password did.",
        version: "The manager keeps versions, so a change has a number and a history.",
        username: "Still the shared user `app` for now.",
      },
    },
    identity: {
      short: "Identity",
      title: "The service proves who it is, no stored token",
      body: "The platform that runs the pods gives each one a signed, short-lived token that says \"I am the orders service in the shop namespace\". The service presents it to the manager, which checks the signature with the identity issuer and maps it to the role `orders`.\n\nThe answer is a client token valid for 30 minutes with the `orders-db` policy. Nothing long-lived is stored anywhere: a stolen token dies on its own.",
      fields: {
        role: "Which manager role this workload wants. The identity must match it.",
        jwt: "Signed by the platform, valid for minutes, bound to this workload.",
        client_token: "The manager's session token for this service. Kept in memory only.",
        policies: "What this token may read: only the orders database credentials.",
        ttl: "30 minutes. The service logs in again before it expires.",
      },
    },
    dynamic: {
      short: "Dynamic",
      title: "Each service gets its own database user with a lease",
      body: "Instead of reading a stored password, the orders service asks for credentials. The manager creates a brand-new database user for it right now and returns it with a **lease** of one hour. The reports job gets a different user with read-only rights.\n\nIf these credentials leak, they open the orders tables only, and only until the lease ends. The service renews the lease while it runs; when it stops, the user is dropped.",
      fields: {
        lease_id: "The handle to renew or revoke exactly these credentials.",
        lease_duration: "Seconds until the manager drops the user: 3600 = one hour.",
        renewable: "A running service extends the lease instead of getting a new user.",
        username: "Unique per issue. The database log now says which service did what.",
      },
    },
    role: {
      short: "Role",
      title: "What the manager does in the database",
      body: "The manager holds one admin login to the database, used only to create and drop users. For each request it runs `CREATE ROLE` with an expiry in the database itself and grants only the tables that role needs.\n\nWhen the lease ends or someone revokes it, the manager drops the role. Even if the manager failed to clean up, the database refuses the login after `VALID UNTIL`.",
      watch: "The manager's admin login is now the most valuable secret: rotate it often and allow it only from the manager.",
      fields: {
        "CREATE ROLE": "A fresh user per lease, with a random password the manager never stores.",
        "VALID UNTIL": "The database itself enforces the expiry, a second lock behind the lease.",
        GRANT: "Least privilege: only the tables of this service.",
        "DROP ROLE": "End of lease: the user no longer exists.",
      },
    },
    kms: {
      short: "KMS",
      title: "Secrets at rest are encrypted, the root key stays in KMS",
      body: "The manager stores secrets in its own storage, and that storage gets backed up. So every secret is encrypted with a data key, and the data key is stored only **wrapped**: encrypted by a root key that never leaves the KMS.\n\nAt startup the manager asks the KMS to unwrap the data key once and keeps it in memory. A stolen disk or backup holds only ciphertext and a wrapped key nobody outside the KMS can open.",
      fields: {
        key_id: "The root key in the KMS. Access to it is the real control.",
        wrapped_key: "The encrypted data key. Safe to store next to the data.",
        plaintext: "The data key in clear, returned only to the manager, held only in memory.",
        key_version: "Root keys rotate too; old versions stay to unwrap old data.",
      },
    },
    rotation: {
      short: "Rotation",
      title: "Rotation without downtime: two versions overlap",
      body: "Some secrets cannot be dynamic: the partner's API key is issued by the partner. The manager rotates it every 30 days: it creates version 8 at the partner while version 7 still works, and services pick up the new version on their next read.\n\nThe manager watches when version 7 was last used. Only after nobody uses it, and the overlap window has passed, is it revoked. Downtime: zero.",
      fields: {
        "version 8": "The new key, created before the old one is touched.",
        "still valid": "The overlap window: both keys work, so no client is caught in between.",
        "last used": "Proof that every client has moved before anything is revoked.",
        revoked: "The old key dies a day later, on schedule, not in a panic.",
      },
    },
    audit: {
      short: "Audit",
      title: "Every read is logged, a wrong read is visible",
      body: "Every request to the manager writes an audit record: which workload, which path, the result and from where. Secret values never go into the log, only that they were read.\n\nToday the reports job asked for the orders read-write credentials. The policy denied it, and the record shows exactly which pod asked. An alert on denied reads turns a quiet probe into a ticket.",
      watch: "If the audit log cannot be written, the manager should refuse the request rather than serve it unlogged.",
      fields: {
        entity: "The workload identity, down to the pod. No shared users left to hide behind.",
        path: "What was asked for. Values are never logged.",
        result: "`denied`: the policy worked, and someone should look at why it was tried.",
        remote_addr: "Where the request came from, to match with the network.",
      },
    },
    breakglass: {
      short: "Break-glass",
      title: "When the manager is down: break-glass",
      body: "At 04:12 the secrets manager is down and services cannot get credentials. On-call needs database access to fix it. A sealed emergency credential sits in a separate safe that does not depend on the manager.\n\nOpening it takes two people, a reason and an incident number. The credential works for 60 minutes, everyone responsible is alerted, and it is rotated right after. Break-glass is a loud, rare door, not a second way in.",
      watch: "Test break-glass on a schedule: a door that has never been opened will not open during an incident.",
      fields: {
        "BREAK-GLASS": "A separate, logged path. Using it is an incident in itself.",
        "approved by": "Two-person rule: nobody opens it alone.",
        "valid 60 min": "Short-lived like everything else.",
        "rotated after use": "Once seen by a human, the secret is burned.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for secrets.\n\n1) No secrets in repos, images or env files; anything that was in git is leaked. 2) Services prove who they are with a workload identity, not a stored token. 3) Prefer dynamic, per-service credentials with a lease and least privilege. 4) Encrypt secrets at rest with envelope encryption, root key in a KMS. 5) Rotate with two overlapping versions and revoke only after the old one is unused. 6) Audit every read, alert on denials, and keep a tested two-person break-glass path.",
    },
  },
};

export default text;
