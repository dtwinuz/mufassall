import { defineLesson } from "@mufassall/scene-schema";

/**
 * deploy-kit (github.com/wonmortech/deploy-kit): zero-downtime static deploys with Caddy in three
 * bash scripts. Release directories, one atomic rename, a validated config, a graceful reload, a
 * health check and a rollback command. Sources: the repository (v0.1.0, 13-17 Nov 2026), its PRs,
 * and the post "Zero-downtime static deploys with Caddy" on wonmor.io (13 Nov 2026).
 */
export default defineLesson({
  slug: "project-deploy-kit",
  level: "intermediate",
  minutes: 18,
  tier: "public",
  metrics: [
    { id: "dl", unit: "KB", better: "up" },
    { id: "restarts", unit: "", better: "down" },
    { id: "grace", unit: "s", better: "up" },
    { id: "kept", unit: "", better: "up" },
    { id: "tests", unit: "", better: "up" },
    { id: "sites", unit: "", better: "up" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        dev: { kind: "actor", at: [0, 2] },
        script: { kind: "worker", at: [3, 2] },
        remote: { kind: "service", at: [6, 2] },
        browser: { kind: "client", at: [0, 6] },
        edge: { kind: "lb", at: [3, 6] },
        caddy: { kind: "cdn", at: [6, 6] },
        rel: { kind: "storage", at: [9, 6] },
      },
      edges: {
        run: { from: "dev", to: "script", rate: 2, mode: "call" },
        ssh: { from: "script", to: "remote", rate: 2, mode: "call" },
        get: { from: "browser", to: "edge", rate: 3, mode: "call" },
        fwd: { from: "edge", to: "caddy", rate: 3, mode: "call" },
        serve: { from: "caddy", to: "rel", rate: 3, mode: "call" },
      },
      metrics: { dl: 6156, restarts: 0, grace: 15, kept: 3, tests: 33, sites: 6 },
      focus: ["dev", "script", "remote"],
      exchange: {
        edge: "run",
        request: {
          format: "text",
          head: "deploy-kit 0.1.0 (MIT): quick start",
          body: "npm run build                         your site, built into dist/\nSITE_URL=https://example.com \\\n REMOTE_DIR=/srv/sites/example \\\n deploy/deploy.sh deploy@your-server     the commit must be pushed to origin/main\n\ndeploy/deploy.sh      runs on your machine or in CI\ndeploy/remote.sh      runs on the server\ndeploy/rollback.sh    runs on the server",
        },
        marks: ["dist/", "SITE_URL", "origin/main", "deploy.sh", "remote.sh", "rollback.sh"],
      },
    },
    {
      id: "visitor",
      kind: "case",
      edges: { get: { flow: "request" }, fwd: { flow: "request" }, serve: { flow: "ack" } },
      focus: ["browser", "edge", "caddy"],
      exchange: {
        edge: "get",
        request: { format: "http", head: "GET /bitg-<version>-x64.msi HTTP/1.1", headers: [["Host", "bitg.uz"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["Content-Length", "6303744"]],
        },
        marks: ["GET", "Content-Length", "200 OK"],
      },
    },
    {
      id: "layout",
      kind: "case",
      edges: { serve: { flow: "request" } },
      focus: ["caddy", "rel"],
      exchange: {
        edge: "serve",
        request: {
          format: "text",
          head: "server layout under /srv/sites/example",
          body: "conf/Caddyfile          mounted as a directory: conf/ -> /etc/caddy\nwww/releases/<rel>/     one directory per deploy, never modified afterwards\nwww/current             symlink -> releases/<rel>; Caddy's root is /www/current\nwww/history             kept release names, oldest first, last = live\ndocker-compose.yml      one caddy:2-alpine container\nREVISION                commit hash of the live release",
        },
        marks: ["conf/", "www/releases", "www/current", "www/history", "caddy:2-alpine", "REVISION"],
      },
    },
    {
      id: "stage",
      kind: "case",
      edges: { run: { flow: "request" }, ssh: { flow: "request" }, serve: { flow: "request" } },
      focus: ["script", "remote"],
      exchange: {
        edge: "ssh",
        request: {
          format: "text",
          head: "deploy.sh: stage and upload",
          body: "git status --porcelain       must be empty: \"uncommitted changes\"\nHEAD == origin/main          otherwise \"HEAD is not origin/main\"\nnew/site/                    a copy of dist/\nnew/site/version.txt         the full commit hash\nnew/Caddyfile, docker-compose.yml, remote.sh, rollback.sh\ntar -czf - new | ssh deploy@your-server \"... ./remote.sh <sha>\"",
        },
        marks: ["--porcelain", "origin/main", "version.txt", "tar -czf", "./remote.sh"],
      },
    },
    {
      id: "validate",
      kind: "fix",
      nodes: { check: { kind: "worker", at: [9, 2] } },
      edges: { val: { from: "remote", to: "check", rate: 1, mode: "call" }, ssh: { flow: "request" } },
      focus: ["remote", "check"],
      exchange: {
        edge: "val",
        request: {
          format: "text",
          head: "remote.sh, step 1: validate before anything live changes",
          body: "docker run --rm --network none --tmpfs /var/log/caddy \\\n  -v \"$PWD/new:/c:ro\" caddy:2-alpine \\\n  caddy validate --config /c/Caddyfile --adapter caddyfile\nexit code != 0  ->  set -e stops the script; www/current is untouched",
        },
        marks: ["--network none", "new:/c:ro", "caddy validate", "untouched"],
      },
    },
    {
      id: "unpack",
      kind: "case",
      edges: { unpack: { from: "remote", to: "rel", rate: 1, mode: "call" }, val: { rate: 0 } },
      focus: ["remote", "rel"],
      exchange: {
        edge: "unpack",
        request: {
          format: "text",
          head: "remote.sh, step 2: a directory no request has seen",
          body: "REL=\"${SHA:0:12}-$(date -u +%Y%m%dT%H%M%SZ)\"\n[ ! -e \"www/releases/$REL\" ] || exit 1      already exists: deploy again in a second\nmv new/site \"www/releases/$REL\"",
        },
        marks: ["${SHA:0:12}", "date -u", "already exists", "mv new/site"],
      },
    },
    {
      id: "swap",
      kind: "fix",
      edges: { unpack: { flow: "request" }, serve: { flow: "request", rate: 3 } },
      focus: ["remote", "rel", "caddy"],
      exchange: {
        edge: "unpack",
        request: {
          format: "text",
          head: "remote.sh, step 3: the rename is the deploy",
          body: "ln -sfn \"releases/$REL\" www/current.next\nmv -T www/current.next www/current          one rename(2)\n\nln -sfn alone      unlink, then create: a request can land in between\nrename over        every request sees the old release or the new one",
        },
        marks: ["www/current.next", "mv -T", "rename(2)", "ln -sfn alone"],
      },
    },
    {
      id: "config",
      kind: "case",
      edges: { reload: { from: "remote", to: "caddy", rate: 1, mode: "call" }, unpack: { rate: 0 } },
      focus: ["remote", "caddy"],
      exchange: {
        edge: "reload",
        request: {
          format: "text",
          head: "remote.sh, step 4: replace the config the same way",
          body: "mv new/Caddyfile conf/Caddyfile.next\nmv -T conf/Caddyfile.next conf/Caddyfile\n\nvolumes: ./conf:/etc/caddy:ro     a directory, not a single file\na bind mount of one file pins its inode; after a rename the container would keep the old one",
        },
        marks: ["Caddyfile.next", "a directory", "pins its inode"],
      },
    },
    {
      id: "reload",
      kind: "fix",
      edges: { reload: { flow: "request" }, serve: { flow: "ack" } },
      focus: ["remote", "caddy", "browser"],
      exchange: {
        edge: "reload",
        request: {
          format: "text",
          head: "remote.sh, step 5: reload, not restart",
          body: "docker compose up -d --remove-orphans      a no-op unless docker-compose.yml changed\ndocker compose exec -T site caddy reload --config /etc/caddy/Caddyfile\nopen downloads     keep their file descriptors on the old release and finish\nnew requests       resolve www/current to the new release\ngrace_period       deliberately not set",
        },
        marks: ["a no-op", "caddy reload", "file descriptors", "grace_period"],
      },
    },
    {
      id: "prune",
      kind: "case",
      edges: { unpack: { rate: 1, flow: "request" }, reload: { rate: 0 } },
      focus: ["remote", "rel"],
      exchange: {
        edge: "unpack",
        request: {
          format: "text",
          head: "remote.sh, step 6: keep a few, delete the rest",
          body: "echo \"$REL\" >> www/history\ntail -n \"$KEEP_RELEASES\" www/history     default 3\nevery www/releases/* not in history  ->  rm -rf\necho \"$SHA\" > REVISION\nrelease: 0123456789ab-20261113T120000Z (previous: ...)",
        },
        marks: ["www/history", "KEEP_RELEASES", "rm -rf", "REVISION"],
      },
    },
    {
      id: "health",
      kind: "case",
      edges: { health: { from: "script", to: "edge", rate: 1, mode: "call" }, unpack: { rate: 0 } },
      focus: ["script", "edge"],
      exchange: {
        edge: "health",
        request: { format: "http", head: "GET /version.txt HTTP/1.1", headers: [["Host", "example.com"]] },
        response: { format: "text", head: "HTTP/1.1 200 OK", body: "<the new commit hash>\n\nup to 20 tries, 3 s apart\nok:     deploy ready: <sha> -> https://example.com\nfail:   deploy stopped ... Roll back with: ssh deploy@your-server 'cd /srv/sites/example && ./rollback.sh'" },
        marks: ["version.txt", "20 tries", "deploy ready", "Roll back with"],
      },
    },
    {
      id: "rollback",
      kind: "fix",
      edges: { reload: { flow: "request", rate: 1 }, health: { rate: 0 } },
      focus: ["remote", "caddy", "rel"],
      exchange: {
        edge: "reload",
        request: {
          format: "text",
          head: "on the server: rollback.sh",
          body: "./rollback.sh --list          kept releases, the live one marked with *\n./rollback.sh                 back to the previous release in www/history\n./rollback.sh <release-name>  to a specific kept release\nsame ln -sfn + mv -T, then caddy reload: a rollback is zero-downtime too",
        },
        marks: ["--list", "previous release", "<release-name>", "zero-downtime too"],
      },
    },
    {
      id: "tests",
      kind: "case",
      edges: { run: { flow: "request", rate: 2 }, reload: { rate: 0 } },
      focus: ["dev", "script"],
      exchange: {
        edge: "run",
        request: {
          format: "text",
          head: "how the kit itself is checked",
          body: "tests/run.sh        33 checks; docker, ssh, curl and date stubbed on PATH, no server needed\nShellCheck          --severity=style on every script\nCI                  both on every pull request, plus a DCO sign-off check\nOpenSSF Scorecard   weekly; Dependabot for actions\ndeploy.yml          example workflow: manual dispatch only, SSH key and pinned known_hosts from secrets",
        },
        marks: ["33 checks", "stubbed", "ShellCheck", "DCO", "manual dispatch", "known_hosts"],
      },
    },
    {
      id: "adopters",
      kind: "case",
      edges: { get: { flow: "request" }, fwd: { flow: "request" }, run: { rate: 0 } },
      focus: ["edge", "caddy"],
      exchange: {
        edge: "fwd",
        request: {
          format: "text",
          head: "who deploys this way (Nov 2026)",
          body: "bitg.uz                       the original: push from a maintainer's machine, remote.sh\nwonmor.io, muhr, sanad, shaffof   CI over SSH into a forced-command receive script\nmufassall.dtwin.uz            the same receive variant, plus smoke test and automatic rollback\nthe shared dtwin.uz edge      release per deploy, swap, reload, switch back if the reload fails\ndeploy-kit                    the generalised version with placeholders and tests",
        },
        marks: ["the original", "forced-command", "automatic rollback", "switch back", "placeholders"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "cut-download",
      from: "reload",
      steps: [
        {
          id: "cut",
          kind: "problem",
          edges: { serve: { flow: "fail" }, get: { flow: "fail" } },
          metrics: { dl: 791, restarts: 1, grace: 10 },
          focus: ["browser", "caddy"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "12 Nov 2026, the old flow",
              body: "a deploy of a different site on the same edge\ndocker compose up -d --force-recreate     the shared web container is recreated\nDocker: SIGTERM, then SIGKILL after the default 10 s\nbitg installer download stopped at 791 KB",
            },
            marks: ["different site", "--force-recreate", "SIGKILL", "791 KB"],
          },
        },
        {
          id: "second",
          kind: "case",
          focus: ["browser", "edge"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "minutes later: a second cut, at 861 KB",
              body: "edge log for that request    write timeout towards the client\n22 test downloads from our own network    all completed\nconclusion    the client's connection, not the deploy",
            },
            marks: ["write timeout", "22 test downloads", "not the deploy"],
          },
        },
        {
          id: "survives",
          kind: "fix",
          edges: { serve: { flow: "ack" }, get: { flow: "ack" } },
          metrics: { dl: 6156, restarts: 0, grace: 15 },
          focus: ["browser", "caddy", "rel"],
          exchange: {
            edge: "serve",
            request: {
              format: "text",
              head: "the new flow, tested before and in production",
              body: "MSI download throttled to 300 KB/s, deploy in the middle\nresult      200, 6,303,744 bytes, SHA-256 matches; container start time unchanged\nproduction  a 76-second download ran straight through an edge deploy\nthe change  around 66 lines of shell",
            },
            marks: ["300 KB/s", "6,303,744 bytes", "76-second", "66 lines"],
          },
        },
      ],
    },
    {
      id: "same-second",
      from: "unpack",
      steps: [
        {
          id: "nested",
          kind: "problem",
          edges: { unpack: { flow: "fail" } },
          metrics: { tests: 0 },
          focus: ["remote", "rel"],
          exchange: {
            edge: "unpack",
            request: {
              format: "text",
              head: "first commit 2be2cd8: the same commit deployed twice within one second",
              body: "REL           0123456789ab-20261113T120000Z  (same name both times)\nmv new/site www/releases/$REL\n              the target exists, so mv moves the new site INSIDE the live release\nresult        www/releases/<rel>/site/ inside the directory Caddy is serving",
            },
            marks: ["same name", "INSIDE", "www/releases/<rel>/site/"],
          },
        },
        {
          id: "guarded",
          kind: "fix",
          edges: { unpack: { flow: "request" } },
          metrics: { tests: 33 },
          focus: ["remote", "rel"],
          exchange: {
            edge: "unpack",
            request: {
              format: "text",
              head: "PR #2: a test suite, and the fix it found",
              body: "remote.sh     [ ! -e \"www/releases/$REL\" ] || exit 1   before anything changes\ntest          failed before the fix, passes after it\ntests/run.sh  passed: 33, failed: 0",
            },
            marks: ["[ ! -e", "failed before the fix", "passed: 33"],
          },
        },
      ],
    },
    {
      id: "grace-trap",
      from: "reload",
      steps: [
        {
          id: "tempting",
          kind: "problem",
          edges: { serve: { flow: "fail" } },
          metrics: { grace: 10 },
          focus: ["caddy", "browser"],
          exchange: {
            edge: "serve",
            request: {
              format: "text",
              head: "the setting that sounds right",
              body: "Caddy grace_period    how long the server waits for open connections on shutdown\nbut                   Caddy applies it on config reloads as well\nany value             force-closes slow downloads during an ordinary deploy\nDocker default        a real recreate still kills after 10 s",
            },
            marks: ["grace_period", "config reloads", "force-closes", "10 s"],
          },
        },
        {
          id: "bounded",
          kind: "fix",
          edges: { serve: { flow: "ack" } },
          metrics: { grace: 15 },
          focus: ["caddy"],
          exchange: {
            edge: "serve",
            request: {
              format: "text",
              head: "where the bound lives instead",
              body: "Caddyfile             no grace_period: a reload waits for old connections to finish\ndocker-compose.yml    stop_grace_period: 15s, used only when the container is really recreated\nwhen                  only if the compose definition changes",
            },
            marks: ["no grace_period", "stop_grace_period: 15s", "compose definition"],
          },
        },
      ],
    },
  ],
});
