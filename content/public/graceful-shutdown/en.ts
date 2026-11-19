import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Graceful shutdown",
  summary:
    "A checkout API runs 6 pods behind a load balancer, serves 1 200 requests a second, keeps websockets open and runs background jobs in the same process. It deploys three times a day, and every deploy stops 6 processes that are in the middle of work. The lesson follows one old pod out: the signal, readiness going false first, the balancer that keeps sending for seconds, a drain with a deadline inside the grace period, long-lived connections, jobs, and on the way in, readiness after warm-up and a liveness probe that must not check dependencies.",
  learn: [
    "What happens to in-flight requests during a deploy: SIGTERM, endpoint removal running in parallel, the grace period and SIGKILL",
    "The order of a clean exit: readiness false, wait for the balancers, stop accepting, drain with a deadline, close pools last, flush",
    "Long-lived connections and background jobs: reconnect with jitter, finish or return the job, idempotent handlers",
    "Startup, readiness and liveness probes, and why a liveness probe that checks a dependency turns a blip into a restart loop",
  ],
  nodes: {
    web: "Users",
    lb: "Load balancer",
    old: "Pod v41 (old)",
    new: "Pod v42 (new)",
    db: "Database",
    queue: "Job queue",
    orch: "Orchestrator",
  },
  metrics: {
    err: "Failed requests",
    p99: "Request p99",
    cut: "Requests cut per pod",
    reconn: "Websocket reconnects",
    jobcut: "Jobs cut per deploy",
    restarts: "Pod restarts",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "What a deploy does to a running pod",
      body: "The checkout API runs on 6 pods, 200 requests a second each, plus about 1 900 open websockets and a job worker per pod. A rolling deploy starts a new pod, waits until it is ready, and then terminates an old one.\n\nTermination starts two things **at the same time**: the pod is removed from the list of endpoints, which every balancer learns about on its own schedule within 1-10 s, and the process gets **SIGTERM**. If it still runs when the grace period ends, it gets SIGKILL, which cannot be caught.",
      watch: "Nothing waits for the balancers to catch up. That gap is where most deploy errors come from.",
      fields: {
        Ready: "The new pod passed its readiness check and gets traffic.",
        Terminating: "The old pod is on its way out; the grace period clock starts now.",
        "in parallel": "Endpoint removal and SIGTERM are not ordered. Traffic may still arrive after SIGTERM.",
        "1-10 s": "How long it takes until every balancer stops sending to this pod.",
        SIGTERM: "A polite request to stop. The app can catch it and finish its work.",
        SIGKILL: "The process is killed on the spot. Nothing runs after it.",
      },
    },
    sigkill: {
      short: "SIGKILL",
      title: "The signal never reaches the app",
      body: "The container starts the app through a shell, so PID 1 is `/bin/sh`, not the app. The shell has no SIGTERM handler and does not pass the signal on. The app does not know it should stop, keeps working for 40 s, and then everything dies at once with SIGKILL.\n\n23 requests in flight are cut and the balancer answers 502. 1 900 websockets drop in the same millisecond and all reconnect at once. A job that was half done is never acknowledged. And every pod takes the full 40 s to leave, so the deploy is slow as well as noisy.",
      check: {
        q: "Why did the app keep running for the whole grace period?",
        options: [
          "The app was busy and needed 40 s to finish its requests",
          "SIGTERM went to the shell as PID 1, which neither handles nor forwards it, so the app never got it",
          "The orchestrator sends SIGTERM only after the grace period",
        ],
        answer: 1,
        why: "Only PID 1 of the container gets the signal. Start the app directly (exec form) or under a small init process that forwards signals, and make sure the app has a SIGTERM handler.",
      },
      fields: {
        PID: "Process ids inside the container. PID 1 gets the signal.",
        "/bin/sh -c": "A shell started the app and became PID 1.",
        "not forwarded": "The shell ignores SIGTERM; the app never hears it.",
        "137": "128 + 9: killed by SIGKILL.",
        "502": "The balancer lost the connection mid-request and answers with an error.",
        "1 900": "Every websocket drops at once, so every client reconnects at once.",
        "no ack": "The queue never learns the job ended; it will hand it out again later.",
      },
    },
    handler: {
      short: "Handler",
      title: "The app hears SIGTERM and says it is leaving",
      body: "The app now runs as PID 1 (exec form) and has a SIGTERM handler. The first thing it does is flip its **readiness** to false: `/readyz` answers 503 with `draining`. That tells every balancer that health-checks the pod to stop sending new requests.\n\nIt does not stop serving. Requests that still arrive are handled as usual, and the 17 in flight continue. Readiness is a request to be taken out of rotation, not a shutdown.",
      fields: {
        "/readyz": "The endpoint balancers call to decide whether to send traffic here.",
        status: "`draining`: alive, finishing work, please send nothing new.",
        in_flight: "Requests still being served right now.",
        accepting: "Still true: new connections are accepted until the balancers have caught up.",
      },
    },
    "lb-lag": {
      short: "Lag",
      title: "The balancer keeps sending for 9 seconds",
      body: "A first version of the handler flipped readiness and closed the listening socket right away. The balancer did not know yet: it checks every 2 s and needs 2 failures, and the endpoint update arrived after 9.2 s.\n\nFor those 9.2 s every request sent to this pod hit a closed port: connection refused, 502 for the user. 200 requests a second, 1 840 errors from one pod, about 11 000 per deploy.",
      check: {
        q: "Readiness is already false. Why do requests keep coming?",
        options: [
          "The balancer ignores readiness",
          "Readiness and endpoint updates are polled and propagated: each balancer learns about it seconds later, on its own schedule",
          "Clients cache the pod's IP address",
        ],
        answer: 1,
        why: "Nothing is pushed instantly to every balancer. Health checks run on an interval with a failure threshold, and endpoint lists propagate asynchronously. The pod must keep serving until the slowest one has caught up.",
      },
      fields: {
        "listener closed": "The mistake: the port closes while traffic is still being routed here.",
        "Connection refused": "Nothing listens on the port any more; the balancer turns it into 502.",
        "health check": "Every 2 s, 2 failures needed: up to 6 s before the balancer gives up on its own.",
        "endpoint update": "The orchestrator's list finally reaches this balancer.",
        "1 840 errors": "Rate times the lag, from a single pod.",
      },
    },
    wait: {
      short: "Wait",
      title: "Keep serving while the balancers catch up",
      body: "The fix is to wait before stopping: after SIGTERM the app stays ready-false but keeps accepting for **10 s**, longer than the slowest balancer needs. Only then does it stop accepting and drain.\n\nEverything has to fit into the grace period, which starts at Terminating: 10 s of waiting, at most 25 s of draining, a few seconds to spare, SIGKILL at 40 s. When the app cannot be changed, a `preStop` hook that sleeps 10 s does the same wait before SIGTERM is sent, but it is counted in the same 40 s.",
      watch: "Set the drain deadline below the grace period minus the wait, or SIGKILL arrives in the middle of the drain.",
      fields: {
        terminationGracePeriodSeconds: "The whole budget, from Terminating to SIGKILL.",
        "keep accepting": "Ready is false, but the port stays open.",
        "0-10 s": "The window in which balancers still send traffic.",
        "stop accepting": "No new connections from now on.",
        "drain deadline": "A hard limit: whatever is still running is cut so the exit stays in budget.",
        SIGKILL: "The last resort, 5 s after the drain deadline.",
        preStop: "A hook that runs before SIGTERM. Its sleep counts against the grace period.",
      },
    },
    drain: {
      short: "Drain",
      title: "Stop accepting, finish what is in flight, then exit",
      body: "At 10 s the app closes its listener and closes keep-alive connections that are idle. Responses to requests still in flight carry `Connection: close`, so clients do not send a next request on a connection that is about to go away.\n\nThe last of the 17 requests ends after 1.3 s. Only then is the database pool closed: closing it first would fail the requests still using it. Logs and metrics are flushed, so the last seconds of the pod are not lost, and the process exits with 0.",
      check: {
        q: "Why is the database pool closed after the last request and not at SIGTERM?",
        options: [
          "It does not matter, the pool closes itself on exit",
          "Requests in flight still need it: closing it first turns the drain into a burst of database errors",
          "Closing a pool takes several seconds",
        ],
        answer: 1,
        why: "Shut down in the reverse order of the dependencies: first stop new work, then let current work finish, then close what that work used, and last flush what describes it.",
      },
      fields: {
        "stop accepting": "The listening socket closes; the balancers no longer send here anyway.",
        "Connection: close": "Tells keep-alive clients not to reuse this connection.",
        "in flight 0": "Every request that had started has finished.",
        "db pool closed": "Closed last, after nothing can use it.",
        flushed: "Buffered logs and metrics are sent before the process disappears.",
        "exit 0": "A clean exit, 1.4 s after the drain started, long before SIGKILL.",
        deadline: "If something hangs, it is cut at 35 s instead of holding the deploy.",
      },
    },
    "long-lived": {
      short: "Websockets",
      title: "Long-lived connections: ask clients to come back, with jitter",
      body: "A websocket can stay open for hours, so the drain cannot wait for it. And dropping 1 900 at once makes 1 900 clients reconnect in the same second, all to the remaining pods.\n\nAt 10 s the pod sends every client a `reconnect` message and closes with code 1012, service restart. The client waits a random 0 to 10 s and connects again, landing on a ready pod. For Server-Sent Events the pod ends the stream after a `retry:` hint, and the browser resumes with the last event id. 190 reconnects a second for 10 s instead of 1 900 in one.",
      watch: "Clients must also add jitter to their own reconnect after an unexpected drop, or a crash creates the same spike.",
      fields: {
        reconnect: "An application message: the server is leaving, connect again.",
        retry_in_ms: "The window for a random delay: 0 to 10 s.",
        "1012": "The standard websocket close code for a service restart.",
        "random(0..10 s)": "Jitter spreads the reconnects over 10 s.",
        "Last-Event-ID": "The browser tells the new server where the stream stopped.",
        "190 reconnects/s": "The same 1 900 clients, ten times flatter.",
      },
    },
    jobs: {
      short: "Jobs",
      title: "Background jobs: finish, or give the job back",
      body: "The job worker in the same process gets the same SIGTERM. It stops taking new messages at once. A job that will end within the deadline is finished and acknowledged. A long one, an export that needs 4 more minutes, stops at its last checkpoint and is returned to the queue (nack), so another pod picks it up right away.\n\nIf the pod dies anyway, the queue gives the job out again after the **visibility timeout** of 120 s. Either way a job can run twice, so every handler must be idempotent: the export writes the same file under its job id.",
      check: {
        q: "The pod is killed in the middle of a job that sends an invoice email. What happens to the job?",
        options: [
          "It is lost: the queue removed it when the pod received it",
          "It becomes visible again after the visibility timeout and runs a second time, so the email goes out twice unless the handler is idempotent",
          "The queue cancels it because the pod died",
        ],
        answer: 1,
        why: "Without an ack the queue assumes the job failed and hands it out again. That is what makes it safe to kill a worker, and also why a handler must notice it has already done the work.",
      },
      fields: {
        "stop receiving": "No new jobs from now on.",
        ack: "The job is done; the queue deletes it.",
        nack: "The job is returned now, without waiting for the timeout.",
        "visibility timeout": "How long a received job stays hidden before the queue offers it again.",
        "runs twice": "Killed between work and ack: the job runs again elsewhere.",
        idempotent: "Running it twice has the same effect as running it once.",
      },
    },
    "liveness-loop": {
      short: "Restart loop",
      title: "A liveness probe that checks the database",
      body: "Shutdown is half of it; the other half is how pods are judged alive. The liveness probe calls `/healthz`, and `/healthz` runs `SELECT 1` on the database. The database fails over, which takes 20 s.\n\nAfter 3 failed probes the orchestrator kills all 6 pods: they are healthy, but liveness says otherwise. They start cold and none is ready. The first that becomes ready takes all the traffic, slows down, its `/healthz` times out, and it is killed again. A 20 s database blip becomes a 6-minute outage.",
      check: {
        q: "What should the liveness probe check?",
        options: [
          "Every dependency, so a pod restarts whenever something is wrong",
          "Only whether the process itself is stuck: restarting it cannot fix a database, it only adds cold starts",
          "Nothing; liveness probes should be turned off",
        ],
        answer: 1,
        why: "A restart is the right cure only for a process that is wedged: a deadlock, a stuck event loop. For a dependency problem it removes healthy pods exactly when capacity matters most.",
      },
      fields: {
        livenessProbe: "Failing it means: kill and restart this container.",
        "SELECT 1": "The mistake: a check of another system inside the liveness probe.",
        failover: "A normal 20 s event on the database side.",
        "6 of 6": "Every pod fails at the same moment, because they share the database.",
        "0 ready": "Cold pods warming up: nobody can serve.",
        "killed again": "Overload makes the probe fail again: a restart loop.",
      },
    },
    probes: {
      short: "Probes",
      title: "Three probes, three questions",
      body: "Each probe answers one question. **Startup**: has the app finished starting? It may take up to 60 s, and the other probes wait for it. **Readiness**: should traffic come here now? Only after warm-up, with the database pool open, the price cache loaded and 50 warm-up requests run, and not while draining. **Liveness**: is the process stuck? It checks only the process itself, with a generous threshold.\n\nWhen the database is down now, requests fail fast with 503 and the pods stay up. When it comes back, they serve at once, warm.",
      watch: "Failing readiness on a shared dependency takes every pod out at once, and the balancer has nothing to send to. Keep readiness about the pod's own state.",
      fields: {
        startupProbe: "Gives a slow start time, so liveness does not kill a pod that is still starting.",
        readinessProbe: "In or out of the rotation. Never a restart.",
        livenessProbe: "Restart only a wedged process: 6 failures, 10 s apart.",
        "no dependencies": "The database, the cache and other services are not part of liveness.",
        "warm-up": "The new pod gets traffic only when its first requests will be fast.",
        "nobody restarts": "A dependency outage no longer multiplies into a restart loop.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Seven rules for stopping and starting.\n\n1) Make sure SIGTERM reaches the app: run it as PID 1 or under an init that forwards signals. 2) On SIGTERM flip readiness to false first and keep serving. 3) Wait longer than your balancers need to stop sending (10 s here), in the app or with a preStop sleep. 4) Then stop accepting, send Connection: close, drain in-flight requests with a deadline that fits inside the grace period, close pools last and flush logs and metrics. 5) Ask long-lived clients to reconnect, with jitter. 6) Background jobs: stop taking new ones, finish or return the current one, and make handlers idempotent. 7) Readiness only after warm-up; liveness checks the process, never a dependency.",
    },
  },
  scenarios: {
    "fast-exit": {
      label: "Exit on SIGTERM",
      steps: {
        "exit-now": {
          short: "Exit now",
          title: "Faster deploys, 502s on every one",
          body: "Deploys take 75 s, and someone makes them faster: the SIGTERM handler now calls exit(0). The pod disappears 4 ms after the signal.\n\nThe 17 requests in flight are cut, and for the next 9 s the balancer keeps sending to a port nobody listens on. About 1 850 errors per pod, 11 000 per deploy, three deploys a day. Users see a burst of 502s at checkout every time someone ships.",
          check: {
            q: "The balancer health-checks every pod. Why does it not prevent the burst?",
            options: [
              "It does prevent it: errors only come from bugs in the new version",
              "Health checks notice a dead pod only after their interval and threshold, seconds later; until then traffic goes to the closed port",
              "The balancer retries every failed request on another pod",
            ],
            answer: 1,
            why: "A health check detects a problem after it has happened. The only way to avoid the gap is for the pod to keep serving until the balancers have removed it, which is exactly what exit(0) skips.",
          },
          fields: {
            "Idempotency-Key": "The client may retry safely, but most users just see an error page.",
            "502": "The balancer could not get an answer from the pod.",
            error: "The pod closed the connection mid-request.",
            pod: "The pod exited 4 ms after SIGTERM, before any balancer knew.",
          },
        },
        "exit-fix": {
          short: "Fix",
          title: "Faster deploys without skipping the drain",
          body: "The exit(0) is reverted: ready false, wait 10 s, drain with a 25 s deadline, exit. Speed comes from elsewhere: two new pods start at a time, so 6 pods roll in 40 s instead of 75 s.\n\nTwo guards keep it from coming back. Every staging rollout runs under a load test and fails if a single 5xx appears. In production, a 5xx rate above 0.1% during a rollout pauses it.",
          fields: {
            revert: "Back to the full shutdown sequence.",
            maxSurge: "More new pods at once: faster rollouts that do not cut requests.",
            "load test": "Deploy errors are found in staging, where nobody pays for them.",
            "pause the rollout": "A bad shutdown stops after the first pod, not after six.",
          },
        },
      },
    },
  },
};

export default text;
