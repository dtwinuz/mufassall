import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Napkin math",
  summary:
    "Before building a courier-tracking service, size it on a napkin: users to requests per second, requests to bytes per day, bytes to disks, bandwidth and servers. Rough numbers, a few minutes, and the expensive mistakes show up before the first line of code.",
  learn: [
    "Turning “how many users” into requests per second, average and peak",
    "Estimating storage from one row size, per day and per year",
    "Spotting the bandwidth hog before it reaches production",
    "Latency numbers worth remembering, and counting servers with headroom",
  ],
  nodes: {
    couriers: "Courier app",
    customers: "Customer app",
    api: "Tracking API",
    db: "Database",
    archive: "Archive",
    cdn: "CDN",
  },
  metrics: {
    rps: "Peak requests",
    disk: "Database size",
    egress: "API egress per second",
    servers: "App servers",
  },
  steps: {
    pings: {
      short: "Writes",
      title: "Start from the users",
      body: "20 000 couriers are on shift at the busiest hour. Their app sends a location ping every 10 seconds.\n\n20 000 ÷ 10 = **2 000 writes per second**. That one division already tells you this is a write-heavy system.",
      watch: "Always write the assumption next to the number. “Every 10 s” is a product decision, and changing it to 30 s cuts the load by three.",
      fields: {
        Authorization: "Each courier's token. A secret, so it is hidden here.",
        courier_id: "Who sent it. Pings are looked up by courier, so this will be the first column of the index.",
        lat: "Latitude, together with `lon` the position. Two numbers, 16 bytes.",
        ts: "When the phone took the reading, not when the server got it. Phones can be offline and send late.",
      },
    },
    reads: {
      short: "Reads",
      title: "Add the readers",
      body: "300 000 orders a day, and each customer opens tracking about 20 times: 6 million reads a day. A day has 86 400 seconds, call it 100 000, so that is about 60 per second on average.\n\nTraffic is not flat: lunch and evening peaks run about 5× the average, so plan for 300. Together with pings: **2 300 requests per second** at peak.",
      fields: {
        status: "Where the order is now. Small, changes a few times per order.",
        eta_min: "Minutes until delivery. The whole response is under 1 KB, so 300/s is only 0.3 MB/s.",
      },
    },
    "row-size": {
      short: "Row size",
      title: "How big is one ping?",
      body: "Do not guess the row size, ask the database. On a sample table, one ping is 61 bytes of data plus 38 bytes of index: about 100 bytes.\n\n2 000 per second × 86 400 seconds ≈ 173 million rows a day. × 100 bytes ≈ **17 GB a day**.",
      check: {
        q: "At 17 GB a day, what does keeping every ping for a year mean for the database?",
        options: [
          "About 600 GB: one ordinary server holds it",
          "About 6.3 TB: the indexes spill out of memory",
          "About 60 TB: it needs a cluster from day one",
        ],
        answer: 1,
        why: "17 GB × 365 ≈ 6.3 TB and 63 billion rows. The indexes no longer fit in memory, every query touches disk, and a backup takes most of a day.",
      },
      fields: {
        row_bytes: "Average stored size of one row, including the row header the database adds.",
        TABLESAMPLE: "Reads a 1% sample instead of the whole table. Plenty for an estimate.",
        index_bytes: "Every index costs disk too. Forgetting indexes is the most common sizing mistake.",
      },
    },
    year: {
      short: "One year",
      title: "Keep everything for a year",
      body: "17 GB a day × 365 ≈ **6.3 TB**, 63 billion rows. The indexes no longer fit in memory, every query touches disk, and a backup takes most of a day.\n\nNobody asked for this. Customers need the last few hours; support needs a week; analytics needs a summary.",
      watch: "Ask how long data must be kept before you pick a database. The answer often shrinks the problem a hundredfold.",
      fields: {
        pg_total_relation_size: "Table plus all its indexes, as they sit on disk.",
        rows: "172.8 million a day × 365. A single table this big is slow to query, back up and change.",
      },
    },
    retention: {
      short: "Retention",
      title: "Keep 7 days hot, archive the rest",
      body: "The database keeps only the last 7 days: 7 × 17 ≈ **120 GB**, which fits in one ordinary server. Each night, the oldest day is exported as a compressed file to cheap object storage and dropped.\n\nThe compressed day is about 1.7 GB, ten times smaller than in the database. A year of archive is about 600 GB.",
      fields: {
        parquet: "A columnar file format. Coordinates and timestamps compress very well in columns.",
        "Content-Length": "About 1.7 GB for a whole day of pings.",
      },
    },
    bandwidth: {
      short: "Bandwidth",
      title: "The map is the heavy part",
      body: "The tracking screen shows a map, and the API serves the map tiles itself. One tile is about 200 KB. 300 views a second × 200 KB = **60 MB/s**, about 480 Mbit/s.\n\nThe pings, by comparison, are 2 000 × ~400 bytes ≈ 0.8 MB/s. The feature nobody thought about uses 75 times more bandwidth than the core of the product.",
      watch: "Bytes per response × responses per second. Do this for every endpoint, especially the ones that return images.",
      check: {
        q: "Map tiles cost the API 60 MB/s and look the same for every viewer. What cuts API egress the most?",
        options: [
          "Serve them from a CDN that caches near users",
          "Compress the small JSON tracking responses",
          "Add API servers with bigger network links",
        ],
        answer: 0,
        why: "Tiles are identical and rarely change, so a CDN caches them and the API serves only small JSON. API egress falls from 60 MB/s to 0.3 MB/s.",
      },
      fields: {
        tiles: "Map images, the same for everyone who looks at the same street.",
        "Content-Length": "204 800 bytes per tile, served from the API's own network link.",
      },
    },
    cdn: {
      short: "CDN",
      title: "Serve the tiles from a CDN",
      body: "Tiles are identical for every viewer and rarely change, so a CDN can cache them close to the users. The API is back to serving only small JSON.\n\nAPI egress drops from 60 MB/s to 0.3 MB/s. The CDN's bill for the same bytes is far below the price of a bigger network link.",
      fields: {
        "Cache-Control": "Any cache may keep this tile for 7 days.",
        Age: "The tile has been sitting in the CDN for 85 minutes. Nobody bothered the API for it.",
        "X-Cache": "`HIT`: served from the CDN without reaching the API.",
      },
    },
    numbers: {
      short: "Numbers",
      title: "Latency numbers worth remembering",
      body: "Memory: ~100 ns. SSD read: ~100 µs. Round trip inside one data centre: ~0.5 ms. Disk seek: ~10 ms. Round trip between continents: 70–150 ms.\n\nThe jumps are uneven: an SSD read is a thousand times slower than memory, a round trip inside the data centre a few times slower than an SSD read, and a round trip between continents a few hundred times slower than one inside the data centre. So one network call costs as much as thousands of memory reads, and one call to another region as much as hundreds of calls next door.",
      watch: "Exact values change with hardware; the ratios between them barely do. Remember the ratios.",
    },
    servers: {
      short: "Servers",
      title: "How many app servers?",
      body: "Measure, do not guess: a load test shows one 4-vCPU instance handles 800 requests per second at 61% CPU with a good p99.\n\n2 300 ÷ 800 ≈ 3 instances, plus one spare for deploys and failures: **4 servers**. At peak each runs at about 44% load.",
      watch: "Never size for exactly 100%. One server down for a deploy must not overload the rest.",
      fields: {
        throughput: "The rate one instance sustained without its latency going up.",
        cpu: "Busy, but with room left. The plan keeps servers well below this.",
        p99: "Still fast at this rate. Pushing harder would make the tail grow first.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A napkin estimate is a chain of simple multiplications: users → requests per second → bytes per day → disks, bandwidth and servers.\n\n1) Write each assumption down and plan for the peak, not the average. 2) A day is ~100 000 seconds. 3) Ask how long data must live. 4) Multiply bytes by rate for every endpoint. 5) Keep the latency ratios in your head: memory, SSD, data centre, continent.",
    },
  },
};

export default text;
