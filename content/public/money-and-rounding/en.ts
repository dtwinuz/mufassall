import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Money and rounding",
  summary:
    "A shop sells in so'm and issues e-invoices with 12% VAT. With prices as floating-point numbers, a payment of exactly the right amount fails an equality check. Amounts become integers in minor units with a currency, and then the real questions start: which rounding rule, where to round (per line or per invoice), how to split an amount without losing a tiyin, how to convert at a rate you can still prove a week later, and why formatting belongs only at the very edge.",
  learn: [
    "Why binary floating point cannot hold 0.1 or 19 990.10 exactly, and how integer minor units with a currency fix it (currencies with 0, 2 and 3 decimals)",
    "Rounding modes: half-up, half-even (banker's) and the asymmetric Math.round, and why the rule is a business decision written down once",
    "Rounding per line versus per invoice: a 1-tiyin VAT difference, and the rule that totals are sums of the lines as printed",
    "Splitting an amount with the largest remainder method, converting currency with a stored rate and timestamp, and formatting per locale at the edge",
  ],
  nodes: {
    app: "Checkout",
    api: "Order service",
    db: "Orders DB",
    tax: "E-invoice system",
    fx: "Rates provider",
    report: "Reports job",
  },
  metrics: {
    drift: "Difference, tiyin",
    bad: "Mismatched documents",
    gap: "Refund shortfall, tiyin",
  },
  steps: {
    cart: {
      short: "Order",
      title: "An order with prices as plain numbers",
      body: "The checkout sends an order: three packs of tea at 19 990.10 so'm. 1 so'm is 100 tiyin. Prices travel as JSON numbers, the order service multiplies and adds them and stores the order as awaiting payment.\n\nIt looks harmless: these are just numbers with two decimals.",
      fields: {
        price: "19 990.10 so'm, sent as a JSON number, so it becomes a binary float.",
        qty: "A count: an integer, no problem here.",
        total: "Computed on the client and again on the server, both with floats.",
        status: "The order waits until a payment of exactly this total arrives.",
      },
    },
    float: {
      short: "Float",
      title: "The right payment does not match the total",
      body: "In binary floating point, 19 990.10 is stored as the nearest binary fraction, which is a little off. Multiplied by 3 it becomes 59 970.299999999996. The customer pays 59 970.30, the comparison says `false`, and the order stays unpaid.\n\nAbout 180 orders a day get stuck like this. Summing a million lines of 19 990.10 is 0.016907 so'm off, so reports do not add up either.",
      watch: "Rounding the float before comparing hides the symptom; the next sum of thousands of values brings it back.",
      check: {
        q: "Why does 0.1 + 0.2 give 0.30000000000000004?",
        options: [
          "A bug in JavaScript that other languages do not have",
          "Binary floating point cannot store 0.1 exactly, just as decimals cannot write 1/3; every language that uses doubles behaves the same",
          "The processor rounds differently on different machines",
        ],
        answer: 1,
        why: "0.1 in binary is an infinite fraction, so a double keeps the nearest value it can. The tiny errors are deterministic, but they add up and break equality. Money needs exact arithmetic: integers or a decimal type.",
      },
      fields: {
        "59970.299999999996": "Three times a price that was never exactly 19 990.10.",
        "0.30000000000000004": "The classic example: the same error at a smaller scale.",
        false: "The payment is right to the tiyin, yet the check fails.",
        "19990100000.016907": "The error grows with every addition: reports drift.",
      },
    },
    minor: {
      short: "Minor units",
      title: "Store integers of the smallest unit",
      body: "Every amount is now an integer number of **minor units** plus a currency: 1 999 010 tiyin of UZS. Multiplying and adding integers is exact in every language, so 3 × 1 999 010 is always 5 997 030.\n\nHow many decimals a currency has comes from a table (ISO 4217), not from a hard-coded `/ 100`: the yen has none, the Kuwaiti dinar has three. In JSON the amount is a string, so no parser turns it back into a float; in the database it is a `bigint`.",
      watch: "An amount without a currency is a bug waiting to happen: 4 999 means very different money in USD and in UZS.",
      fields: {
        minor: "The amount in tiyin, as an integer in a string.",
        currency: "Always next to the amount: together they are one value.",
        total: "The same shape: a sum of integers, exact.",
        exponent: "How many decimal places the currency has.",
        JPY: "No minor unit: 4 999 yen is stored as 4999.",
        KWD: "Three decimals: 12.345 dinar is stored as 12345.",
      },
    },
    modes: {
      short: "Modes",
      title: "Rounding modes: what happens at exactly half",
      body: "Integers do not remove rounding: a 1.5% fee on 10 003.00 so'm is 15 004.5 tiyin, and only whole tiyin can be charged. **Half-up** always sends .5 up. **Half-even** (banker's rounding) sends it to the even neighbour, so ties go up and down equally often.\n\nWith 200 000 ties a month, half-up charges about 1 000 so'm more than the exact amounts, half-even about nothing. Which one is right is not a technical question: tax rules usually prescribe half-up, contracts may prescribe something else. Write the rule down and use one rounding function everywhere.",
      check: {
        q: "A refund comes out as -2.5 tiyin, and the code uses JavaScript's `Math.round`. What is the result?",
        options: ["-3", "-2", "An error: negative amounts cannot be rounded"],
        answer: 1,
        why: "`Math.round` sends ties towards plus infinity: 2.5 becomes 3, but -2.5 becomes -2. A charge and its refund then round differently. A named rounding function with an explicit mode avoids the surprise.",
      },
      fields: {
        "half-up": "Half away from zero: 15 004.5 becomes 15 005, -2.5 becomes -3.",
        "half-even": "Half to the even neighbour: 15 004.5 becomes 15 004, 15 005.5 becomes 15 006.",
        "Math.round": "Neither of the two: ties go up for positive and negative numbers alike.",
        "+1 000 so'm": "A small, systematic bias, always in the same direction.",
        "one function": "One place that rounds, with the mode as an explicit argument.",
      },
    },
    perline: {
      short: "Per line",
      title: "The VAT of the lines does not add up to the total",
      body: "An invoice has three lines. The service rounds the VAT of each line, which gives 10 660.72 so'm in total. For the total line it computes 12% of the total net amount once: 10 660.7148, rounded to 10 660.71.\n\nOne tiyin apart. The e-invoice system checks that the total equals the sum of the lines and rejects the invoice: about 120 invoices a day.",
      check: {
        q: "Which number belongs in the \"total VAT\" field?",
        options: [
          "10 660.71: 12% of the total, rounded only once",
          "10 660.72: the sum of the rounded lines, so the document adds up",
          "Either one: a 1-tiyin difference is too small to matter",
        ],
        answer: 1,
        why: "A document must add up as printed: totals are sums of the lines. That is exactly what this e-invoice format checks. Some rules instead round the total first and then fit the lines to it by allocation; either way the rule is written down once, and the printed numbers add up exactly.",
      },
      fields: {
        "VAT rounded": "Each line is rounded on its own: 0.29, 0.43, 0.00.",
        "sum of lines": "The VAT a reader of the invoice adds up: 10 660.72.",
        "10 660.71": "The VAT computed from the total: correct arithmetic, inconsistent document.",
        rejected: "The receiving side checks the sums, to the tiyin.",
      },
    },
    oneplace: {
      short: "One rule",
      title: "Round once per line, sum what you stored",
      body: "The rule is now: VAT is rounded per line, half-up, when the line is created, and stored. Every total is the sum of the stored line amounts, never recomputed from unrounded values.\n\nThe invoice carries exactly the numbers that were stored, the totals add up, and the e-invoice system accepts it.",
      watch: "Store the rounded amounts, not only the inputs. If the VAT is recomputed later, after a rate change or a code change, an issued document changes its numbers.",
      fields: {
        net_minor: "The line's net amount in tiyin, as stored.",
        vat_minor: "Rounded once, when the line was created, and never again.",
        total_vat_minor: "The sum of the three `vat_minor`: 1 066 072 tiyin.",
        accepted: "Totals equal the sums of the lines.",
      },
    },
    split: {
      short: "Split",
      title: "Three installments, one tiyin missing",
      body: "A customer pays 100 000.00 so'm in 3 monthly installments. The code divides and rounds each part: 33 333.33 so'm three times. That is 99 999.99: one tiyin is never charged.\n\nIt sounds trivial, but now the plan does not add up to the order, and 52 000 installment plans a month fail reconciliation.",
      check: {
        q: "How do you split 100 000.00 so'm into 3 payments?",
        options: [
          "33 333.33 three times",
          "33 333.34 + 33 333.33 + 33 333.33",
          "33 333.33 three times, and write off the missing tiyin",
        ],
        answer: 1,
        why: "Parts must add up to the whole. Give everyone the rounded-down share, then hand out the leftover tiyin one by one. Writing off sounds simple, but every write-off is an unexplained difference in the books.",
      },
      fields: {
        exact: "A third of 10 000 000 tiyin is not a whole number.",
        "round()": "Rounding each part on its own ignores the others.",
        "9 999 999": "The parts no longer add up to the whole.",
        "1 tiyin": "Small, but it breaks every check that compares sums.",
      },
    },
    allocate: {
      short: "Allocate",
      title: "Allocate the remainder, largest first",
      body: "**Allocation** splits an amount by weights so that the parts always add up. Each part gets its exact share rounded down; the tiyin that are left go one each to the parts with the largest remainders (the largest remainder method).\n\nA 5 000.00 so'm discount over the three invoice lines gives 150 754 + 138 191 + 211 055 tiyin: exactly 500 000. Installments are the same with equal weights: 33 333.34 + 33 333.33 + 33 333.33.",
      watch: "Break ties in a fixed order, for example by line number, so that splitting the same amount again gives the same parts.",
      fields: {
        floor: "Everyone first gets the rounded-down share.",
        remainder: "What each part lost by rounding down.",
        "2 tiyin left": "The whole minus the sum of the floors: always fewer than the number of parts.",
        "largest remainders": "The leftover tiyin go to lines 2 and 1, the largest remainders.",
        "3 333 334": "The first installment is one tiyin larger, and the plan adds up.",
      },
    },
    fx: {
      short: "Conversion",
      title: "A refund at today's rate",
      body: "A product is priced at 49.99 USD and the customer pays in so'm. On 9 November the service converts at 12 687.43 so'm per dollar and charges 634 244.63 so'm.\n\nNine days later she returns it. The refund code fetches the rate again, gets 12 590.10 and refunds 629 379.10 so'm: 4 865.53 less than she paid. Nobody can explain why without the original rate.",
      check: {
        q: "Which rate should the refund use?",
        options: [
          "Today's rate: it is the current value of the dollar",
          "The rate stored with the charge, as the refund terms say",
          "The average of the two rates",
        ],
        answer: 1,
        why: "A refund reverses a specific payment, so it uses the numbers of that payment: the stored amount and rate. The policy can be different, but it has to be written down, and it can only be applied if the original rate was kept.",
      },
      fields: {
        "634 244.63": "The amount charged, rounded to the tiyin.",
        "rate fetched again": "The bug: the old rate was never stored, so it is fetched anew.",
        "629 379.10": "The same 49.99 USD at another day's rate.",
        "4 865.53": "The customer's loss, and a support ticket.",
      },
    },
    fxrate: {
      short: "Stored rate",
      title: "Store the rate, its source and time with the conversion",
      body: "Every conversion is now a record: the original amount, the rate as an exact decimal, where it came from and when, the converted amount and the rounding mode. The arithmetic is integer: 4 999 cents × 1 268 743 tiyin per dollar ÷ 100, rounded half-up once.\n\nThe refund reads this record and returns exactly 63 424 463 tiyin. Months later an auditor can recompute every number.",
      fields: {
        rate: "A decimal string, not a float: 12 687.43 so'm per dollar.",
        rate_as_of: "The moment the rate was valid. Rates change daily, sometimes faster.",
        converted: "The result, stored, not recomputed later.",
        rounding: "The mode is part of the record, so the result can be checked.",
        "stored rate": "The refund reuses the numbers of the charge.",
      },
    },
    display: {
      short: "Display",
      title: "Format only at the edge, per locale",
      body: "The database, the APIs and the logs keep minor units and a currency. Only the app turns them into text, at the last moment, with the locale's rules: Uzbek and Russian use a space between thousands and a decimal comma, English uses a comma and a point.\n\nThe number of decimals comes from the currency: yen without decimals, dinar with three.",
      watch: "Never parse a formatted amount back into a number: \"634,244\" is 634 thousand in one locale and 634 point 244 in another.",
      fields: {
        "uz-Latn": "634 244,63 so'm: a space for thousands, a comma for decimals.",
        "en-US": "A comma for thousands, a point for decimals, the code in front.",
        "0 decimals": "The yen has no minor unit, so nothing to divide.",
        "3 decimals": "The dinar divides by 1 000, not by 100.",
        "minor units": "Everything except the screen speaks integers and currency codes.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Seven rules for money.\n\n1) Never floats: integers in minor units, always with a currency. 2) Decimals come from the currency table: 0, 2 or 3. 3) Choose the rounding mode by rule and use one function with an explicit mode. 4) Round in one defined place, store the rounded amounts, and make totals the sums of what was stored. 5) Split with allocation, so the parts always add up. 6) Store every conversion with its rate, source and time, and reuse it for refunds. 7) Format per locale only in the app.",
    },
  },
  scenarios: {
    "report-drift": {
      label: "Report drift",
      steps: {
        "report-sum": {
          short: "Report",
          title: "The report recomputes VAT and disagrees with the invoices",
          body: "The monthly VAT report is written as one query: 12% of the sum of all net amounts, rounded once. It gives 61 284 517 961 tiyin. The 41 200 invoices issued this month add up to 61 284 518 175 tiyin of VAT.\n\nThe report rounds in a different place than the invoices did, and the declaration and the documents are 214 tiyin apart.",
          check: {
            q: "Which number goes into the tax declaration?",
            options: [
              "The report's: computed from the raw amounts, so more precise",
              "The sum of the invoices as issued: they are the documents, the report must add up what was issued",
              "Either: 2.14 so'm a month is noise",
            ],
            answer: 1,
            why: "Issued invoices are the legal record, and their VAT was rounded per line when they were created. A report that rounds somewhere else describes invoices that were never issued. Any difference, even a tiyin, is something an auditor has to have explained.",
          },
          fields: {
            "sum(net_minor)": "Unrounded line amounts, added before any rounding.",
            "0.12": "VAT applied once to the month, not per line as on the invoices.",
            "issued invoices": "What the buyers and the tax system actually received.",
            "214 tiyin": "Small, but a reconciliation is either exact or it fails.",
          },
        },
        "report-fix": {
          short: "Sum stored",
          title: "Sum the stored amounts, and check them every night",
          body: "The report now adds up the stored `total_vat_minor` of the accepted invoices: 61 284 518 175 tiyin, exactly what was issued. It never recomputes VAT.\n\nA nightly check compares every invoice total with the sum of its stored lines. The difference is 0, and if it is ever not, someone finds out the next morning, not at the tax audit.",
          fields: {
            "sum(total_vat_minor)": "Adds up the amounts as issued, without rounding anything again.",
            accepted: "Only invoices the e-invoice system accepted count.",
            "nightly check": "Parts against the whole, every night, to the tiyin.",
            "difference 0": "The report and the documents agree.",
          },
        },
      },
    },
  },
};

export default text;
