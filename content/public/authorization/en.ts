import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Authorization",
  summary:
    "Knowing who the caller is does not tell you what they may do. An invoicing app shared by many companies learns this the hard way: changed ids in the URL, forgotten checks, and a service account that could do anything.",
  learn: [
    "Authentication vs authorization, and why a valid token is not permission",
    "Ownership checks on every request and the IDOR bug",
    "RBAC vs ABAC, with one policy in one place",
    "Least privilege for service accounts",
  ],
  nodes: {
    alice: "Alice (company c_7)",
    web: "Web app",
    api: "Invoice API",
    db: "Invoices DB",
    bob: "Bob (company c_9)",
    policy: "Policy service",
    reports: "Report job",
    files: "Export files",
  },
  metrics: {
    leaks: "Foreign records read",
    p95: "API p95",
    perms: "Job permissions",
  },
  steps: {
    "logged-in": {
      short: "Logged in",
      title: "A valid token, and that is all",
      body: "Alice from company `c_7` opens invoice `inv_1042`. The API checks that her token is valid and signed, then loads the invoice by id.\n\nThat is **authentication**: it answers \"who is this?\". Nobody has yet asked \"may this person see this invoice?\", which is **authorization**.",
      check: {
        q: "Bob from company `c_9` is logged in and changes `1042` to `1043` in the URL. What does he get?",
        options: [
          "Invoice `inv_1043` of company `c_7`",
          "`403 Forbidden`: the invoice is not his",
          "`401`: his token covers only his data",
        ],
        answer: 0,
        why: "The API checks only that the token is valid, then loads the invoice by id. Nobody compares the company, so Bob reads another company's invoice: the IDOR bug.",
      },
      fields: {
        Authorization: "Alice's access token. It proves who she is, nothing more. Hidden here.",
        company_id: "The invoice belongs to company `c_7`. The API never compared this to Alice's company.",
      },
    },
    idor: {
      short: "IDOR",
      title: "Change the id in the URL, get someone else's invoice",
      body: "Bob works at another company, `c_9`. He is logged in too. He changes `1042` to `1043` in the address bar and gets an invoice of company `c_7`.\n\nThe bug has a name: **IDOR**, insecure direct object reference. Ids are easy to guess, and a script walks through all of them: 140 foreign invoices a day.",
      watch: "Random ids make guessing harder but are not a check. The server must decide on every request.",
      check: {
        q: "The API now loads invoices only with the company from the token. What does Bob get for `1043`?",
        options: [
          "`403 Forbidden`: it belongs to another company",
          "The invoice, with the amount field hidden",
          "`404 Not Found`, as if it did not exist",
        ],
        answer: 2,
        why: "The query adds `company_id = 'c_9'` from Bob's token and finds 0 rows. The API answers `404`, so Bob does not even learn that invoice `1043` exists.",
      },
      fields: {
        inv_1043: "An id Bob simply guessed: the next number.",
        Authorization: "Bob's valid token. The API was satisfied with that alone.",
        company_id: "Not Bob's company. The response should never have been sent.",
      },
    },
    ownership: {
      short: "Ownership",
      title: "Check ownership in the query itself",
      body: "The API now loads an invoice only together with the caller's company, taken from the token, never from the URL. A foreign id simply finds nothing.\n\nThe API answers `404`, not `403`: Bob does not even learn that invoice `1043` exists.",
      fields: {
        company_id: "From Bob's token: `c_9`. The URL cannot change it.",
        "0 rows": "Invoice `1043` exists, but not for company `c_9`.",
        "404": "\"Not found\" rather than \"forbidden\", so ids cannot be probed.",
      },
    },
    roles: {
      short: "Roles",
      title: "RBAC: what each role may do",
      body: "Inside a company not everyone may approve invoices. Users get roles: `viewer`, `accountant`, `admin`. Each role is a list of permissions such as `invoice:approve`.\n\nAlice is a viewer. She can read, but her approve request gets `403`. Code checks permissions, never role names, so roles can change without touching code.",
      fields: {
        "403": "Alice is known and the invoice is hers to see, but this action is not allowed.",
        need: "The permission this endpoint requires.",
        roles: "What Alice has. `viewer` does not include `invoice:approve`.",
      },
    },
    scattered: {
      short: "Scattered",
      title: "Forty endpoints, one forgotten check",
      body: "The ownership check is copied into every endpoint by hand. A new export endpoint shipped without it and takes the company from the query string.\n\nBob passes `c_7` and downloads every invoice of that company as CSV. One missing line, 30 leaks a day.",
      watch: "A check that each endpoint must remember will be forgotten. The safe default must be \"deny\".",
      fields: {
        export: "A new endpoint, written in a hurry.",
        company_id: "Taken from the URL instead of the token. Anyone can type any company.",
      },
    },
    policy: {
      short: "Policy",
      title: "One policy, asked from one place",
      body: "All rules move to one policy: given a subject, an action and a resource, answer allow or deny. Every endpoint asks it, through shared middleware, and anything not explicitly allowed is denied.\n\nRules now live and are tested in one place. The export leak is closed, at the cost of a few milliseconds per request.",
      watch: "The policy service is now on the path of every request. Cache decisions briefly or run it as a library next to the API.",
      fields: {
        subject: "Who asks: id, company and roles, from the token.",
        action: "What they want to do.",
        resource: "What they want to do it to, with the attributes the rules need.",
        allow: "Deny. Even an admin of `c_9` gets nothing from `c_7`.",
        reason: "Logged for audits and debugging; never shown in full to the caller.",
      },
    },
    abac: {
      short: "ABAC",
      title: "ABAC: rules about attributes, not just roles",
      body: "New rules: an accountant may approve invoices only up to 50 million, never one they created, and only during work hours. Roles alone cannot say that.\n\n**ABAC** decides on attributes of the subject, the resource and the context. RBAC still covers the simple part; ABAC rules add the conditions.",
      fields: {
        roles: "Alice is now an accountant: the role allows approving in general.",
        amount: "72 million, above the 50 million limit.",
        created_by: "Alice created this invoice herself. Four-eyes rule: someone else must approve.",
        context: "Time of the request. Some rules depend on when, not who.",
        reason: "The first rule that denied.",
      },
    },
    "service-account": {
      short: "Service account",
      title: "A report job with the keys to everything",
      body: "A nightly job builds export files. It connects to the database as `app_owner`, the same account that runs migrations: 412 permissions, including delete on every table.\n\nA typo in a cleanup query hit `invoices` instead of the temp table and deleted 18240 rows. The database had to be restored from backup.",
      watch: "Service accounts are users too. A bug or a leaked key can do exactly what the account is allowed to do.",
      fields: {
        app_owner: "The owner of the whole schema. A report job never needs this.",
        invoices_export_tmp: "The table the query was meant for.",
        "DELETE 18240": "The database did what the account was allowed to do.",
      },
    },
    "least-privilege": {
      short: "Least privilege",
      title: "Least privilege: only what the job needs",
      body: "The job gets its own role, `reports_ro`: read invoices, write only to its temp table, and put files only under its own folder in storage. Three permissions instead of 412.\n\nThe same typo now fails with an error instead of deleting data. Credentials are short-lived and issued per run, so a leaked one expires quickly.",
      fields: {
        reports_ro: "A role made for this one job.",
        "permission denied": "The bug is still there, but it can do no harm.",
        "GRANT SELECT": "Read only. Deleting is not in the list, so it is not possible.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Four rules for authorization.\n\n1) A valid token is identity, not permission. 2) Check ownership on every request, with the tenant from the token, and answer `404` for foreign ids. 3) Keep one policy in one place, deny by default: RBAC for roles, ABAC for conditions. 4) Give every service account its own role with only the permissions it needs.",
    },
  },
};

export default text;
