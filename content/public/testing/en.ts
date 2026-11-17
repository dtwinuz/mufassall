import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Testing",
  summary:
    "A small shop ships every change straight to customers, and customers find the bugs. We add tests layer by layer, see what each layer catches and misses, and make CI the gate before deploy.",
  learn: [
    "The test pyramid: many fast unit tests, fewer integration tests, a handful of end-to-end tests",
    "Why a mocked database hides real bugs, and how a real database in a container finds them",
    "Contract tests: catching a broken API between two teams before deploy",
    "What makes a test flaky, and how CI turns tests into a deploy gate",
  ],
  nodes: {
    dev: "Developer",
    shopper: "Customer",
    orders: "Orders service",
    pricing: "Pricing service",
    db: "Database",
    ci: "CI runner",
    testdb: "Test database",
    browser: "Test browser",
  },
  metrics: {
    escaped: "Bugs that reached customers",
    "ci-time": "CI run time",
    flaky: "Flaky runs",
  },
  steps: {
    "no-tests": {
      short: "No tests",
      title: "Customers are the test suite",
      body: "A developer changes the discount code and deploys it straight from the laptop. Nothing runs before the deploy.\n\nThe first customer with a promo code pays 2 580 instead of 23 220. Support finds out an hour later. Nine bugs reached customers last month, all found this way.",
      fields: {
        promo: "A 10% discount code. The changed code path.",
        subtotal: "Two items at 12 900. Correct.",
        discount: "10% of the subtotal. Also correct.",
        total: "Should be subtotal minus discount. The code returned the discount itself.",
      },
    },
    unit: {
      short: "Unit",
      title: "Unit tests: one function, milliseconds",
      body: "The price math now has unit tests: plain inputs in, expected numbers out. No network, no database. Fourteen of them run in under a second on every push.\n\nThe discount bug would have failed here before anyone deployed it. Unit tests are the wide base of the pyramid: cheap, fast, many.",
      fields: {
        FAIL: "The file has a failing test. The push is marked red.",
        expected: "What the test says the answer must be, next to what the code returned.",
        Tests: "One failure out of fourteen is enough to stop the change.",
        Time: "Under a second. Fast tests get run; slow ones get skipped.",
      },
    },
    "mock-lies": {
      short: "Mock lies",
      title: "Green tests, broken database call",
      body: "The orders code saves with `ON CONFLICT`, so a repeated order is ignored. In unit tests the database was a fake object in memory that accepted anything.\n\nThe real database has no unique index on `order_no`, so it rejects the query. Every order fails, and all tests are green.",
      watch: "A mock only knows what you told it. It cannot tell you that you were wrong about the real thing.",
      fields: {
        "ON CONFLICT": "Needs a unique index on the listed column. The fake never checked that.",
        ERROR: "The real database refuses the whole query. The order is not saved.",
      },
    },
    integration: {
      short: "Integration",
      title: "Integration tests with a real database in a container",
      body: "CI now starts a real database in a throwaway container, applies the same migrations as production and runs the repository code against it.\n\nThe missing index shows up on the first run, and the fix ships as a migration. The cost: CI goes from 20 seconds to over a minute and a half. That is why there are fewer of these tests.",
      fields: {
        container: "Same database engine and version as production, created fresh for this run.",
        migrations: "The real schema, built the same way production builds it.",
        FAIL: "Found before deploy: the query and the schema do not match.",
        PASS: "36 tests against a real database. Slower than unit tests, still minutes, not hours.",
      },
    },
    "contract-break": {
      short: "API break",
      title: "Another team renamed a field",
      body: "The pricing team renamed `price` to `unit_amount`. Their tests pass: they test their own code. The orders tests pass too: they use a stub of the old pricing answer.\n\nIn production the orders service reads a missing field and every checkout fails. Both teams were green, and the bug lived between them.",
      fields: {
        unit_amount: "The new name. Orders still reads `price`, which is now missing.",
        currency: "Unchanged. Only one field moved, and that was enough.",
      },
    },
    contract: {
      short: "Contract",
      title: "Contract tests between services",
      body: "The orders team writes down what it needs from pricing: this request, a `price` field that is an integer. That file is the contract.\n\nThe pricing CI checks every build against all its consumers' contracts. A rename that breaks orders now fails in the pricing pipeline, before its deploy, and the two teams talk first.",
      fields: {
        consumer: "The service that calls the API and wrote down its needs.",
        provider: "The service under check: the exact build that wants to deploy.",
        FAILED: "The new build does not give what the consumer relies on.",
        blocked: "The break stops in CI, not in production.",
      },
    },
    e2e: {
      short: "End-to-end",
      title: "A few end-to-end tests drive a real browser",
      body: "CI starts a browser and goes through checkout like a person: open the cart, press Pay, wait for the confirmation. It goes through every service at once.\n\nThis is the top of the pyramid. One test checks a lot, but it is slow and has many moving parts, so only the main user paths get one. CI now takes almost four minutes.",
      fields: {
        open: "The browser loads a real page from a test copy of the shop.",
        click: "The same button a customer presses.",
        see: "The test passes only when the text a customer would see appears.",
        PASS: "Six seconds for one path. A thousand of these would take hours.",
      },
    },
    flaky: {
      short: "Flaky",
      title: "A test that fails one run in twelve",
      body: "Checkout sometimes fails and passes on retry. Two tests share one test user, so one finds a cart the other left behind. Sometimes the page is just slower than a fixed 5-second wait.\n\nPeople start pressing retry without reading the error. Soon a real failure gets retried away too.",
      watch: "A flaky test is worse than no test: it teaches the team to ignore red.",
      fields: {
        TimeoutError: "The test waited a fixed time. The page was not wrong, only slow.",
        "another test": "Shared data: the result depends on which test ran first.",
        retry: "It passed on the second try. The cause is still there.",
      },
    },
    isolate: {
      short: "Isolate",
      title: "Own data per test, wait for a condition",
      body: "Each test now creates its own user and empty cart and throws them away after. No test sees another's data.\n\nInstead of sleeping a fixed time, the test waits until the confirmation appears, up to a limit. A test that still flakes goes to a quarantine list with an owner and a date, and the rest of the suite stays trusted.",
      fields: {
        user: "A new user for this test run only.",
        cart: "Starts empty, so the result does not depend on order.",
        expires_in: "The test data deletes itself after ten minutes, even if the test crashes.",
      },
    },
    gate: {
      short: "Gate",
      title: "CI as the gate before deploy",
      body: "Every push runs the layers in order: unit first, then integration, contract and end-to-end. A failure in a fast layer stops the run early, so the developer hears back in seconds.\n\nDeploy is allowed only when all layers are green. Nobody deploys from a laptop anymore, and the numbers show it: one escaped bug a month instead of nine.",
      fields: {
        unit: "412 tests in 18 seconds: most of the checking happens here.",
        integration: "Real database, real migrations.",
        contract: "Every consumer of this service still gets what it needs.",
        e2e: "Six main user paths only.",
        allowed: "Only this exact build, which passed everything, can go to production.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Each test layer catches what the one below cannot.\n\n1) Many unit tests for logic, in milliseconds. 2) Integration tests with a real database in a container, not a mock. 3) Contract tests between services, checked in the provider's CI. 4) A few end-to-end tests for the main paths. 5) Fix flaky tests with isolated data and condition waits. 6) CI runs it all, fast layers first, and only green builds deploy.",
    },
  },
};

export default text;
