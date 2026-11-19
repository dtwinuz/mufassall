import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: deploy-kit",
  summary:
    "deploy-kit (github.com/wonmortech/deploy-kit) deploys a static site to your own server without dropping open connections: three bash scripts, release directories, one atomic symlink rename, a validated Caddy config, a graceful reload, a health check and a rollback command. It grew out of a real incident on 12 November 2026, when a deploy of another site cut off a download of the bitg installer at 791 KB. This lesson follows one deploy from end to end, step by step, then replays the incident, a bug the test suite found, and the one Caddy setting that would have undone the whole thing.",
  learn: [
    "What a visitor needs from a deploy: a download that started before it keeps going, and every request sees one whole release",
    "The eight steps: stage, validate, unpack, swap, config, reload, prune, health check, and why each one is there",
    "Which operation is atomic (rename, not ln -sfn), which object holds an inode (an open file, a single-file bind mount)",
    "How the kit is tested without a server, and which sites deploy this way",
  ],
  nodes: {
    dev: "Maintainer or CI",
    script: "deploy.sh",
    remote: "remote.sh",
    browser: "Visitor",
    edge: "Reverse proxy",
    caddy: "Caddy",
    rel: "www/releases",
    check: "Validate container",
  },
  metrics: {
    dl: "Installer download that finished",
    restarts: "Web container restarts per deploy",
    grace: "Time a recreate gives open downloads",
    kept: "Releases kept for rollback",
    tests: "Checks in the test suite",
    sites: "Sites deployed this way",
  },
  steps: {
    setup: {
      short: "What it is",
      title: "A deploy nobody notices",
      body: "A static site looks easy to deploy: copy files, restart the web server. But a site that serves installers has people downloading 6 MB files on slow connections, and a restart cuts every one of them off. deploy-kit is a template for the other way: the new release goes into its own directory, a symlink is renamed to point at it, and Caddy reloads its config in place without closing anything.\n\nWho it is for: anyone who serves a static site from their own Linux server with Docker and Caddy, by hand or from CI. It is three scripts, a Caddyfile and a compose file, MIT-licensed, version 0.1.0, with every host and path a placeholder such as example.com.",
      watch: "The numbers come from the repository and from the wonmor.io post about the incident: the finished download in bytes, the 15 s recreate bound, 3 kept releases, 33 checks and the sites that use the pattern.",
      fields: {
        "dist/": "Your build output; the kit does not care how it was built.",
        SITE_URL: "Public URL used for the health check at the end.",
        "origin/main": "Only a pushed commit can be deployed, so the live site always matches a commit.",
        "deploy.sh": "Stage, upload, call remote.sh, health check.",
        "remote.sh": "Validate, unpack, swap, reload, prune.",
        "rollback.sh": "Point current at an earlier release and reload.",
      },
    },
    visitor: {
      short: "Visitor",
      title: "What the visitor needs: the download keeps going",
      body: "From the visitor's side a deploy should be invisible. A download that started a minute ago should finish with every byte, and a page opened after the deploy should come entirely from the new release. Nothing in between: no 404 because a directory was briefly missing, no reset connection because the server restarted.\n\nThe example is the real case behind the kit: an MSI installer of 6 303 744 bytes served through a shared reverse proxy to Caddy.",
      fields: {
        GET: "One long request; at a few hundred KB/s it stays open for many seconds.",
        "Content-Length": "6 303 744 bytes, the installer used in the tests; a cut download is shorter and fails its checksum.",
        "200 OK": "Must stay a full 200 even if a deploy happens in the middle.",
      },
    },
    layout: {
      short: "Layout",
      title: "Releases in directories, current is a symlink",
      body: "Everything follows from the layout on the server. Each deploy gets its own directory under www/releases, which is never changed afterwards. www/current is a symlink to one of them, and Caddy's root is /www/current. www/history lists the kept releases, oldest first, the last one live. REVISION records the live commit.\n\nThe container mounts conf/ and www/ read-only. It never needs to be recreated to see new files: they appear when the symlink moves.",
      fields: {
        "conf/": "The config is mounted as a directory; step 4 shows why that matters.",
        "www/releases": "One directory per deploy; a live release is never modified.",
        "www/current": "The only thing that changes on deploy is where this link points.",
        "www/history": "Names of kept releases; rollback reads it.",
        "caddy:2-alpine": "One small container, restart unless stopped, stop_grace_period 15 s.",
        REVISION: "The live commit hash, for a person looking at the server.",
      },
    },
    stage: {
      short: "1. Stage",
      title: "deploy.sh refuses anything that is not a pushed commit",
      body: "deploy.sh starts on your machine or in CI. It stops if the working tree has uncommitted changes, fetches origin and stops if HEAD is not origin/main. Then it copies dist/ into a staging folder, writes the full commit hash into version.txt inside the site, adds the Caddyfile, the compose file and the two server scripts, and streams everything as one tar archive over SSH, where it calls remote.sh with the commit.\n\nversion.txt is small but essential: it is a value unique to this deploy, which the health check will look for on the public URL.",
      fields: {
        "--porcelain": "Any uncommitted change stops the deploy.",
        "origin/main": "A local, unpushed or feature-branch commit cannot reach production.",
        "version.txt": "The commit hash inside the site, for the health check.",
        "tar -czf": "One archive, streamed: no partial upload sits on the server.",
        "./remote.sh": "The server half runs with the commit as its only argument.",
      },
    },
    validate: {
      short: "2. Validate",
      title: "A broken config never touches the live site",
      body: "The first thing remote.sh does is check the new Caddyfile in a throwaway container: no network, the new files mounted read-only, a tmpfs for logs. If caddy validate fails, `set -e` stops the script and nothing live has changed: the old release is still served with the old config.\n\nIn the old flow a broken Caddyfile took the site down. Moving validation in front of every other step turns that outage into a failed deploy.",
      fields: {
        "--network none": "The check cannot reach anything, so it cannot have side effects.",
        "new:/c:ro": "The candidate files are read-only inside the check.",
        "caddy validate": "Parses and provisions the config without serving it.",
        untouched: "Failure here costs nothing: current, conf and the container are as they were.",
      },
    },
    unpack: {
      short: "3. Unpack",
      title: "A directory no request has seen",
      body: "The site is moved into www/releases/<first 12 hex of the commit>-<UTC time>. No request has ever seen this directory, so filling it cannot disturb anyone. The timestamp matters: redeploying the same commit creates a new directory instead of overwriting the one being served.\n\nThe script also refuses to continue if that directory already exists. That check was added after a bug, shown in the second scenario.",
      fields: {
        "${SHA:0:12}": "First 12 hex characters of the commit.",
        "date -u": "UTC time to the second, so names sort and never repeat in practice.",
        "already exists": "Stop before anything changes; deploy again a second later.",
        "mv new/site": "A rename inside one file system: instant, no copying.",
      },
    },
    swap: {
      short: "4. Swap",
      title: "The rename is the deploy",
      body: "`ln -sfn` looks like a switch, but it is two system calls: remove the old link, create the new one. A request that arrives between them finds no www/current and gets a 404. The kit creates a second link, www/current.next, and renames it over www/current with `mv -T`. A rename is one rename(2) call, atomic on Linux: every request sees the old release or the new one.\n\nOpen files are not affected. A download that started before the swap holds a file descriptor on the old file and keeps streaming from it, while new requests resolve the link to the new release. That is also why old releases are kept for a while.",
      check: {
        q: "Why not simply run `ln -sfn releases/$REL www/current`?",
        options: [
          "ln is slower than mv",
          "ln -sfn removes the old link and then creates a new one, so a request can arrive when there is no link at all; renaming a prepared link over it is a single atomic step",
          "ln cannot point at a relative path",
        ],
        answer: 1,
        why: "Atomicity is a property of one system call. rename(2) replaces the directory entry in one step, so there is no moment without www/current. Two calls always leave a gap, however short.",
      },
      fields: {
        "www/current.next": "A new link created beside the live one.",
        "mv -T": "Treats the target as a file to replace, not a directory to move into; GNU coreutils.",
        "rename(2)": "The one atomic operation the whole deploy relies on.",
        "ln -sfn alone": "Unlink then create: a gap in which requests can fail.",
      },
    },
    config: {
      short: "5. Config",
      title: "Mount the config directory, not the file",
      body: "The new Caddyfile is written as conf/Caddyfile.next and renamed over conf/Caddyfile, the same trick as the symlink. But that only works because the container mounts the conf/ directory. A bind mount of a single file pins the inode it had at mount time; after a rename the container would keep reading the old file, and the reload would apply the old config.\n\nThe old flow had exactly this shape: a single bind mount, so the only way to show the container new files was to recreate it. The fix had to change the layout, not just the command.",
      check: {
        q: "The compose file mounts `./conf/Caddyfile:/etc/caddy/Caddyfile`. You rename a new file over conf/Caddyfile and run caddy reload. What does Caddy load?",
        options: [
          "The new file, because the path is the same",
          "The old file: the single-file bind mount still points at the original inode, which the rename did not change",
          "Nothing, the reload fails",
        ],
        answer: 1,
        why: "A file bind mount attaches the inode, not the name. Renaming another file to that name gives the name a new inode on the host, but the container still holds the old one. Mounting the directory makes the container resolve the name each time.",
      },
      fields: {
        "Caddyfile.next": "Written beside the live config, then renamed over it.",
        "a directory": "conf/ is mounted, so a renamed file inside it is visible.",
        "pins its inode": "Why the old layout forced a container recreate on every deploy.",
      },
    },
    reload: {
      short: "6. Reload",
      title: "Reload, not restart",
      body: "`docker compose up -d` runs on every deploy but does nothing unless docker-compose.yml itself changed. Then `caddy reload` applies the config through Caddy's admin endpoint inside the container. The process keeps running, the container's start time does not change, open connections continue.\n\nOne Caddy option is deliberately absent: grace_period. It looks made for zero-downtime, but Caddy applies it on reloads too. The third scenario shows why that matters.",
      fields: {
        "a no-op": "The container is recreated only when its compose definition changes.",
        "caddy reload": "New config in place; no process restart.",
        "file descriptors": "Open downloads keep reading the old release's files.",
        grace_period: "Left unset on purpose.",
      },
    },
    prune: {
      short: "7. Prune",
      title: "Keep three releases, delete the rest",
      body: "The new release name is appended to www/history, the file is cut to the last KEEP_RELEASES entries (3 by default), and any directory in www/releases that is no longer listed is deleted. REVISION gets the commit, and the script prints the new and previous release.\n\nOld releases are kept for two reasons: a slow download may still be reading from one, and rollback needs something to roll back to.",
      fields: {
        "www/history": "Append, then keep the tail: the live release is always the last line.",
        KEEP_RELEASES: "3 by default; the variant used by other sites keeps 5.",
        "rm -rf": "Only directories that are no longer in history.",
        REVISION: "Written last, after everything else succeeded.",
      },
    },
    health: {
      short: "8. Health",
      title: "Prove the public URL serves the new commit",
      body: "Back on your machine, deploy.sh polls SITE_URL/version.txt until it contains the new commit hash: up to 20 tries, 3 seconds apart. That proves the release is served through everything in front of it: the reverse proxy, caches, DNS.\n\nIf it never appears, the script exits non-zero and prints the exact rollback command. It does not roll back by itself; that is a stated limitation.",
      check: {
        q: "Why poll a version.txt that contains the commit hash, rather than check that the home page answers 200?",
        options: [
          "version.txt is smaller and faster",
          "The old release also answers 200; only a value unique to this deploy proves the public URL now serves the new one",
          "Caddy does not serve the home page during a reload",
        ],
        answer: 1,
        why: "A health check must distinguish success from no change. If the swap failed silently or a cache kept the old site, the home page would still be 200. The commit hash can only come from the new release.",
      },
      fields: {
        "version.txt": "Served with Cache-Control no-cache, so the check is not fooled by a cache.",
        "20 tries": "About a minute in total, 3 s apart.",
        "deploy ready": "The only success message.",
        "Roll back with": "The script prints the exact command instead of acting on its own.",
      },
    },
    rollback: {
      short: "Rollback",
      title: "Rollback uses the same rename",
      body: "rollback.sh runs on the server. With --list it shows the kept releases and marks the live one. Without arguments it goes back to the previous release in www/history; with a name it goes to that release. It performs the same two moves, a new link renamed over www/current and a caddy reload, so a rollback drops no connections either.",
      fields: {
        "--list": "Kept releases, live one with *.",
        "previous release": "The last line of history that is not live.",
        "<release-name>": "Any kept release by its directory name.",
        "zero-downtime too": "Same rename and reload as a deploy.",
      },
    },
    tests: {
      short: "Tests",
      title: "Tested without a server",
      body: "tests/run.sh puts stub versions of docker, ssh, curl and date first on PATH and runs all three scripts end to end in a temporary directory: 33 checks, no server, no Docker. CI runs it together with ShellCheck on every pull request, plus a DCO sign-off check. OpenSSF Scorecard runs weekly and Dependabot keeps the actions current.\n\nThe example GitHub Actions workflow is manual dispatch only. It installs an SSH key and a pinned known_hosts from repository secrets, so a CI run never trusts a host key it sees for the first time.",
      fields: {
        "33 checks": "remote.sh, rollback.sh and deploy.sh, end to end.",
        stubbed: "Stub commands record their arguments; date is fixed to test release names.",
        ShellCheck: "Static analysis at style severity on every script.",
        DCO: "Each commit must carry a Signed-off-by line.",
        "manual dispatch": "Deploying stays a decision, not a side effect of a push.",
        known_hosts: "Pinned from a secret: no trust on first use.",
      },
    },
    adopters: {
      short: "Who uses it",
      title: "Six sites and an edge deploy this way",
      body: "The pattern started on bitg.uz, where a maintainer pushes from a clean checkout and deploy/remote.sh does the server side. The wonmor.io site and the muhr, sanad and shaffof sites use a CI variant: GitHub Actions connects over SSH with a key bound to a single receive script, which unpacks into releases/<sha>, keeps 5 releases and a PREVIOUS pointer, and reverts if the reload fails. mufassall.dtwin.uz uses the same receive variant and adds an outside smoke test with automatic rollback. The shared dtwin.uz edge proxy got the same treatment.\n\ndeploy-kit is the general version of all of these, with placeholders and tests, for anyone to copy.",
      fields: {
        "the original": "bitg.uz, since 13 Nov 2026; the post describes this flow.",
        "forced-command": "authorized_keys binds the CI key to one program; it cannot open a shell.",
        "automatic rollback": "If the public checks fail, CI switches current back.",
        "switch back": "Only when the reload itself fails.",
        placeholders: "example.com, deploy@your-server, /srv/sites/example.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "1) A deploy must be invisible: open downloads finish, every request sees one whole release. 2) Stage only a pushed commit, with version.txt holding its hash. 3) Validate the new config in a throwaway, networkless container before anything live changes. 4) Unpack into a new, timestamped directory and refuse if it already exists. 5) The rename is the deploy: a prepared link renamed over current with mv -T, never ln -sfn alone. 6) Mount the config directory, not the file, and rename the config the same way. 7) Reload, do not restart; leave Caddy's grace_period unset and bound recreates with stop_grace_period. 8) Keep a few releases, check the public URL for the new hash, and roll back with the same rename.",
    },
  },
  scenarios: {
    "cut-download": {
      label: "Cut download",
      steps: {
        cut: {
          short: "791 KB",
          title: "Another site's deploy cut a download",
          body: "On the evening of 12 November 2026 a deploy of a different site on the same edge ran `docker compose up -d --force-recreate`. Docker sent the shared web container SIGTERM and, after its default ten seconds, SIGKILL. A download of the bitg installer that needed longer than that stopped at 791 KB, and the user got a truncated file.",
          check: {
            q: "The flag was there for a reason. Why did the old flow recreate the container on every deploy?",
            options: [
              "Because Caddy cannot reload its config",
              "Because the site was a single bind mount of one directory replaced wholesale, so recreating was the only way the container would see the new files",
              "Because Docker requires it after any file change",
            ],
            answer: 1,
            why: "With a single bind mount and a replaced directory, the running container kept the old one. The fix therefore had to change the layout (releases, a symlink, a mounted conf directory), not just remove a flag.",
          },
          fields: {
            "different site": "The cause was not even a bitg deploy: the container was shared.",
            "--force-recreate": "Recreates the container whether anything changed or not.",
            SIGKILL: "After the stop timeout, open connections die with the process.",
            "791 KB": "Out of about 6 MB: an installer that cannot run.",
          },
        },
        second: {
          short: "861 KB",
          title: "A second cut, and a different cause",
          body: "A few minutes later another download stopped at 861 KB. It would have been easy to blame the same deploy. But the edge log for that request showed a write timeout towards the client, and 22 test downloads from the team's own network all completed. The second failure was the client's connection. A fix tested against the wrong failure proves nothing.",
          fields: {
            "write timeout": "The proxy could not send to the client: a network problem on their side.",
            "22 test downloads": "Repeated from a good network, all complete.",
            "not the deploy": "Separate the two causes before measuring a fix.",
          },
        },
        survives: {
          short: "Full file",
          title: "The download survives a deploy",
          body: "The new flow was first run against a copy of the production directory in a separate container. A download throttled to 300 KB/s was started, and a release that also changed a response header was deployed in the middle. The download finished with status 200, 6 303 744 bytes and a matching SHA-256; a new request got the new header; the container's start time did not change. In production, a 76-second download ran straight through an edge deploy. The whole change was around 66 lines of shell.",
          fields: {
            "300 KB/s": "Slow enough that the download spans the whole deploy.",
            "6,303,744 bytes": "Every byte, checksum equal to the production file.",
            "76-second": "One production measurement: it shows the mechanism, it is not a rate.",
            "66 lines": "The value is in knowing which operation is atomic, not in the size of the script.",
          },
        },
      },
    },
    "same-second": {
      label: "Same second",
      steps: {
        nested: {
          short: "Nested site",
          title: "Deploying the same commit twice in one second",
          body: "In the first version, the release name was the commit prefix plus the time to the second, and nothing checked that the directory was new. Deploy the same commit twice within one second and both deploys compute the same name. The second `mv new/site www/releases/$REL` then finds an existing directory, and mv does what it always does with a directory target: it moves the new site inside it, into the release Caddy is serving.",
          check: {
            q: "What is the safe behaviour when the release directory already exists?",
            options: [
              "Delete it and unpack again",
              "Stop before anything changes; the live site stays as it is and the deploy can simply be repeated a second later",
              "Unpack into it with overwrite",
            ],
            answer: 1,
            why: "The existing directory may be the live release. Deleting or overwriting it would break current requests. Stopping is free: nothing has moved yet, and a second later the timestamp is different.",
          },
          fields: {
            "same name": "Commit prefix and timestamp both equal.",
            INSIDE: "mv into an existing directory nests the source instead of replacing it.",
            "www/releases/<rel>/site/": "A stray copy inside the served tree.",
          },
        },
        guarded: {
          short: "33 checks",
          title: "The test suite found it",
          body: "Pull request #2 added tests/run.sh, with stubbed docker, ssh, curl and date, so the scripts could be run end to end on any machine. A fixed date made the same-second case easy to reproduce. remote.sh now stops if the directory exists, before anything changes. The test for it failed before the fix and passes after it: passed 33, failed 0.",
          fields: {
            "[ ! -e": "The guard runs before the first mv.",
            "failed before the fix": "The test proves the bug, not just the fix.",
            "passed: 33": "The whole suite, locally and in CI.",
          },
        },
      },
    },
    "grace-trap": {
      label: "Grace period trap",
      steps: {
        tempting: {
          short: "grace_period",
          title: "The setting that sounds exactly right",
          body: "Caddy has a grace_period option: how long the server waits for open connections when it shuts down. For a zero-downtime setup it sounds like the obvious thing to set. But Caddy applies it on config reloads as well. Any value would force-close slow downloads at that moment, during a perfectly ordinary deploy. Meanwhile a real recreate still used Docker's default of ten seconds.",
          check: {
            q: "Where should the limit on waiting for open connections live instead?",
            options: [
              "In Caddy's grace_period, set to a large value such as an hour",
              "In Docker's stop_grace_period, which only applies when the container is really stopped or recreated; leave Caddy's grace_period unset so reloads wait for connections to finish",
              "Nowhere; never stop the container",
            ],
            answer: 1,
            why: "Reloads happen on every deploy and must never cut anything, so Caddy gets no limit. Recreates are rare (only when the compose file changes) and need some bound, which Docker's stop_grace_period provides without touching reloads.",
          },
          fields: {
            grace_period: "A Caddy global option for shutdown, also used on reload.",
            "config reloads": "Every deploy reloads, so every deploy would cut.",
            "force-closes": "Downloads longer than the value end early.",
            "10 s": "Docker's default stop timeout before SIGKILL.",
          },
        },
        bounded: {
          short: "15 s",
          title: "No grace_period, stop_grace_period 15 s",
          body: "The Caddyfile has no grace_period, so a reload waits for old connections to finish on their own. The compose file sets stop_grace_period to 15 seconds, which only matters when the compose definition changes and the container really is recreated. Even then, open downloads get 15 seconds instead of 10. It is still a limit, and the README lists it as one.",
          fields: {
            "no grace_period": "Reloads never cut a connection.",
            "stop_grace_period: 15s": "SIGTERM, 15 s, then SIGKILL, on a real recreate only.",
            "compose definition": "The only change that triggers a recreate.",
          },
        },
      },
    },
  },
};

export default text;
