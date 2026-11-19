import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: the dtwinuz landscape",
  summary:
    "Two GitHub organisations hold every project: dtwinuz (products, tools and the bitg input method) and wonmortech (the studio site, open trust tools and public-good projects). This lesson treats them as one delivery system. It shows what lives there, grouped by kind, and how the orgs are governed: teams, CODEOWNERS, squash-only merges, custom properties and the limits of the Free plan. Then it follows the path of a change: CI paid for by a small Actions budget, a supply chain with pinned actions and grouped Dependabot, images in GHCR, one shared edge proxy with zero-downtime deploys and A+ security headers, OpenSSF checks and the demo standard. The scenarios are real org-level incidents.",
  learn: [
    "What the two orgs contain, grouped by kind, and why private repos appear here only by their public description",
    "Governance on a Free plan: teams, CODEOWNERS, squash-only merges, custom properties, and what private repos do not get",
    "How a small Actions budget shapes the workflow: one request, one PR, one CI run",
    "The supply chain: SHA-pinned actions, monthly grouped Dependabot with a cooldown, GHCR images with SBOM and provenance",
    "One shared edge proxy for every site: atomic symlink deploys, enforced CSP and security.txt, and the incidents that led there",
  ],
  nodes: {
    dev: "Developer",
    gh: "GitHub orgs",
    g1: "Messaging",
    g2: "Sales, business",
    g3: "Life, learning",
    g4: "Dev, ops tools",
    g5: "bitg",
    g6: "Org files",
    w1: "Studio, brand",
    w2: "Open trust",
    w3: "Public good",
    w4: "Engineering",
    actions: "GitHub Actions",
    ghcr: "GHCR",
    server: "Server",
    edge: "Edge Caddy",
    users: "Visitors",
    openssf: "OpenSSF",
  },
  metrics: {
    lowest: "Lowest Observatory score of the sites",
    budget: "Monthly CI money available",
    prs: "PRs for one request",
    denied: "Packages that deny release pushes",
    cut: "Downloads cut by a deploy",
    nocert: "Hosts without a certificate",
  },
  steps: {
    intro: {
      short: "Two orgs",
      title: "Two organisations, one delivery system",
      body: "dtwinuz holds the products: corporate messaging, sales tools, personal apps, developer tools and the bitg input method for the 2026 Uzbek Latin alphabet. wonmortech holds the studio: the wonmor.io site, the design system, open trust tools and public-good projects. Both use the same rules, the same CI patterns, the same edge proxy and the same demo standard.\n\ndtwinuz is on the Free plan with 30 repositories, 11 public and 19 private. Two-factor authentication is required for every member, members cannot create public repositories, and the default permission is read. Write access comes only through teams.",
      fields: {
        plan: "Free: no paid seats, and that decides what private repos can enforce.",
        public_repos: "11 public: their code, issues and pages are open.",
        total_private_repos: "19 private: this lesson shows them only by their public one-line description.",
        two_factor_requirement_enabled: "A member without 2FA is removed from the org.",
        default_repository_permission: "read: write comes only through a team.",
      },
    },
    products: {
      short: "dtwinuz",
      title: "What dtwinuz holds, grouped by kind",
      body: "Every dtwinuz project, by kind. Messaging: TeleTwin, a corporate Telegram with a company folder, as a server, a web client and a desktop client. Sales and business: the operobot2 AI sales service and its predecessor, a restaurant site, a builder's site, a clothing catalog. Life and learning: a prayer-based planner, a training log, a clinical knowledge base, a mosque map and this course platform. Developer and ops tools: tunnels, an MCP gateway, bug capture, a 3D model library, attendance, an office digital twin and a product template. bitg and its packaging. Org files.\n\nPrivate repositories appear only by the description that is already public on the org page. Two repositories are not projects (a backup store and an internal content repo) and are left out.",
      fields: {
        messaging: "TeleTwin: the web client is public, the server and the desktop fork are private.",
        sales: "operobot2 and halvet are public; the others are private.",
        life: "gym-dtwin and mufassall are public.",
        "dev tools": "All private; their demos are public at wonmor.io/demo.",
        bitg: "The most open project: input method, Homebrew tap, Scoop bucket, Hunspell dictionary.",
        org: "Profile and community files, Allstar policies, a members-only profile, a portfolio.",
      },
    },
    wonmortech: {
      short: "wonmortech",
      title: "What wonmortech holds: everything public",
      body: "All 13 wonmortech repositories are public. The studio group is the wonmor.io site in three languages, the org profile, the brand, the design tokens, the research notes behind the site's posts and a planned open-source fund that is not open yet. The trust group has three tools: muhr (timestamp proofs anchored to Bitcoin and a public Merkle log), sanad (verifiable certificates) and shaffof (Merkle-sealed charity reports). Public good: tilouz for Deaf and hearing people, and uz-open-data. Engineering: deploy-kit and vutric.\n\nThe live demos of both orgs, including the private dtwinuz projects, are served under wonmor.io/demo.",
      fields: {
        studio: "The public face: site, brand, tokens and the research behind each post.",
        trust: "No tokens, no money handled: open proofs anyone can check.",
        "public good": "Non-profit projects with open data.",
        engineering: "Reusable pieces: deploy-kit is the edge deploy pattern of this lesson.",
        "wonmor.io/demo": "One place for every live demo, also of private repos.",
      },
    },
    governance: {
      short: "Rules",
      title: "Governance: teams, CODEOWNERS, squash-only",
      body: "Three teams carry all permissions: core (admin), maintainers (maintain) and contributors (write). Every repo has `CODEOWNERS` with `* @dtwinuz/core`, so core owns every path. Merges are squash-only: merge commits and rebase merges are switched off, the squash title is the PR title, and the branch is deleted after the merge. One PR becomes one commit on the main branch, with a readable history and an easy revert.\n\nThe repo settings show it directly, here for teletwin-web.",
      check: {
        q: "Why squash-only with the PR title as the commit title?",
        options: [
          "It makes the repository smaller",
          "One PR is one commit on main: the history reads like the PR list, and one revert undoes one change",
          "GitHub requires it on the Free plan",
        ],
        answer: 1,
        why: "Work in progress commits stay in the PR. The main branch keeps one reviewed unit per commit, which is what a revert or a bisect needs.",
      },
      fields: {
        allow_squash_merge: "The only merge button left.",
        allow_merge_commit: "Off: no merge bubbles on main.",
        allow_rebase_merge: "Off: individual work-in-progress commits never land on main.",
        squash_merge_commit_title: "PR_TITLE: the reviewed title becomes the commit title.",
        delete_branch_on_merge: "Merged branches disappear on their own.",
      },
    },
    properties: {
      short: "Properties",
      title: "Custom properties, issue types and Projects",
      body: "Each repo carries five org-level custom properties: product, tier (production, mvp, prototype or internal), stack, deploy (vps-compose, vps-ghcr, vps-static, client-release or none) and live_url. They answer at a glance what a repo is, how mature it is and how it ships, and they can be filtered across the org. wonmortech uses the same idea with kind, tier, stack, deploy and live_url.\n\nIssue types are defined once for the org: Task, Bug, Feature, Epic, Security, Docs and Chore. Org-level Projects boards track the bigger products, one board each.",
      fields: {
        product: "Groups the repos of one product, for example the three TeleTwin repos.",
        tier: "mvp here: live and used, still growing.",
        stack: "A multi-select: this repo is TypeScript plus a Rust shell and Android.",
        deploy: "vps-static: a static build behind the edge proxy.",
        live_url: "Where the product runs.",
      },
    },
    freeplan: {
      short: "Free plan",
      title: "What the Free plan does not give private repos",
      body: "On the Free plan, rulesets and branch protection work only on public repositories. A private repo answers 403 to a ruleset request, and CODEOWNERS there is read but no review is requested. So on public repos the server enforces the rules: protected `v*` release tags, PRs with squash and required checks. On private repos, the guard is team permissions, CODEOWNERS as documentation and the habit of going through a PR.\n\nThis is a known trade: the org pays for CI minutes, not for seats.",
      check: {
        q: "Where can a release tag be protected so nobody can move it?",
        options: [
          "In any repo, private or public",
          "Only in public repos on this plan: private ones get 403 for rulesets",
          "Nowhere, tags can always be moved",
        ],
        answer: 1,
        why: "Rulesets on private repos need a paid plan. teletwin-web, being public, protects its v* tags; a private repo must rely on process.",
      },
      fields: {
        "403": "The API refuses the ruleset for a private repo.",
        "private repo": "Team permissions and habit, not server rules.",
        CODEOWNERS: "Still useful as a map of who owns what.",
        "public repo": "Full rulesets, the same as on a paid plan.",
        "v*": "Release tags that can't be moved or deleted.",
      },
    },
    actions: {
      short: "CI budget",
      title: "CI money: a small budget and one PR per request",
      body: "Public repos run on free runners. Private repos get 2,000 Linux minutes a month included, about $12, and the org adds a $10 budget with stop usage on, so a runaway workflow stops instead of billing. Codespaces, Packages and LFS budgets are deliberately $0.\n\nThe budget makes a workflow rule: one request goes into one branch, one PR, one CI run, one merge and one deploy. Commits are grouped on the branch, and pushes are batched too, because every push starts a run.",
      check: {
        q: "A request needs six small fixes in one private repo with a 4-job CI. What is the cheapest correct way?",
        options: [
          "Six PRs, one per fix, so each is easy to review",
          "One branch with six commits and one PR, described section by section",
          "Push each fix straight to main",
        ],
        answer: 1,
        why: "Six PRs cost six full CI runs plus six runs on main. One PR keeps the commits separate for review and costs one run.",
      },
      fields: {
        "public repos": "Standard runners cost nothing.",
        "2,000 Linux minutes": "The monthly allowance for private repos.",
        $10: "The org's own monthly budget for Actions.",
        "stop usage": "When the budget is spent, jobs stop instead of billing more.",
        "one PR": "The rule that keeps the minutes inside the budget.",
      },
    },
    supply: {
      short: "Supply chain",
      title: "Supply chain: pinned actions and calm dependency updates",
      body: "The org requires every action to be pinned to a full commit SHA (`sha_pinning_required`), so a moved tag cannot change what a workflow runs. Workflows check out with `persist-credentials: false`, keep read-only permissions unless a job needs more, and are audited with zizmor.\n\nDependabot runs monthly, grouped per ecosystem, with a 7-day cooldown: one PR for all action updates, one for npm, one for cargo, one for gradle, and no version younger than a week. Fewer PRs also means fewer CI runs.",
      fields: {
        monthly: "One update round a month instead of a stream of small PRs.",
        cooldown: "A new release must be 7 days old before Dependabot proposes it.",
        groups: "All updates of one ecosystem in one PR.",
        sha_pinning_required: "Org setting: a workflow with an unpinned action does not run.",
        zizmor: "Static audit of workflow files for risky patterns.",
      },
    },
    ghcr: {
      short: "GHCR",
      title: "Images in GHCR, with SBOM and provenance",
      body: "Products that ship as containers build their image in the release workflow and push it to GitHub Container Registry as `ghcr.io/dtwinuz/<repo>/<name>`. The product template sets the source label, attaches an SBOM and build provenance, and scans the image with Trivy. The server only pulls and restarts with Docker Compose; this is the `vps-ghcr` deploy property.\n\nOne detail matters: a package must give the repo's Actions write access, or the push is denied. The scenario shows what happened when packages were moved into the org by hand.",
      check: {
        q: "What does the build provenance attached to an image prove?",
        options: [
          "That the image has no vulnerabilities",
          "Which workflow run and commit built this exact image",
          "That the server pulled it",
        ],
        answer: 1,
        why: "Provenance is a signed statement about how the artifact was built. The Trivy scan, not provenance, looks for known vulnerabilities.",
      },
      fields: {
        image: "One name pattern for every product image.",
        label: "org.opencontainers.image.source ties the image to its repo.",
        SBOM: "A list of every package inside the image.",
        Trivy: "Scans the built image for known vulnerabilities.",
        "vps-ghcr": "The deploy property for products shipped this way.",
      },
    },
    edge: {
      short: "Edge",
      title: "One edge proxy for every site",
      body: "One Caddy instance sits in front of every site of both orgs: the *.dtwin.uz products, the *.wonmor.io studio sites and bitg.uz on its own domain. It gets a certificate per host automatically and routes each host to its container over a private Docker network; the containers have no public ports.\n\nBecause the edge is shared, a mistake there affects every site at once. So the edge changes only through a PR, a merge and its deploy script; hand edits on the server are not allowed. Before 2026-11-13 the security headers differed per site, and one site scored only D (30) on Mozilla Observatory.",
      fields: {
        "*.dtwin.uz": "The product sites.",
        "*.wonmor.io": "The studio and the trust tools.",
        certificates: "Issued and renewed by Caddy per host.",
        rule: "Edge changes go PR, merge, deploy: never a hand edit.",
        Observatory: "Mozilla's header scanner: the lowest site was a D.",
      },
    },
    zerodt: {
      short: "No restarts",
      title: "Zero-downtime static deploys: releases and one symlink",
      body: "The public `wonmortech/deploy-kit` describes the pattern the edge and the static sites now use. A release is uploaded into its own folder beside the old one. Caddy validates the config of the new release. Then `mv -T` swaps the `current` symlink in one atomic rename, and `caddy reload` applies it gracefully: open connections keep running on the old files. A health check reads `version.txt` to confirm the new release. The last three releases stay, so rollback is one more symlink swap and reload.\n\n`grace_period` is deliberately unset, because Caddy applies it on reload too and would cut slow downloads.",
      check: {
        q: "Why swap a symlink instead of copying the new files over the old ones?",
        options: [
          "Copying is slower on Linux",
          "A rename is atomic: a visitor sees the whole old release or the whole new one, never a mix, and rollback is one more rename",
          "Caddy can't serve copied files",
        ],
        answer: 1,
        why: "Copying file by file leaves a window with half-new pages and old assets. rename(2) replaces the link in one step.",
      },
      fields: {
        releases: "One folder per release, named by commit and time.",
        "caddy validate": "A broken config never goes live.",
        rename: "rename(2) is atomic on the same file system.",
        "caddy reload": "Graceful: no restart, no dropped connections.",
        KEEP_RELEASES: "3: enough for a fast rollback.",
        grace_period: "Left unset on purpose: it would end long downloads.",
      },
    },
    headers: {
      short: "Headers",
      title: "Security headers: enforced CSP and security.txt everywhere",
      body: "Edge PR #336 (2026-11-13) gave every site an enforced Content Security Policy and a `security.txt`, using shared Caddy snippets. HSTS, nosniff, frame denial, a strict referrer policy and a permissions policy come with them. The Observatory grades moved from C, D, B and B+ to A+ on every site, with the lowest score now 100.\n\nThe response of bitg.uz shows the set. Each site's CSP lists only what that site loads; bitg.uz allows WebAssembly for its in-browser converter and its analytics host.",
      fields: {
        "Content-Security-Policy": "Enforced, not report-only: a script from another origin does not run.",
        "Strict-Transport-Security": "Browsers use HTTPS only for a year.",
        nosniff: "The browser trusts the declared content type.",
        DENY: "No site may frame these pages.",
        "security.txt": "Where to report a vulnerability, with an expiry date to renew.",
      },
    },
    openssf: {
      short: "OpenSSF",
      title: "OpenSSF: Allstar, Scorecard and badges",
      body: "OpenSSF Allstar watches every public dtwinuz repo with policies kept in `dtwinuz/.allstar`. Private, archived and forked repos opt out. The Scorecard policy files an issue when Token-Permissions or Vulnerabilities score below 8. The binary-artifacts policy allows four named files, each with a known upstream source: the Gradle wrapper and three WebAssembly builds shipped by upstream Telegram Web A. Other policies cover branch protection, CODEOWNERS, dangerous workflows and secret scanning.\n\nOn top of that, projects earn the OpenSSF Best Practices badge: bitg reached Gold, and muhr, sanad and shaffof reached Silver.",
      check: {
        q: "Why name each allowed binary file instead of switching the binary-artifacts check off?",
        options: [
          "Allstar can't be switched off",
          "Any new binary still raises an issue; only files with a known, documented source are allowed",
          "Named files are smaller",
        ],
        answer: 1,
        why: "A blanket opt-out would hide a binary slipped into a PR. A short named list keeps the alarm for everything else.",
      },
      fields: {
        optOutPrivateRepos: "Allstar watches public repos only.",
        "Token-Permissions": "Workflows must not ask for more token rights than they need.",
        threshold: "8: a score under it opens an issue on the repo.",
        ignoreFiles: "The four allowed binaries, each with its source written next to it.",
        Gold: "The highest Best Practices level, held by bitg.",
      },
    },
    demo: {
      short: "Demo standard",
      title: "The demo standard: every project shows itself honestly",
      body: "Every project gets a live demo that is the real UI, not a mock-up: the app is built with `--mode demo`, and its API is answered in the browser by a mock with realistic data. The demo is honest: a demo badge, made-up names, `+998 00` phone numbers no subscriber has, and changes that reset on reload. Playwright smoke tests open every page, and the README screenshots are generated by Playwright too, never taken by hand.\n\nDemos are served under wonmor.io/demo/<repo>, also for private repos, so a project can be seen without opening its code. The production bundle contains none of the mock.",
      fields: {
        "--mode demo": "The only build that includes the mock code.",
        honest: "Realistic, but never pretending to be real customers.",
        Playwright: "Smoke tests keep the demo working after each change.",
        screenshots: "Regenerated from the demo, so they never go stale.",
        "wonmor.io/demo": "The public showcase for both orgs.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "What to take from the landscape.\n\n1) Two orgs, one system: the same rules, CI patterns, edge and demo standard. 2) Write access through teams only, CODEOWNERS everywhere, squash-only merges with PR titles. 3) Know the plan: on Free, only public repos get server-enforced rulesets; private repos rely on permissions and process. 4) Treat CI minutes as money: a small budget with stop usage, one request per PR, batched pushes. 5) Pin every action to a SHA and update dependencies monthly, grouped, with a cooldown. 6) Ship images with SBOM and provenance, and link packages to the repos that push them. 7) One shared edge changes only through PRs; static deploys swap a symlink and reload, never restart. 8) Enforced CSP, security.txt, Allstar and Scorecard on every public repo and site. 9) A real, honest demo for every project, kept working by tests.",
    },
  },
  scenarios: {
    "budget-out": {
      label: "CI stopped",
      steps: {
        "ci-stop": {
          short: "$0",
          title: "Every private repo's CI stops for four days",
          body: "From 2026-11-01 to 11-04, no job started in any private dtwinuz repo. The message spoke of failed payments or a spending limit. The real cause was the limit: the included minutes for private repos were used up, and the org budget was $0, so nothing more could run.",
          check: {
            q: "The job message mentions failed payments. What should be checked first?",
            options: [
              "The org's budget and this month's usage, through the billing API",
              "The workflow YAML",
              "The runner labels",
            ],
            answer: 0,
            why: "The same message covers both causes. Reading the budget and the usage tells in a minute whether the limit or a payment is the problem.",
          },
          fields: {
            "spending limit": "The part of the message that was true.",
            "free minutes": "The included minutes for private repos ran out.",
            $0: "The org budget at the time: nothing above the free minutes.",
            payments: "Mentioned by the message, but not the cause.",
          },
        },
        "budget-set": {
          short: "Budget",
          title: "A card, a $10 budget, and a way to read it",
          body: "On 2026-11-05 a card was added to the org and an Actions budget of $10 a month was set, with stop usage on. Together with the included minutes that is about $22 of CI a month. The budget and the usage can be read through the billing API, which is now the first step when CI stops.",
          fields: {
            $10: "The new monthly budget for Actions.",
            "stop usage": "Keeps a runaway workflow from billing more.",
            budgets: "The API that shows the budget.",
            usage: "The API that shows what was spent this month.",
          },
        },
        "pr-flood": {
          short: "12 PRs",
          title: "One request becomes 12 pull requests",
          body: "On 2026-11-06, one request in the office 3D twin repo was split into 12 PRs, #140 to #151. Each PR ran 4 jobs, and the e2e job alone took 10 to 15 minutes. Each merge started one more run on main. A small budget does not survive that.",
          fields: {
            "#140": "The first of 12 PRs, #140 to #151, from one request.",
            "4 jobs": "Per PR, including e2e.",
            e2e: "The browser test job, 10 to 15 minutes each.",
            "12 PRs": "Twelve full runs, plus twelve runs on main.",
          },
        },
        "one-pr": {
          short: "One PR",
          title: "The rule: one request, one PR",
          body: "The owner's rule since then: all work of one request goes into one branch with separate commits and one PR, described section by section. Tests run locally first, pushes are batched, and a flaky CI is rerun for the failed jobs only. One request now costs one CI run, one merge and one deploy.",
        },
      },
    },
    "ghcr-denied": {
      label: "GHCR 403",
      steps: {
        "push-denied": {
          short: "Denied",
          title: "A release push is denied after the move to the org",
          body: "After the repos moved to the dtwinuz org, five container packages were copied into it by hand. None of them was linked to a repository. The next release, v0.4.0 of the shop repo, failed at the push with `denied: permission_denied: read_package`. Pushing again with the source label did not link the package either.",
          check: {
            q: "The release failed with permission_denied on a hand-copied package. Should the run be retried?",
            options: [
              "Yes, it is a temporary registry error",
              "No: it fails the same way until the package gives the repo's Actions write access",
              "Yes, but with a new tag",
            ],
            answer: 1,
            why: "The error is about package permissions, not the network. Nothing in the workflow can change it; a setting on the package must.",
          },
          fields: {
            "docker push": "The release job's last step.",
            permission_denied: "The package does not let this repo's Actions write.",
            repository: "none: the copied package is linked to no repo.",
            label: "The source label links new packages, not existing ones.",
          },
        },
        "push-ok": {
          short: "UI fix",
          title: "Link the package in the web UI",
          body: "The fix exists only in the web UI: package settings, Manage Actions access, add the repository with the Write role. There is no REST or GraphQL endpoint for it. Once each of the five packages had its repo added, release pushes worked again.",
          fields: {
            "Manage Actions access": "The package setting that lists which repos may push.",
            Write: "The role the release workflow needs.",
            GraphQL: "Neither API can change this setting.",
            retry: "Pointless until the setting changes.",
          },
        },
      },
    },
    "edge-cut": {
      label: "Cut download",
      steps: {
        "cut-791": {
          short: "791 KB",
          title: "A deploy of one site cuts a download on another",
          body: "On 2026-11-12 at 20:43 UTC, the deploy of another site recreated the shared edge container for a configuration change. Every open connection of every site dropped with it, and a bitg installer download stopped at 791 KB. A second cut three minutes later came from the client's own network, not from the edge.",
          check: {
            q: "Why did a deploy of an unrelated site cut a bitg.uz download?",
            options: [
              "The two sites share a domain",
              "Both are served by the same edge container, and the deploy recreated that container",
              "The download was too large",
            ],
            answer: 1,
            why: "A shared proxy shares its restarts. Recreating it is a restart for every site behind it.",
          },
          fields: {
            "791 KB": "Where the installer download stopped.",
            recreated: "docker compose replaced the container for a config change.",
            "every open connection": "All sites lose their live connections at once.",
            "client network": "The second cut had another cause; the logs showed a client timeout.",
          },
        },
        "cut-fix": {
          short: "Reload",
          title: "Never recreate the edge for a content change",
          body: "From 2026-11-13 the edge and the bitg site deploy with releases, a symlink and `caddy reload`. The container is recreated only when its compose file or environment changes. The proof was taken in production: a 76-second installer download during an edge deploy finished, its sha256 matched, and the container's start time did not change.",
          fields: {
            "compose file": "The only reason left to recreate the container.",
            "mv -T": "The atomic swap of the current symlink.",
            "76 s": "A long download that survived a deploy.",
            sha256: "The file arrived complete and unchanged.",
          },
        },
      },
    },
    "www-cert": {
      label: "www without TLS",
      steps: {
        "www-nx": {
          short: "NXDOMAIN",
          title: "The edge is ready, but www does not exist",
          body: "www.bitg.uz was configured on the edge to redirect to bitg.uz, but the DNS record for www was a CNAME whose value was an IP address. A CNAME must point to a name, so resolvers answered NXDOMAIN. The certificate authority could not reach www, Caddy could not get a certificate, and it went into a retry backoff.",
          check: {
            q: "What is wrong with a CNAME record whose value is an IP address?",
            options: [
              "Nothing, it works like an A record",
              "A CNAME must name another host; an IP there does not resolve, so the name fails",
              "It works only for www",
            ],
            answer: 1,
            why: "An address belongs in an A (or AAAA) record. A CNAME is an alias to another name.",
          },
          fields: {
            CNAME: "An alias to another name, never to an address.",
            NXDOMAIN: "The resolver says the name does not exist.",
            ACME: "The protocol Caddy uses to get certificates; it needs the name to resolve.",
            backoff: "Caddy waits longer between each failed attempt.",
          },
        },
        "www-fix": {
          short: "A record",
          title: "Fix the record, then wake the edge up",
          body: "The CNAME was deleted and an A record for www added. Caddy was still waiting in its backoff, so a forced reload of its config made it try at once, and the certificate was issued within about 10 seconds. www now answers 301 to https://bitg.uz, the single canonical host.",
          fields: {
            "A record": "The right record type for an address.",
            "--force": "Reloads even an unchanged config, which restarts the certificate attempt.",
            "10 s": "From reload to a valid certificate.",
            "301": "A permanent redirect to the canonical host.",
          },
        },
      },
    },
  },
};

export default text;
