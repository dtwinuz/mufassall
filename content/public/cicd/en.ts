import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "CI/CD: from commit to production",
  summary:
    "A team deploys once a week, by hand, and every third deploy breaks something. Step by step the path from commit to production becomes automatic, small and reversible, and the team ends up deploying a dozen times a day.",
  learn: [
    "CI builds and tests every commit once and produces one immutable artifact",
    "Rolling, blue-green and canary deploys: what each costs and how fast each rolls back",
    "Automatic rollback on error rate, and feature flags that separate deploy from release",
    "Four delivery numbers: deploys per day, lead time, change failure rate, time to restore",
  ],
  nodes: {
    dev: "Developer",
    users: "Users",
    lb: "Load balancer",
    blue: "Blue servers",
    green: "Green servers",
    ci: "CI/CD",
    registry: "Artifact registry",
    flags: "Feature flags",
  },
  metrics: {
    deploys: "Deploys",
    failed: "Failed deploys",
    mttr: "Time to restore",
    errors: "Error rate",
  },
  steps: {
    manual: {
      short: "By hand",
      title: "Friday deploy, by hand, to six servers",
      body: "Once a week a developer copies a zip to each of six servers over SSH and restarts the app. The new version needs a setting nobody added to the servers.\n\nThe app exits on start, server after server, and users get errors. Rolling back means doing the same by hand with the old zip. It takes an hour and a half.",
      watch: "A deploy that is rare and manual is big and risky, which makes people do it even more rarely.",
      fields: {
        scp: "A file copied by hand. Nobody can say later which build is on which server.",
        restart: "All users of this server are cut off during the restart.",
        "missing env": "The new code needs a setting that exists only on the developer's laptop.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: every commit builds and tests once",
      body: "Every push now starts a pipeline: build, run the tests, package the result as an image tagged with the commit and put it in a registry.\n\nThat image is the only thing that ever gets deployed: to staging, then the same bytes to production. No more building on a laptop, and no \"works on my machine\".",
      fields: {
        commit: "The exact source the image is built from. Every deploy points back to one commit.",
        build: "Built on a clean runner, the same way every time.",
        test: "If a test fails, the pipeline stops here and nothing is published.",
        image: "The artifact, tagged with the commit. It never changes after this point.",
        digest: "A hash of the image content. Deploys refer to it, so nobody can swap the bytes.",
      },
    },
    rolling: {
      short: "Rolling",
      title: "Rolling deploy: one server at a time",
      body: "CI replaces servers one by one. Each new server must answer its health check before the load balancer sends it traffic and before the next old server is stopped.\n\nNo downtime, and no extra servers needed. During the rollout the old and the new version serve users at the same time, so both must work with the same database and APIs.",
      check: {
        q: "The next build breaks one checkout path, but `/healthz` still says ok. How does the rollout go?",
        options: [
          "It stops at the first server: the health check blocks it",
          "Checkout requests go only to old servers until it is fixed",
          "It reaches all six servers; rollback takes 25 minutes",
        ],
        answer: 2,
        why: "The health check only proves the process is up, so every server passes and gets traffic. 12% of requests fail, and rolling the old version back through six servers takes 25 minutes.",
      },
      fields: {
        healthz: "The endpoint the load balancer calls every few seconds.",
        status: "`ok` means the process is up. It does not mean checkout works.",
        version: "Which build this server runs. Useful when two versions are live at once.",
      },
    },
    "bad-roll": {
      short: "Bad roll",
      title: "Health checks pass, checkout fails",
      body: "The rollout finished: all six servers run the new version. The health check is green everywhere, but one payment path throws errors, and 12% of requests fail.\n\nTo roll back, CI has to roll the old version through all six servers again. That takes 25 minutes, and users see errors the whole time.",
      watch: "A health check that only checks the process is alive will pass a broken release.",
      fields: {
        checkout: "The path with the bug. The health check never calls it.",
        "500": "The server crashed on this request. Users see an error page.",
        "X-Version": "Every response says which build answered. That is how the bad release was found.",
      },
    },
    "blue-green": {
      short: "Blue-green",
      title: "Blue-green: keep the old version warm",
      body: "Now there are two full sets of servers. The new version goes to the idle set and is checked there; then the load balancer moves all traffic in one step.\n\nThe old set stays running. Rollback is the same switch back, in under a second. The cost: twice the servers, and the switch is all at once, so a bug still reaches every user until someone notices.",
      fields: {
        live: "The set that gets all user traffic now.",
        standby: "The set with the broken release. Still running, ready to inspect or fix.",
        switched_in_ms: "The switch is a routing change, not a deploy. Under half a second.",
      },
    },
    canary: {
      short: "Canary",
      title: "Canary: 5% of users first",
      body: "The next release goes to green, but the load balancer sends it only 5% of requests. CI compares the two sets' error rates over the last three minutes.\n\nGreen fails at 4.1% against 0.3% on blue. A new bug, but only one user in twenty sees it, and only for a few minutes.",
      check: {
        q: "At 3 a.m. green fails at 4.1% against 0.3% on blue. What happens next?",
        options: [
          "A rule in the pipeline sets green's weight to zero",
          "Green keeps its 5% until the on-call engineer wakes up",
          "CI rolls the old version through all six servers again",
        ],
        answer: 0,
        why: "The rule is written in the pipeline: canary errors above twice the stable rate for three minutes set its weight to zero and mark the release bad. Nobody has to be awake, and all traffic goes back to blue.",
      },
      fields: {
        weight: "Share of traffic in percent. Blue keeps 95.",
        error_rate: "Errors in percent over the window. The two sets are compared side by side.",
        release: "The build on the canary. This is the one under suspicion.",
      },
    },
    "auto-rollback": {
      short: "Auto rollback",
      title: "Rollback by a rule, not by a person",
      body: "The rule is written down in the pipeline: if the canary's error rate is more than twice the stable one for three minutes, set its weight to zero and mark the release bad.\n\nNobody has to be awake. The team gets a message with the numbers, and the bad build cannot be deployed again by mistake.",
      fields: {
        weight: "Zero: green gets no traffic. Everything goes to blue.",
        reason: "The exact rule and numbers. The person who opens the alert sees why.",
        marked: "A release marked bad is blocked from any later deploy.",
      },
    },
    flags: {
      short: "Flags",
      title: "Feature flags: deploy is not release",
      body: "The new checkout now ships switched off behind a flag. The code goes to production with the rest, but runs only for staff, then for 10% of users.\n\nIf it misbehaves, the flag goes off in a second, with no deploy and no rollback of anything else. Deploys become small and boring, and the team ships more often.",
      watch: "Remove a flag once it is at 100%. Old flags are dead code with a switch on it.",
      fields: {
        enabled: "For this user, the old checkout is shown.",
        rollout: "Share of users who see the new code. Raised step by step.",
        rule: "Who gets it first. Staff find bugs before customers do.",
      },
    },
    numbers: {
      short: "Numbers",
      title: "Four numbers to track",
      body: "The team now follows four numbers. Two show speed: how often it deploys and how long a commit takes to reach production. Two show safety: how many deploys hurt users and how fast service comes back.\n\nThey move together. Small deploys fail less, and an automatic rollback makes failures short.",
      fields: {
        "deploys per day": "Was one a week. Small changes go out as soon as they are ready.",
        "lead time": "From merge to running in production. Was about a week.",
        "change failure": "Deploys that needed a rollback or a fix. Was every third one.",
        "time to restore": "From the first error to normal service. Was an hour and a half.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Make each deploy small, automatic and easy to undo.\n\n1) CI builds and tests every commit once and publishes one immutable artifact. 2) Rolling needs no extra servers, but rolls back slowly. 3) Blue-green rolls back in a second, at the cost of double capacity. 4) Canary limits a bad release to a few percent, and a rule rolls it back by itself. 5) Feature flags turn code on and off without a deploy. 6) Track deploys per day, lead time, change failure rate and time to restore.",
    },
  },
};

export default text;
