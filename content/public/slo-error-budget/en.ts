import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "SLOs and error budgets",
  summary:
    "A taxi app's booking API serves about 100 requests a second. The health check says 100% while riders see errors. How to measure reliability the way users feel it, agree on a target, turn the gap into an error budget, and page people only when that budget is really burning.",
  learn: [
    "SLI, SLO and SLA: what is measured, what is the target, what is promised",
    "Error budget math: 99.9% over 30 days is about 43 minutes or 259 200 failed requests",
    "Burn rate and multiwindow alerts that page fast and stay quiet on blips",
    "Release freezes when the budget is spent, and latency SLOs by percentile",
  ],
  nodes: {
    riders: "Riders",
    lb: "Load balancer",
    api: "Booking API",
    db: "Trips DB",
    monitor: "Monitoring",
    pager: "On-call",
    pipeline: "Release pipeline",
  },
  metrics: {
    sli: "Good requests",
    budget: "Budget left",
    burn: "Burn rate",
    p99: "Booking p99",
  },
  steps: {
    uptime: {
      short: "Uptime",
      title: "The health check is green, riders see errors",
      body: "Monitoring calls `/healthz` on the booking API every 10 seconds. The process is alive, so it always answers `200`, and the dashboard shows 100% uptime.\n\nMeanwhile the trips database is overloaded and one booking in seventy fails. Riders tap the button again or open a rival app. Nothing on the dashboard turned red.",
      watch: "A server being up is not the same as users being served. Measure what users get, not whether a process answers.",
      fields: {
        healthz: "A cheap internal endpoint. It does not touch the database or the booking path.",
        "200": "The process is alive. It says nothing about the bookings that failed.",
        uptime: "Counted from health checks, so it hides every error a real rider saw.",
      },
    },
    sli: {
      short: "SLI",
      title: "SLI: count good requests where users meet you",
      body: "The team takes the number from the load balancer's log instead: every real booking request, and whether it was good. A request is good if it did not return a `5xx` and finished within 2 seconds.\n\nThis ratio is the **SLI**, the service level indicator. For that minute it is 98.5%, the number the health check was hiding.",
      watch: "Measure as close to the user as you can. The load balancer sees timeouts and crashed pods that the service itself never logs.",
      fields: {
        requests: "Valid booking requests in the minute: the denominator.",
        status_5xx: "Our fault: these count as bad.",
        status_4xx: "The client's fault (a bad card, a wrong address). Not counted against the service.",
        SLI: "Good divided by valid. The one number that says how riders were served.",
      },
    },
    slo: {
      short: "SLO",
      title: "SLO: a target, and the budget it leaves",
      body: "The team agrees on an **SLO**: 99.9% of booking requests are good over a rolling 30 days. Not 100%: no system reaches it, and chasing it would stop all change.\n\nThe remaining 0.1% is the **error budget**: about 259 000 failed requests or 43 minutes of full outage a month. While budget is left, the team may take risks and ship. 20% of it is already spent this month.",
      watch: "The budget turns reliability from an argument into a number both product and on-call can read.",
      check: {
        q: "The team wants 99.99% instead of 99.9%. How much full outage does the budget allow per 30 days?",
        options: ["About 4.3 minutes", "About 43 minutes", "About 26 seconds"],
        answer: 0,
        why: "30 days are 43 200 minutes. 0.1% of that is 43.2 minutes, and 0.01% is ten times less: 4.3 minutes. Each extra nine cuts the budget tenfold.",
      },
      fields: {
        objective: "The target share of good requests. Chosen by what riders tolerate, not by what is possible.",
        rolling: "The window moves every day, so a bad day is forgotten 30 days later.",
        error_budget: "The 0.1% that may fail. It is spent by outages and by risky releases.",
        "43 minutes": "The same budget in time: 0.1% of 43 200 minutes.",
      },
    },
    sla: {
      short: "SLA",
      title: "SLA: the promise with money attached",
      body: "Corporate clients get an **SLA**, a contract: 99.5% per month, or the taxi company pays back part of the bill.\n\nThe SLA is deliberately looser than the internal SLO. The team gets paged at 99.9%, long before money is at stake. If the SLO and the SLA were equal, the first warning would arrive together with the refund.",
      fields: {
        availability: "What the contract promises. Measured the same way as the SLI.",
        credit: "The penalty. This is what turns an SLA into money.",
        "internal SLO": "Stricter than the contract, so there is room to react before breaking it.",
      },
    },
    "bad-deploy": {
      short: "Bad release",
      title: "A release burns the budget fifty times too fast",
      body: "Release v412 adds a fare cache. One pod in twenty hangs on it, and 5% of bookings fail. The SLO allows 0.1%.\n\nThe **burn rate** says how fast the budget goes: 5 / 0.1 = 50. At 50x the budget meant for 30 days is gone in 14.4 hours.",
      watch: "Burn rate 1 means the budget runs out exactly at the end of the window. Anything above 1, sustained, breaks the SLO.",
      fields: {
        v412: "The release that brought the bug. The pipeline knows when it went out.",
        "error rate": "The share of bad requests right now.",
        burn_rate: "Error rate divided by the allowed rate. 50 means fifty times faster than planned.",
        "14.4 hours": "How long the whole month's budget lasts at this pace.",
      },
    },
    "naive-alert": {
      short: "Naive alerts",
      title: "Two naive alerts: too noisy and too late",
      body: "Rule A pages when the error rate is over 0.1% for 5 minutes. Last week it fired 31 times, and 29 of them healed by themselves within minutes. People started to ignore it.\n\nRule B pages when less than 10% of the budget is left. For v412 it fired 10 hours after the release, when 70% of the month's budget was already gone.",
      fields: {
        "rule A": "Short window, low threshold. Every blip wakes someone up.",
        "31 times": "Pages that needed no action teach people to ignore the pager.",
        "rule B": "A budget threshold. Correct, but it only says the damage is done.",
        "10 hours": "The time it took to notice. The rollback took 5 minutes.",
      },
    },
    "burn-rate": {
      short: "Burn alerts",
      title: "Burn-rate alerts with two windows",
      body: "The page now fires when the burn rate is above 14.4 over the last hour and also over the last 5 minutes. 14.4x for an hour spends 2% of the monthly budget: worth waking someone. A slower rule, 6x over 6 hours, opens a ticket instead.\n\nThe long window ignores blips; the short one makes the alert stop as soon as the problem is fixed. Replaying v412: page at 17 minutes, rollback at 25, 3% of the budget spent instead of 70%.",
      watch: "Page on fast burns that threaten the SLO, ticket on slow ones. Both windows must agree before anyone is woken up.",
      check: {
        q: "v412 burned at 50x for 40 minutes and was rolled back 10 minutes ago. The 1-hour burn is still above 14.4. Does the page fire now?",
        options: [
          "Yes: the 1-hour window is over the line",
          "No: the 5-minute window is already calm",
          "Only once the budget reaches zero",
        ],
        answer: 1,
        why: "Both windows must be over the line. The last 5 minutes are clean after the rollback, so the alert resolves itself instead of paging someone for a problem that is already gone.",
      },
      fields: {
        "burn_rate(1h)": "The long window: proof that it is not a blip.",
        "burn_rate(5m)": "The short window: proof that it is still happening.",
        "2%": "What one hour at 14.4x costs. 14.4 = 2% x 720 hours.",
        ticket: "A slow burn does not need anyone at 3 a.m., but must be looked at this week.",
        "+17 min": "When the page fired in the replay, instead of 10 hours.",
      },
    },
    freeze: {
      short: "Freeze",
      title: "Budget spent: releases stop",
      body: "Later in the month a database migration and a provider outage overspend the budget: 12% over. The policy agreed in advance applies: the pipeline asks the SLO service before every deploy, and feature releases are blocked.\n\nOnly reliability and security fixes go out until the rolling window recovers. Nobody has to argue whether to slow down: the number decides.",
      watch: "The freeze only works if product and engineering signed the policy before the incident, not during it.",
      fields: {
        budget_left_percent: "Below zero: the SLO for the window is already broken.",
        policy: "What the team agreed to do in this state.",
        allowed: "The only kinds of change that may ship.",
        until: "The freeze ends by itself when old failures leave the 30-day window.",
      },
    },
    latency: {
      short: "Latency SLO",
      title: "A latency SLO is a percentile, not an average",
      body: "Success is not only \"no error\". A booking that takes 4 seconds feels broken too. The team adds a latency SLO: 99% of bookings faster than 300 ms.\n\nThe histogram is read by percentile. The average is a comfortable 120 ms, but the slow tail is where riders give up.",
      check: {
        q: "Average 120 ms, p99 900 ms, 98.2% of requests under 300 ms. Is \"99% under 300 ms\" met?",
        options: [
          "Yes: the average is well under 300 ms",
          "Yes: only about 1% of requests are slow",
          "No: fewer than 99% finish under 300 ms",
        ],
        answer: 2,
        why: "Only 98.2% finish under 300 ms, so 1.8% are slow: almost twice what the SLO allows. The average says nothing about the tail.",
      },
      fields: {
        "le=300ms": "Share of requests at or below 300 ms. This line is the SLI.",
        avg: "Looks fine and hides the slow tail.",
        p99: "One request in a hundred is slower than 900 ms.",
        "latency SLO": "Written as a share under a threshold, so it gets an error budget like errors do.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for SLOs.\n\n1) Measure the SLI where users meet you: good requests over valid ones, at the load balancer. 2) Pick an SLO below 100%; the rest is the error budget (99.9% over 30 days is about 43 minutes). 3) Keep the SLA looser than the SLO. 4) Alert on burn rate with a long and a short window: page on fast burns, ticket on slow ones. 5) Agree in advance that a spent budget freezes feature releases. 6) Write latency SLOs as percentiles, never averages.",
    },
  },
};

export default text;
