import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Feature flags",
  summary:
    "A shop ships a new checkout flow. When deploy and release are the same act, a bug reaches every user and the way back is a 15-minute redeploy. Feature flags separate the two: the code ships dark, a flag service decides who sees it, the SDK evaluates locally and gets changes over a stream, a kill switch turns it off in two seconds, and owners with expiry dates keep old flags from piling up.",
  learn: [
    "Why deploy is not release, and what a flag rule with segments and a percentage looks like",
    "Local evaluation from a cached snapshot plus streaming updates instead of a remote call per request",
    "Percentage rollout by a stable hash of the user id, a kill switch and a guardrail that rolls back by itself",
    "Stale flags as debt: owners, expiry dates and a CI check that fails the build",
  ],
  nodes: {
    users: "Shoppers",
    api: "Checkout API",
    db: "Orders DB",
    ci: "CI/CD",
    flags: "Flag service",
    team: "Checkout team",
    events: "Metric events",
    guard: "Guardrail",
  },
  metrics: {
    errors: "Checkout errors",
    "off-s": "Time to turn off",
    p99: "Checkout p99",
    stale: "Stale flags",
  },
  steps: {
    deploy: {
      short: "Deploy",
      title: "Deploy and release are the same moment",
      body: "The team finishes a new checkout flow and merges the PR. CI builds version `v412` and rolls it onto all 24 pods. Four minutes later every shopper is on the new flow.\n\nNobody decided to release it to 100% of users. Merging was the decision, and turning it off means deploying the previous version: about 15 minutes.",
      fields: {
        v412: "One build: the new flow and every other change of the week together.",
        "new checkout flow": "The feature itself is just part of the code.",
        "100% of traffic": "No step between nobody and everybody.",
        "release decision": "Who sees the feature is decided by a merge button.",
      },
    },
    bug: {
      short: "Bug",
      title: "A bug in the new flow hits everyone",
      body: "The new flow rounds tax differently, and some carts fail with `500`. Checkout errors jump from 0.4% to 7.2%. The fix is one line, but it needs a build, tests and a rollout. Rolling back to the old version takes the same pipeline.\n\nFor 15 minutes, 7 of every 100 shoppers cannot pay.",
      watch: "If the only way to turn a feature off is a deploy, every incident lasts at least one pipeline.",
      check: {
        q: "How can the team turn the new flow off without a deploy?",
        options: [
          "Keep both flows in the code and choose at runtime with a switch stored outside the build",
          "Deploy faster: cut the pipeline to 5 minutes",
          "Test more before merging",
        ],
        answer: 0,
        why: "A faster pipeline is still a pipeline, and tests never catch everything. If the old and the new path both ship and a runtime switch picks one, turning off is a config change that takes seconds.",
      },
      fields: {
        error: "A bug in the new code path only.",
        request_id: "To find this request in the logs.",
        version: "The whole build is bad, so the whole build has to go.",
      },
    },
    flag: {
      short: "Flag",
      title: "The code ships dark, a flag decides",
      body: "The new flow now sits behind `if (flags.on(\"new-checkout\", user))`. The code is deployed to all pods but serves the old flow by default. A **flag service** stores rules: staff get the new flow, then 5% of shoppers, everyone else the default.\n\nFor now the API asks the flag service on every checkout. Turning the feature off is one change in the flag service, effective on the next request.",
      fields: {
        enabled: "The master switch of the flag. `false` means everyone gets the default.",
        rules: "Checked top to bottom; the first match decides.",
        segment: "A named group, here the company's own staff.",
        rollout: "A share of users, split by the field in `by`.",
        default: "What anyone not matched gets. Safe by default: the old flow.",
        version: "Every change gets a number, so you can see which config an answer used.",
      },
    },
    remote: {
      short: "Remote",
      title: "A network call per request: slow and fragile",
      body: "Each checkout now waits for a call to the flag service: 46 to 51 ms, and p99 grows from 180 to 226 ms. At 3,400 checkouts a minute the flag service is at 92% load. When it stalls, calls time out and fall back to the default.\n\nThe flag service has become part of the checkout path: if it is slow, checkout is slow.",
      watch: "A flag check must never be able to take the product down.",
      check: {
        q: "How should the API evaluate flags?",
        options: [
          "Cache every answer per user for one hour",
          "Download all rules once, evaluate in memory, and get changes pushed",
          "Add more flag service replicas",
        ],
        answer: 1,
        why: "Caching answers per user still calls the service for every new user and keeps a turned-off flag on for an hour. Replicas cost money and keep the network hop. Rules are small: with a local copy, a check is a function call, and the service is only needed for changes.",
      },
      fields: {
        remote: "The check crosses the network on every request.",
        timeout: "The flag service did not answer in 200 ms.",
        "default off": "The fallback: safe, but the user silently drops out of the rollout.",
        "calls/min": "Flag load grows with checkout traffic, one to one.",
      },
    },
    sdk: {
      short: "SDK",
      title: "The SDK keeps a local copy and evaluates in memory",
      body: "The API now uses the flag **SDK**. At start it downloads a snapshot of all flags and their rules, then evaluates every check in memory: microseconds, no network. p99 is back to 181 ms. If the flag service is down, the SDK keeps working from the last snapshot.\n\nThe price: the SDK polls for a new snapshot once a minute, so turning a flag off now takes up to 60 seconds.",
      fields: {
        "If-None-Match": "Send the version you have; `304` means nothing changed and nothing is downloaded.",
        version: "The snapshot version. Every evaluation can log it.",
        flags: "All rules for this environment, a few KB.",
        poll_seconds: "How stale the local copy can get. 60 s is too long for an incident.",
      },
    },
    stream: {
      short: "Stream",
      title: "Changes are pushed over a stream",
      body: "The SDK keeps one long-lived connection to the flag service using **SSE** (server-sent events). When someone changes a flag, the service pushes an event and every pod updates its copy in about two seconds.\n\nIf the connection drops, the SDK reconnects with the id of the last event it saw and gets what it missed. Polling stays as a slow safety net.",
      fields: {
        Accept: "Asks for an event stream: one HTTP response that never ends.",
        "Last-Event-ID": "After a reconnect: send me everything after event 1841.",
        event: "What happened: a flag changed.",
        data: "The changed flag and its new version; the SDK swaps it in.",
        "keep-alive": "A comment line every few seconds so proxies do not close an idle connection.",
      },
    },
    rollout: {
      short: "Rollout",
      title: "Percentage rollout by a stable hash",
      body: "The rollout grows from 5% to 25%. The SDK does not roll dice per request: it hashes the flag's salt plus the user id into a **bucket** from 0 to 9999. Buckets below 2500 get the new flow.\n\nThe same user lands in the same bucket on every pod and every day, so nobody flips between flows mid-purchase. Raising 25% to 50% only adds users; everyone already in stays in.",
      watch: "Hash by the id that the experience belongs to: user id for a logged-in flow, not request id or pod.",
      fields: {
        bucket: "The user's fixed place on a 0..9999 line for this flag.",
        hash: "Salt per flag, so one user is not first in line for every rollout.",
        rollout: "The rule: buckets below 2500, that is 25%.",
        "no network call": "Evaluated in memory from the local snapshot.",
      },
    },
    kill: {
      short: "Kill switch",
      title: "An incident: the kill switch, not a rollback",
      body: "At 25%, card declines in the new flow jump: checkout errors reach 4.8% among those users. On-call does not touch the pipeline. They set `enabled: false` with the incident number as the reason.\n\nThe stream delivers it to all 24 pods in 1.8 seconds, and everyone is back on the old flow. The bad code is still deployed, but nobody runs it.",
      watch: "The kill switch must work when everything else is broken: test it, and keep its permission with on-call.",
      fields: {
        enabled: "Off for everyone, whatever the rules say.",
        reason: "Every change is audited: who, when and why.",
        streamed_to: "How many SDK connections received the change.",
        took_ms: "From the click to the last pod: under 2 seconds instead of 15 minutes.",
      },
    },
    guardrail: {
      short: "Guardrail",
      title: "A guardrail turns the flag off by itself",
      body: "Every checkout emits an event with the flag value it got. A guardrail job compares the users with the flag on against those with it off over a 10-minute window. Each metric has a limit: error rate at most +1 point, p99 at most +30 ms.\n\nAt 50% the new flow had 3.9% errors against 0.4%. The guardrail disabled the flag and paged the team. Nobody had to be watching the dashboard.",
      fields: {
        GUARDRAIL: "An automatic check that runs during every rollout.",
        checkout_error_rate: "Compared between the two groups at the same time, so traffic swings cancel out.",
        limit: "The allowed difference. Agreed before the rollout, not during an incident.",
        "disabled automatically": "The guardrail uses the same kill switch a human would.",
      },
    },
    stale: {
      short: "Stale flags",
      title: "Old flags pile up into debt",
      body: "A year later there are 142 flags, and 61 of them are stale. Some have been at 100% for weeks, some at 0% for months with an owner who has left, some are still in config after the code was removed.\n\nEach flag is a branch in the code. Two flags give four combinations to test, ten give a thousand. Nobody dares delete an old one, because nobody knows who depends on it.",
      check: {
        q: "What keeps release flags from piling up?",
        options: [
          "A cleanup sprint every quarter",
          "Every flag has an owner and an expiry date, and CI fails when code uses an expired flag",
          "Delete any flag not changed for 30 days",
        ],
        answer: 1,
        why: "Cleanup sprints get skipped. Deleting by age breaks long-lived kill switches and permission flags. An owner and an expiry set at creation make removal part of the plan, and CI makes the debt visible in the owner's own build.",
      },
      fields: {
        stale: "Unchanged for a long time and fully on or fully off.",
        "100% on": "Done rolling out: the old branch is dead code now.",
        "owner left": "Nobody can say whether it is safe to remove.",
        "removed in code": "A flag in config with no code: harmless, but noise.",
      },
    },
    expiry: {
      short: "Expiry",
      title: "Every flag has an owner and an expiry date",
      body: "Creating a flag now requires an owner and an expiry date. A CI step finds every flag used in the code and fails the build of the owning team when one has expired: remove the old branch, or extend the date with a reason.\n\nKill switches and operational flags are marked permanent and are reviewed instead. Stale flags dropped from 61 to 4.",
      fields: {
        FAIL: "The owner's build is red until they act.",
        expired: "The date set when the flag was created.",
        owner: "A team, not a person, so it survives people leaving.",
        "extend with a reason": "Keeping a flag longer is allowed, but it is a visible decision.",
        permanent: "Kill switches and ops flags are meant to stay, with an owner.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for feature flags.\n\n1) Deploy is not release: ship code dark and decide who sees it in a flag. 2) Evaluate in memory from an SDK snapshot; never a network call per request, and keep working when the flag service is down. 3) Push changes over a stream so turning off takes seconds. 4) Roll out by a stable hash of the user id so users do not flip and percentages only add people. 5) Keep a tested kill switch and guardrails that roll back on metrics by themselves. 6) Every flag has an owner and an expiry, and CI enforces it.",
    },
  },
};

export default text;
