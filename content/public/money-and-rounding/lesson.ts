import { defineLesson } from "@mufassall/scene-schema";

/**
 * A shop in Uzbekistan takes orders in UZS (1 so'm = 100 tiyin) and issues e-invoices with 12% VAT.
 * Prices as floats make a correct payment fail an equality check; amounts become integers in minor
 * units with a currency. Then where and how to round: half-up vs half-even on ties, per line vs per
 * invoice (a 1-tiyin difference the e-invoice system rejects), splitting an amount without losing a
 * tiyin, converting USD at a stored rate, and formatting per locale only at the edge.
 * All amounts are computed exactly; the scenario is a model, not a real tax regime.
 */
export default defineLesson({
  slug: "money-and-rounding",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "drift", unit: "", better: "down" },
    { id: "bad", unit: "/day", better: "down" },
    { id: "gap", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "cart",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4] },
        db: { kind: "db", at: [8, 8] },
        tax: { kind: "external", at: [8, 1] },
      },
      edges: {
        order: { from: "app", to: "api", rate: 3, mode: "call" },
        save: { from: "api", to: "db", rate: 3 },
        send: { from: "api", to: "tax", rate: 2, mode: "async" },
      },
      metrics: { drift: 0, bad: 0, gap: 0 },
      focus: ["app", "api"],
      exchange: {
        edge: "order",
        request: {
          format: "json",
          head: "POST /v1/orders HTTP/1.1",
          headers: [
            ["Host", "shop.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "items": [
    { "sku": "TEA-250", "price": 19990.1, "qty": 3 }
  ],
  "total": 59970.3
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{ "order_id": "o_7714", "status": "awaiting_payment" }`,
        },
        marks: ["price", "qty", "total", "status"],
        masked: ["Authorization"],
      },
    },
    {
      id: "float",
      kind: "problem",
      nodes: { api: { state: "slow" } },
      edges: { order: { flow: "fail" } },
      metrics: { bad: 180 },
      focus: ["api"],
      exchange: {
        edge: "order",
        request: {
          format: "text",
          head: "> 19990.1 * 3",
          body: "59970.299999999996\n> 0.1 + 0.2\n0.30000000000000004\n> paid = 59970.30;  paid === total\nfalse   -> o_7714 stays awaiting_payment\n> sum of 1 000 000 lines of 19990.1\n19990100000.016907",
        },
        marks: ["59970.299999999996", "0.30000000000000004", "false", "19990100000.016907"],
      },
    },
    {
      id: "minor",
      kind: "fix",
      nodes: { api: { state: "ok" } },
      edges: { order: { flow: "request" } },
      metrics: { bad: 0 },
      focus: ["app", "api", "db"],
      exchange: {
        edge: "order",
        request: {
          format: "json",
          head: "POST /v1/orders HTTP/1.1",
          body: `{
  "items": [
    { "sku": "TEA-250", "qty": 3,
      "price": { "minor": "1999010", "currency": "UZS" } }
  ],
  "total": { "minor": "5997030", "currency": "UZS" }
}`,
        },
        response: {
          format: "text",
          head: "currency  exponent  1 unit =",
          body: "UZS       2         100 tiyin\nUSD       2         100 cents\nJPY       0         no minor unit\nKWD       3         1 000 fils\n-- 1999010 x 3 = 5997030, exact in any language",
        },
        marks: ["minor", "currency", "total", "exponent", "JPY", "KWD"],
      },
    },
    {
      id: "modes",
      kind: "fix",
      focus: ["api"],
      exchange: {
        edge: "save",
        request: {
          format: "text",
          head: "1.5% fee on 10 003.00 so'm = 15 004.5 tiyin",
          body: "exact      half-up  half-even  Math.round\n 15004.5    15005    15004      15005\n 15005.5    15006    15006      15006\n -2.5       -3       -2         -2\n-- 200 000 ties a month: half-up adds about +1 000 so'm, half-even about 0\n-- the rule comes from the law or the contract: one function, used everywhere",
        },
        marks: ["half-up", "half-even", "Math.round", "+1 000 so'm", "one function"],
      },
    },
    {
      id: "perline",
      kind: "problem",
      nodes: { tax: { state: "slow" } },
      edges: { send: { flow: "fail" } },
      metrics: { drift: 1, bad: 120 },
      focus: ["api", "tax"],
      exchange: {
        edge: "send",
        request: {
          format: "text",
          head: "invoice INV-2026-11-04417  VAT 12%",
          body: "line  qty  net (so'm)   VAT exact    VAT rounded\n 1     2   26 785.72    3 214.2864   3 214.29\n 2     1   24 553.57    2 946.4284   2 946.43\n 3     1   37 500.00    4 500.0000   4 500.00\nsum of lines                          10 660.72\ntotal VAT = 12% of 88 839.29 = 10 660.7148 -> 10 660.71",
        },
        response: { format: "text", head: "rejected: total VAT 10 660.71 != sum of line VAT 10 660.72" },
        marks: ["VAT rounded", "sum of lines", "10 660.71", "rejected"],
      },
    },
    {
      id: "oneplace",
      kind: "fix",
      nodes: { tax: { state: "ok" } },
      edges: { send: { flow: "request" } },
      metrics: { drift: 0, bad: 0 },
      focus: ["api", "db", "tax"],
      exchange: {
        edge: "send",
        request: {
          format: "json",
          head: "POST /v1/invoices  INV-2026-11-04417",
          body: `{
  "lines": [
    { "n": 1, "net_minor": "2678572", "vat_rate": "12", "vat_minor": "321429" },
    { "n": 2, "net_minor": "2455357", "vat_rate": "12", "vat_minor": "294643" },
    { "n": 3, "net_minor": "3750000", "vat_rate": "12", "vat_minor": "450000" }
  ],
  "total_net_minor": "8883929",
  "total_vat_minor": "1066072"
}`,
        },
        response: { format: "text", head: "accepted  INV-2026-11-04417" },
        marks: ["net_minor", "vat_minor", "total_vat_minor", "accepted"],
      },
    },
    {
      id: "split",
      kind: "problem",
      metrics: { drift: 1, bad: 1700 },
      focus: ["api", "db"],
      exchange: {
        edge: "save",
        request: {
          format: "text",
          head: "installments: 100 000.00 so'm in 3 months = 10 000 000 tiyin / 3",
          body: "exact     3 333 333.333...\nround()   3 333 333   3 333 333   3 333 333\nsum       9 999 999\n-- 1 tiyin is never charged, and the plan does not add up to the order\n-- 52 000 plans a month fail the reconciliation",
        },
        marks: ["exact", "round()", "9 999 999", "1 tiyin"],
      },
    },
    {
      id: "allocate",
      kind: "fix",
      metrics: { drift: 0, bad: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "save",
        request: {
          format: "text",
          head: "allocate a 5 000.00 so'm discount (500 000 tiyin) by line net",
          body: "line  exact         floor     remainder\n 1    150 753.79    150 753   0.79   +1 -> 150 754\n 2    138 190.94    138 190   0.94   +1 -> 138 191\n 3    211 055.27    211 055   0.27      -> 211 055\nfloor sum 499 998: 2 tiyin left -> largest remainders\n-- installments the same way: 3 333 334 + 3 333 333 + 3 333 333",
        },
        marks: ["floor", "remainder", "2 tiyin left", "largest remainders", "3 333 334"],
      },
    },
    {
      id: "fx",
      kind: "problem",
      nodes: { fx: { kind: "external", at: [12, 4] } },
      edges: { rate: { from: "api", to: "fx", rate: 1, mode: "call" } },
      metrics: { gap: 486553 },
      focus: ["api", "fx"],
      exchange: {
        edge: "rate",
        request: {
          format: "text",
          head: "order o_8120  49.99 USD, paid in UZS on 2026-11-09",
          body: "charge   49.99 x 12 687.43 = 634 244.6257  -> 634 244.63 so'm\nrefund   2026-11-18, rate fetched again: 12 590.10\n         49.99 x 12 590.10 = 629 379.0990  -> 629 379.10 so'm\n-- the customer gets 4 865.53 so'm less than she paid",
        },
        marks: ["634 244.63", "rate fetched again", "629 379.10", "4 865.53"],
      },
    },
    {
      id: "fxrate",
      kind: "fix",
      metrics: { gap: 0 },
      focus: ["api", "fx", "db"],
      exchange: {
        edge: "save",
        request: {
          format: "json",
          head: "INSERT INTO conversions  (order o_8120)",
          body: `{
  "amount": { "minor": "4999", "currency": "USD" },
  "rate": "12687.43",
  "rate_source": "central-bank",
  "rate_as_of": "2026-11-09T09:00:00+05:00",
  "converted": { "minor": "63424463", "currency": "UZS" },
  "rounding": "half-up"
}`,
        },
        response: {
          format: "text",
          head: "4999 x 1268743 / 100 = 63 424 462.57 -> 63 424 463 tiyin",
          body: "refund on 2026-11-18 uses the stored rate: 63 424 463 tiyin back",
        },
        marks: ["rate", "rate_as_of", "converted", "rounding", "stored rate"],
      },
    },
    {
      id: "display",
      kind: "fix",
      focus: ["app", "api"],
      exchange: {
        edge: "order",
        request: {
          format: "text",
          head: "stored:  minor 63424463, currency UZS",
          body: "uz-Latn   634 244,63 so'm\nru-RU     634 244,63 UZS\nen-US     UZS 634,244.63\nJPY, 0 decimals   4999   -> JPY 4,999\nKWD, 3 decimals   12345  -> KWD 12.345\n-- formatted only in the app; APIs, logs and the db keep minor units",
        },
        marks: ["uz-Latn", "en-US", "0 decimals", "3 decimals", "minor units"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "report-drift",
      from: "oneplace",
      steps: [
        {
          id: "report-sum",
          kind: "problem",
          nodes: { report: { kind: "worker", at: [12, 8] } },
          edges: { read: { from: "report", to: "db", rate: 2 } },
          metrics: { drift: 214, bad: 1 },
          focus: ["report", "db"],
          exchange: {
            edge: "read",
            request: {
              format: "sql",
              head: "-- monthly VAT report, November",
              body: "SELECT round(sum(net_minor) * 0.12) AS vat_minor\n  FROM invoice_lines\n WHERE issued_at >= '2026-11-01';",
            },
            response: {
              format: "text",
              head: "vat_minor = 61 284 517 961",
              body: "sum of total_vat_minor of the 41 200 issued invoices: 61 284 518 175\n-- 214 tiyin apart: the declaration does not match the invoices",
            },
            marks: ["sum(net_minor)", "0.12", "issued invoices", "214 tiyin"],
          },
        },
        {
          id: "report-fix",
          kind: "fix",
          metrics: { drift: 0, bad: 0 },
          focus: ["report", "db"],
          exchange: {
            edge: "read",
            request: {
              format: "sql",
              head: "SELECT sum(total_vat_minor) AS vat_minor, count(*)",
              body: "  FROM invoices\n WHERE issued_at >= '2026-11-01' AND status = 'accepted';\n-- nightly check: every invoice total = sum of its stored lines",
            },
            response: { format: "text", head: "61 284 518 175   41 200 invoices   difference 0" },
            marks: ["sum(total_vat_minor)", "accepted", "nightly check", "difference 0"],
          },
        },
      ],
    },
  ],
});
