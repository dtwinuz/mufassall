import { defineLesson } from "@mufassall/scene-schema";

/**
 * Project lesson: the two GitHub organisations behind the projects, dtwinuz and wonmortech, as one
 * delivery system. What lives there (every project, grouped by kind; private repos only by their
 * public one-line description), how the orgs are governed (teams, CODEOWNERS, squash-only, custom
 * properties, issue types, Projects, what the Free plan does not give private repos), how CI is
 * paid for (the Actions budget, one PR per batch), the supply chain (SHA pinning, grouped
 * Dependabot, GHCR images), the shared edge proxy (zero-downtime symlink deploys, enforced CSP,
 * security.txt), OpenSSF (Allstar, Scorecard, badges) and the demo standard. Scenarios are
 * org-level incidents from the history: CI stopped by a $0 budget and a 12-PR flood, release pushes
 * denied by unlinked GHCR packages, a download cut by an edge container restart, and a www host
 * that got no certificate because of a bad DNS record. No IPs, no host names, no accounts.
 * Sources: gh api (orgs, repos, properties), dtwinuz/.allstar, teletwin-web dependabot.yml,
 * wonmortech/deploy-kit README, live response headers, memory notes 2026-11-02..11-13.
 */
export default defineLesson({
  slug: "project-dtwinuz-landscape",
  level: "intermediate",
  minutes: 18,
  tier: "public",
  metrics: [
    { id: "lowest", unit: "", better: "up" },
    { id: "budget", unit: "$", better: "up" },
    { id: "prs", unit: "", better: "down" },
    { id: "denied", unit: "", better: "down" },
    { id: "cut", unit: "", better: "down" },
    { id: "nocert", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "intro",
      kind: "case",
      nodes: {
        dev: { kind: "actor", at: [0, 6] },
        gh: { kind: "service", at: [4, 6] },
      },
      edges: { push: { from: "dev", to: "gh", rate: 2, mode: "call" } },
      focus: ["dev", "gh"],
      exchange: {
        edge: "push",
        request: {
          format: "http",
          head: "GET /orgs/dtwinuz HTTP/1.1",
          headers: [
            ["Host", "api.github.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK   (selected fields)",
          body: `{
  "login": "dtwinuz",
  "plan": "free",
  "public_repos": 11,
  "total_private_repos": 19,
  "two_factor_requirement_enabled": true,
  "members_can_create_public_repositories": false,
  "default_repository_permission": "read"
}`,
        },
        marks: ["plan", "public_repos", "total_private_repos", "two_factor_requirement_enabled", "default_repository_permission"],
        masked: ["Authorization"],
      },
    },
    {
      id: "products",
      kind: "case",
      nodes: {
        g1: { kind: "client", at: [8, 0] },
        g2: { kind: "service", at: [10, 3] },
        g3: { kind: "client", at: [11, 7] },
        g4: { kind: "worker", at: [10, 11] },
        g5: { kind: "client", at: [6, 12] },
        g6: { kind: "storage", at: [1, 12] },
      },
      edges: {
        r1: { from: "gh", to: "g1", rate: 1 },
        r2: { from: "gh", to: "g2", rate: 1 },
        r3: { from: "gh", to: "g3", rate: 1 },
        r4: { from: "gh", to: "g4", rate: 1 },
        r5: { from: "gh", to: "g5", rate: 1 },
        r6: { from: "gh", to: "g6", rate: 1 },
      },
      focus: ["gh", "g1", "g2", "g3", "g4", "g5", "g6"],
      exchange: {
        edge: "r1",
        request: {
          format: "text",
          head: "dtwinuz: 30 repositories, 11 public, 19 private (private ones by their public description only)",
          body: "messaging    teletwin-web (public) | corporate Telegram server with one-click revoke | Telegram Desktop fork with a company folder\nsales        operobot2 (public), halvet (public) | auto-call robot (operobot2's predecessor) | restaurant site + Mini App | Instagram clothing shops catalog\nlife         gym-dtwin (public), mufassall (public) | prayer-based planner with an MCP server | clinical knowledge platform | Tashkent mosque map\ndev tools    self-hosted HTTP tunnels | MCP gateway for AI agents | bug capture | 3D model library | Face ID attendance | office 3D digital twin | .NET 10 + React product template\nbitg         bitg, homebrew-tap, scoop-bucket, bitg-hunspell (all public): Uzbek 2026 Latin input method\norg          .github, .allstar (public) | members-only profile | WebGL portfolio\n-- 28 projects; a backup store and an internal content repo are not projects and are left out",
        },
        marks: ["messaging", "sales", "life", "dev tools", "bitg", "org"],
      },
    },
    {
      id: "wonmortech",
      kind: "case",
      nodes: {
        g1: null,
        g2: null,
        g3: null,
        g4: null,
        g5: null,
        g6: null,
        w1: { kind: "client", at: [8, 0] },
        w2: { kind: "service", at: [11, 4] },
        w3: { kind: "client", at: [10, 10] },
        w4: { kind: "worker", at: [5, 12] },
      },
      edges: {
        o1: { from: "gh", to: "w1", rate: 1 },
        o2: { from: "gh", to: "w2", rate: 1 },
        o3: { from: "gh", to: "w3", rate: 1 },
        o4: { from: "gh", to: "w4", rate: 1 },
      },
      focus: ["gh", "w1", "w2", "w3", "w4"],
      exchange: {
        edge: "o1",
        request: {
          format: "text",
          head: "wonmortech: 13 repositories, all public, sites under *.wonmor.io",
          body: "studio       wonmor.io (Astro site, 3 languages), .github, brand, design-system (115 tokens), research (15 posts), open-source-fund (planned, not open)\ntrust        muhr (timestamp proofs), sanad (verifiable certificates), shaffof (Merkle-sealed charity reports)\npublic good  tilouz (Deaf and hearing people), uz-open-data (2,289 mosques, Cyrillic to Latin table)\nengineering  deploy-kit (zero-downtime static deploys), vutric (phone to desktop, Rust)\n-- live demos of both orgs: wonmor.io/demo/<repo>",
        },
        marks: ["studio", "trust", "public good", "engineering", "wonmor.io/demo"],
      },
    },
    {
      id: "governance",
      kind: "case",
      nodes: { w1: null, w2: null, w3: null, w4: null },
      focus: ["dev", "gh"],
      exchange: {
        edge: "push",
        request: {
          format: "http",
          head: "GET /repos/dtwinuz/teletwin-web HTTP/1.1",
          headers: [["Authorization", "***"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK   (merge settings)",
          body: `{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "squash_merge_commit_title": "PR_TITLE",
  "delete_branch_on_merge": true
}`,
        },
        marks: ["allow_squash_merge", "allow_merge_commit", "allow_rebase_merge", "squash_merge_commit_title", "delete_branch_on_merge"],
        masked: ["Authorization"],
      },
    },
    {
      id: "properties",
      kind: "case",
      focus: ["gh"],
      exchange: {
        edge: "push",
        request: {
          format: "http",
          head: "GET /repos/dtwinuz/teletwin-web/properties/values HTTP/1.1",
          headers: [["Authorization", "***"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK   (reshaped as one object)",
          body: `{
  "product": "teletwin",
  "tier": "mvp",
  "stack": ["android", "rust", "tauri", "typescript"],
  "deploy": "vps-static",
  "live_url": "https://tele.dtwin.uz"
}`,
        },
        marks: ["product", "tier", "stack", "deploy", "live_url"],
        masked: ["Authorization"],
      },
    },
    {
      id: "freeplan",
      kind: "problem",
      focus: ["gh", "dev"],
      exchange: {
        edge: "push",
        request: {
          format: "text",
          head: "POST /repos/dtwinuz/<private repo>/rulesets",
          body: "403  Upgrade to GitHub Pro or make this repository public to enable this feature.\nfree plan, private repo   no rulesets, no branch protection\n                          CODEOWNERS is read, but no review is requested\nfree plan, public repo    rulesets work: v* tags protected, PR + squash + required checks\n-- so the guard for private repos is the team permission and the habit, not the server",
        },
        marks: ["403", "private repo", "CODEOWNERS", "public repo", "v*"],
      },
    },
    {
      id: "actions",
      kind: "case",
      nodes: { actions: { kind: "worker", at: [7, 2] } },
      edges: { ci: { from: "gh", to: "actions", rate: 2, mode: "call" } },
      metrics: { budget: 22, prs: 1 },
      focus: ["gh", "actions"],
      exchange: {
        edge: "ci",
        request: {
          format: "text",
          head: "how CI minutes are paid for (one org, many private repos)",
          body: "public repos       standard runners are free\nprivate repos      2,000 Linux minutes a month included, about $12\norg budget         $10 a month on top, with stop usage on\nother budgets      Codespaces, Packages, LFS deliberately $0\nrule               one request = one branch = one PR = one CI run = one merge = one deploy\n-- every push starts a run, so pushes are batched too",
        },
        marks: ["public repos", "2,000 Linux minutes", "$10", "stop usage", "one PR"],
      },
    },
    {
      id: "supply",
      kind: "fix",
      focus: ["gh", "actions"],
      exchange: {
        edge: "ci",
        request: {
          format: "text",
          head: ".github/dependabot.yml  (teletwin-web, the org pattern)",
          body: "- package-ecosystem: github-actions    schedule: monthly   cooldown: 7 days\n  groups: actions: [\"*\"]                one PR for all action updates\n- package-ecosystem: npm               directories: [\"/\", \"/mobile\"]   grouped, monthly\n- package-ecosystem: cargo, gradle     the same shape\norg setting   sha_pinning_required: every action is pinned to a full commit SHA\nworkflows     persist-credentials: false, read-only permissions, zizmor audit",
        },
        marks: ["monthly", "cooldown", "groups", "sha_pinning_required", "zizmor"],
      },
    },
    {
      id: "ghcr",
      kind: "case",
      nodes: {
        ghcr: { kind: "storage", at: [11, 1] },
        server: { kind: "service", at: [10, 7] },
      },
      edges: {
        image: { from: "actions", to: "ghcr", rate: 1, mode: "call" },
        pull: { from: "ghcr", to: "server", rate: 1 },
      },
      focus: ["actions", "ghcr", "server"],
      exchange: {
        edge: "image",
        request: {
          format: "text",
          head: "release workflow (product template): tag vX.Y.Z -> image",
          body: "image       ghcr.io/dtwinuz/<repo>/<name>:<version>\nlabel       org.opencontainers.image.source = the repo\nattest      SBOM and build provenance pushed with the image\nscan        Trivy on the built image\nserver      docker compose pull + up; deploy property vps-ghcr\n-- a package must allow the repo's Actions to write, or the push is denied",
        },
        marks: ["image", "label", "SBOM", "Trivy", "vps-ghcr"],
      },
    },
    {
      id: "edge",
      kind: "case",
      nodes: {
        edge: { kind: "lb", at: [12, 11] },
        users: { kind: "actor", at: [7, 12] },
      },
      edges: {
        proxy: { from: "edge", to: "server", rate: 2, mode: "call" },
        visit: { from: "users", to: "edge", rate: 2, mode: "call" },
      },
      metrics: { lowest: 30 },
      focus: ["users", "edge", "server"],
      exchange: {
        edge: "visit",
        request: {
          format: "text",
          head: "one Caddy in front of every site of both orgs",
          body: "*.dtwin.uz    dtwin.uz, tele, gym, med, shop, operobot2, halvet, map, mufassall, ...\n*.wonmor.io   wonmor.io, muhr, sanad, shaffof, tilo, vutric\nbitg.uz       its own domain, same edge\ncertificates  automatic, per host, from Let's Encrypt\nrule          the edge changes only through a PR, a merge and the deploy script\n-- before 2026-11-13: one Observatory grade as low as D (30)",
        },
        marks: ["*.dtwin.uz", "*.wonmor.io", "certificates", "rule", "Observatory"],
      },
    },
    {
      id: "zerodt",
      kind: "fix",
      metrics: { cut: 0 },
      focus: ["edge", "server"],
      exchange: {
        edge: "proxy",
        request: {
          format: "text",
          head: "wonmortech/deploy-kit: a static deploy that never restarts the container",
          body: "releases/<sha>-<time>/   upload the new files beside the old ones\ncaddy validate           check the config of the new release\nmv -T new current        one rename(2): the swap is atomic\ncaddy reload             graceful: open connections keep running\nhealth check             version.txt must show the new release\nKEEP_RELEASES=3          rollback.sh points current back and reloads\n-- grace_period is deliberately unset: Caddy applies it on reload too and cuts slow downloads",
        },
        marks: ["releases", "caddy validate", "rename", "caddy reload", "KEEP_RELEASES", "grace_period"],
      },
    },
    {
      id: "headers",
      kind: "fix",
      metrics: { lowest: 100 },
      focus: ["users", "edge"],
      exchange: {
        edge: "visit",
        request: {
          format: "http",
          head: "HEAD / HTTP/1.1",
          headers: [["Host", "bitg.uz"]],
        },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          body: "Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' ...\nStrict-Transport-Security: max-age=31536000\nX-Content-Type-Options: nosniff\nX-Frame-Options: DENY\nReferrer-Policy: strict-origin-when-cross-origin\nPermissions-Policy: camera=(), microphone=(), geolocation=()\n-- /.well-known/security.txt: Contact ***, Policy = SECURITY.md, Expires 2027-11-13",
        },
        marks: ["Content-Security-Policy", "Strict-Transport-Security", "nosniff", "DENY", "security.txt"],
      },
    },
    {
      id: "openssf",
      kind: "case",
      nodes: { openssf: { kind: "external", at: [2, 11] } },
      edges: { scan: { from: "openssf", to: "gh", rate: 1, mode: "async" } },
      focus: ["openssf", "gh"],
      exchange: {
        edge: "scan",
        request: {
          format: "text",
          head: "dtwinuz/.allstar: org-wide policies, issues filed on the repo",
          body: "allstar.yaml          optOutPrivateRepos: true   archived and forked repos out too\nscorecard.yaml        checks: Token-Permissions, Vulnerabilities   threshold: 8\nbinary_artifacts.yaml ignoreFiles: gradle-wrapper.jar + 3 upstream wasm files, each with a known source\nalso                  branch protection, CODEOWNERS, dangerous workflows, secret scanning\nbadges                bitg: Best Practices Gold | muhr, sanad, shaffof: Silver",
        },
        marks: ["optOutPrivateRepos", "Token-Permissions", "threshold", "ignoreFiles", "Gold"],
      },
    },
    {
      id: "demo",
      kind: "case",
      focus: ["actions", "users", "edge"],
      exchange: {
        edge: "visit",
        request: {
          format: "text",
          head: "the demo standard, applied to every project",
          body: "same UI      the real app built with --mode demo, API answered by an in-browser mock\nhonest      a demo badge, fake names, +998 00 phone numbers, changes reset on reload\nchecked     Playwright smoke tests open every page\nscreens     README screenshots are generated by Playwright, never taken by hand\nhosted      wonmor.io/demo/<repo>, also for private repos\n-- the production bundle contains none of the mock code",
        },
        marks: ["--mode demo", "honest", "Playwright", "screenshots", "wonmor.io/demo"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "budget-out",
      from: "actions",
      steps: [
        {
          id: "ci-stop",
          kind: "problem",
          edges: { ci: { flow: "fail" } },
          metrics: { budget: 0 },
          focus: ["gh", "actions"],
          exchange: {
            edge: "ci",
            request: {
              format: "text",
              head: "2026-11-01 .. 11-04: every private repo, every workflow",
              body: "The job was not started because recent account payments have failed\nor your spending limit needs to be increased.\n-- the free minutes for private repos were used up and the org budget was $0\n-- the message mentions payments, but the cause was the limit",
            },
            marks: ["spending limit", "free minutes", "$0", "payments"],
          },
        },
        {
          id: "budget-set",
          kind: "fix",
          edges: { ci: { flow: "request" } },
          metrics: { budget: 22 },
          focus: ["gh", "actions"],
          exchange: {
            edge: "ci",
            request: {
              format: "text",
              head: "2026-11-05: a card on the org, a budget, and a way to read it",
              body: "Actions budget   $10 a month, stop usage on\nincluded         2,000 Linux minutes for private repos\nread it          GET /organizations/dtwinuz/settings/billing/budgets\n                 GET /organizations/dtwinuz/settings/billing/usage?year=&month=\n-- when CI stops, read the budget and the usage first",
            },
            marks: ["$10", "stop usage", "budgets", "usage"],
          },
        },
        {
          id: "pr-flood",
          kind: "problem",
          edges: { ci: { flow: "dup", rate: 3 } },
          metrics: { prs: 12 },
          focus: ["dev", "gh", "actions"],
          exchange: {
            edge: "ci",
            request: {
              format: "text",
              head: "2026-11-06, the office 3D twin repo: one request, 12 pull requests",
              body: "PR #140 .. #151     one small change each\nper PR              4 jobs, the e2e job alone 10 to 15 minutes\nper merge           one more run on main\n-- 12 PRs x 4 jobs + 12 runs on main, from one request",
            },
            marks: ["#140", "4 jobs", "e2e", "12 PRs"],
          },
        },
        {
          id: "one-pr",
          kind: "fix",
          edges: { ci: { flow: "request", rate: 1 } },
          metrics: { prs: 1 },
          focus: ["dev", "gh", "actions"],
        },
      ],
    },
    {
      id: "ghcr-denied",
      from: "ghcr",
      steps: [
        {
          id: "push-denied",
          kind: "problem",
          edges: { image: { flow: "fail" } },
          metrics: { denied: 5 },
          focus: ["actions", "ghcr"],
          exchange: {
            edge: "image",
            request: {
              format: "text",
              head: "release workflow, tag v0.4.0 of the shop repo, after the move to the org",
              body: "docker push ghcr.io/dtwinuz/<repo>/web:0.4.0\ndenied: permission_denied: read_package\n-- the images were copied into the org by hand: 5 packages, repository = none\n-- pushing again with the org.opencontainers.image.source label did not link them",
            },
            marks: ["docker push", "permission_denied", "repository", "label"],
          },
        },
        {
          id: "push-ok",
          kind: "fix",
          edges: { image: { flow: "request" } },
          metrics: { denied: 0 },
          focus: ["ghcr", "actions"],
          exchange: {
            edge: "image",
            request: {
              format: "text",
              head: "the fix exists only in the web UI",
              body: "Package settings -> Manage Actions access -> Add repository -> role Write\n(no REST or GraphQL endpoint for this setting)\n-- do not retry the release: it fails the same way until the package is linked",
            },
            marks: ["Manage Actions access", "Write", "GraphQL", "retry"],
          },
        },
      ],
    },
    {
      id: "edge-cut",
      from: "edge",
      steps: [
        {
          id: "cut-791",
          kind: "problem",
          edges: { visit: { flow: "fail", cut: true } },
          metrics: { cut: 1 },
          focus: ["users", "edge"],
          exchange: {
            edge: "visit",
            request: {
              format: "text",
              head: "2026-11-12, 20:43 UTC: a deploy of another site recreates the edge container",
              body: "GET /bitg-0.x-x64.msi      the download stops at 791 KB\ncause      docker compose up recreated the shared edge for a config change\n           every open connection of every site dropped with it\n-- a second cut 3 minutes later came from the client network, not the edge",
            },
            marks: ["791 KB", "recreated", "every open connection", "client network"],
          },
        },
        {
          id: "cut-fix",
          kind: "fix",
          edges: { visit: { flow: "request", cut: false } },
          metrics: { cut: 0 },
          focus: ["edge", "server", "users"],
          exchange: {
            edge: "proxy",
            request: {
              format: "text",
              head: "2026-11-13: releases + symlink + caddy reload for the edge and the bitg site",
              body: "the container is recreated only when the compose file or .env changes\nnew site files   releases/<sha> -> mv -T -> caddy reload\nproof            a 76 s MSI download during an edge deploy finished, sha256 matched\n                 the container start time did not change",
            },
            marks: ["compose file", "mv -T", "76 s", "sha256"],
          },
        },
      ],
    },
    {
      id: "www-cert",
      from: "headers",
      steps: [
        {
          id: "www-nx",
          kind: "problem",
          edges: { visit: { flow: "fail" } },
          metrics: { nocert: 1 },
          focus: ["users", "edge"],
          exchange: {
            edge: "visit",
            request: {
              format: "text",
              head: "www.bitg.uz: the edge was ready, the name did not exist",
              body: "DNS       www added as a CNAME whose value was an IP address\nresolver  NXDOMAIN: a CNAME must point to a name\nACME      the certificate authority cannot reach www, so no certificate\nCaddy     retries with a growing backoff",
            },
            marks: ["CNAME", "NXDOMAIN", "ACME", "backoff"],
          },
        },
        {
          id: "www-fix",
          kind: "fix",
          edges: { visit: { flow: "request" } },
          metrics: { nocert: 0 },
          focus: ["edge", "users"],
          exchange: {
            edge: "visit",
            request: {
              format: "text",
              head: "fix the record, then wake the edge up",
              body: "DNS       delete the CNAME, add an A record for www\nCaddy     still waiting in backoff: caddy reload --force\nresult    certificate issued within about 10 s\nwww       301 to https://bitg.uz, the one canonical host",
            },
            marks: ["A record", "--force", "10 s", "301"],
          },
        },
      ],
    },
  ],
});
