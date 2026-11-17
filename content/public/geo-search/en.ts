import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Geo search: who is nearby",
  summary:
    "A taxi app must find the ten nearest free drivers around a rider, while 50 000 drivers send their position every 4 seconds. Why a normal index does not help, and how geohash, neighbour cells, a quadtree and S2/H3 cells answer \"who is within 2 km\" in milliseconds.",
  learn: [
    "Why a B-tree on latitude and longitude still reads a stripe of the whole city",
    "Geohash: nearby points share a prefix, so a cell becomes one key lookup",
    "Edge cells: always search the neighbours, then filter by exact distance",
    "Hot cells in a dense centre: quadtree splits, S2 and H3 cells, sharding by cell",
  ],
  nodes: {
    rider: "Rider app",
    drivers: "Driver apps",
    api: "Matching API",
    db: "Drivers DB",
    geo: "Geo index",
    geo2: "Geo index 2",
  },
  metrics: {
    p95: "Search p95",
    scanned: "Drivers read",
    missed: "Nearest missed",
    ghosts: "Ghost drivers",
  },
  steps: {
    scan: {
      short: "Full scan",
      title: "Distance computed for every driver",
      body: "A rider opens the app and asks for a car. The matching API asks the database for free drivers closer than 2 km and sorts them by distance.\n\nThe database cannot use an index on a formula: it computes the distance for all 50 000 drivers on every search. Meanwhile the same table takes 12 500 position updates a second.",
      fields: {
        distance_km: "A function of the row's values. No ordinary index can answer it in advance.",
        "Seq Scan": "The plan reads the whole table, row by row.",
        examined: "50 000 rows read to return 10. Almost all of the work is wasted.",
      },
    },
    box: {
      short: "Bounding box",
      title: "An index on latitude reads a stripe",
      body: "The next idea is a bounding box: latitude and longitude within ±2 km, with an index on `lat`. The index finds all drivers in the latitude band quickly.\n\nBut a band of latitude is a 4 km stripe across the whole city, east to west. 9 000 drivers are read just to keep the few hundred inside the square. A B-tree sorts by one dimension, and the map has two.",
      watch: "Two separate one-dimensional indexes cannot answer a two-dimensional question efficiently.",
      fields: {
        drivers_lat: "A B-tree on one coordinate only.",
        BETWEEN: "The box: ±0.018° of latitude and ±0.024° of longitude, about 2 km each way.",
        stripe: "Everything with the right latitude, however far east or west.",
      },
    },
    geohash: {
      short: "Geohash",
      title: "Geohash: turn two coordinates into one key",
      body: "Geohash splits the world into a grid again and again, and writes the path as a short string. Points that are close usually share a long prefix: `tz6x9q` is a cell of about 1.2 × 0.6 km.\n\nThe drivers now live in an in-memory geo index keyed by cell. A search reads one cell, about 300 drivers, instead of 50 000 rows.",
      fields: {
        tz6x9q: "Six characters: a cell of about 1.2 × 0.6 km. Each extra character cuts it into 32.",
        tz6x9: "The parent cell. Drop a character and the cell grows.",
        SCAN: "Read only the drivers whose key starts with this cell.",
      },
    },
    "edge-cells": {
      short: "Edge of a cell",
      title: "The nearest driver is across the border",
      body: "A rider stands 40 m from the east border of her cell. The search reads only her cell and offers a driver 900 m away. Another driver is 120 m away, but in the neighbouring cell `tz6x9w`.\n\nCloseness on the map does not always mean a shared prefix: two points a few metres apart can sit on opposite sides of a cell border, even a big one.",
      check: {
        q: "How do you make sure the 120 m driver is found?",
        options: [
          "Use a longer geohash so cells are smaller",
          "Read the rider's cell and its 8 neighbours, then sort by exact distance",
          "Search the parent cell `tz6x9` only",
        ],
        answer: 1,
        why: "Smaller cells make borders more frequent, not less. The parent cell has borders too. Reading the cell and its eight neighbours covers every point within one cell width, and the exact distance then picks the true nearest.",
      },
      fields: {
        border: "The rider is near the edge of her cell. Any cell has edges.",
        "not searched": "The closest driver lives in a cell nobody read.",
        prefix: "The two neighbouring cells share only five characters out of six.",
      },
    },
    neighbours: {
      short: "Neighbours",
      title: "Read the cell and its 8 neighbours",
      body: "The geo index takes a centre and a radius. It reads the rider's cell and the eight cells around it, computes the exact distance only for those drivers, drops anyone beyond 2 km and sorts the rest.\n\n2 700 drivers are read instead of 50 000, and the nearest one is never missed. The cell size is chosen so that one cell is about as wide as the search radius.",
      watch: "A grid is only a filter. The final answer always comes from the exact distance.",
      fields: {
        BYRADIUS: "Everything inside a circle, not a square.",
        ASC: "Nearest first.",
        "9 cells": "The cell plus its 8 neighbours: a 3 × 3 block around the rider.",
        "exact distance": "Computed only for candidates from the 9 cells, then the far corners are dropped.",
      },
    },
    updates: {
      short: "Updates",
      title: "12 500 position updates a second",
      body: "Every driver app sends its position every 4 seconds: 12 500 writes a second. The positions go to the in-memory geo index, not to the main database: an old position is worthless after a minute, and losing it on a restart costs nothing.\n\nBut some drivers lose signal or kill the app. Their last position stays in the index for hours, and riders are offered cars that are not there.",
      check: {
        q: "A driver's phone dies in a tunnel. What does the index show to riders an hour later?",
        options: [
          "The driver, still free, at the tunnel entrance",
          "Nothing: the index removes drivers who stop moving",
          "The driver, but marked offline",
        ],
        answer: 0,
        why: "The index keeps the last position it was given. Nobody told it the driver left, so without an expiry rule the ghost stays free forever.",
      },
      fields: {
        lat: "Latitude in degrees. With `lng` it is the whole position.",
        status: "Only free drivers belong in the search.",
        sent_at: "When the phone measured it. The server's own clock decides freshness.",
        GEOADD: "Put or move the driver in the index. The same command overwrites the old position.",
      },
    },
    expiry: {
      short: "Expiry",
      title: "Drop drivers who went silent",
      body: "Next to the positions, the index keeps when each driver was last heard from. Every 10 seconds a sweep removes drivers silent for more than 30 seconds.\n\nA driver who comes back simply sends the next update and reappears. 1 400 ghost drivers disappear from the search.",
      fields: {
        "drivers:seen": "Driver id with the time of the last update.",
        "now-30": "Anyone not heard from in 30 seconds. That is seven missed updates.",
        ZREM: "Remove them from the geo index.",
      },
    },
    "hot-cell": {
      short: "Hot cell",
      title: "Friday evening in the city centre",
      body: "At 18:30 on Friday, 3 100 drivers wait in one central cell and 900 riders a second search around it. In a suburb a cell of the same size holds four drivers.\n\nEvery search in the centre reads thousands of drivers, and the node that holds the centre is at 100% while the rest are idle. A fixed grid puts the same box over a desert and a stadium.",
      check: {
        q: "What helps the hot centre cell most?",
        options: [
          "Bigger cells everywhere, so there are fewer of them",
          "A cache in front of the geo index",
          "Cells that split where drivers are dense and stay big where they are rare",
        ],
        answer: 2,
        why: "Bigger cells make the centre worse. A cache does not help, since drivers move every 4 seconds. What helps is cell size following density: small squares in the centre, large ones in the suburbs. That is a quadtree.",
      },
      fields: {
        tz6x9q: "The same 1.2 km cell, now full.",
        "900 searches": "Each one reads every driver in the cell and its neighbours.",
        suburb: "A cell of the same size, almost empty. A fixed grid does not care about density.",
      },
    },
    quadtree: {
      short: "Quadtree",
      title: "A quadtree: cells follow density",
      body: "A quadtree starts with one square for the city and splits a square into four whenever it holds more than 200 drivers. In the centre the squares end up about 300 m wide; in the suburbs they stay 10 km wide.\n\nA search walks down the tree and reads only the squares that touch the 2 km circle. Every square holds a bounded number of drivers, so the cost of a search no longer depends on where the rider stands.",
      watch: "Drivers move, so squares must split and merge as the evening goes. Rebuilding the tree every few seconds is often simpler than updating it in place.",
      fields: {
        split: "Four children instead of one full square.",
        "depth 9": "Nine splits in the centre: small squares where it is crowded.",
        touch: "Squares completely outside the circle are skipped without being read.",
      },
    },
    "s2-h3": {
      short: "S2 and H3",
      title: "S2 and H3 cells, and sharding by cell",
      body: "Libraries do the same on a sphere. S2 maps the Earth onto cube faces and numbers cells along a curve, so a circle is covered by a few ranges of 64-bit ids. H3 uses hexagons: all six neighbours are the same distance away, so \"the next ring\" is a fair circle.\n\nWith cells as ids, the index can be split across nodes by a coarse parent cell. A search near a shard border asks both shards; a hot centre gets a shard of its own.",
      fields: {
        H3: "A hexagon grid with 16 sizes. Resolution 8 is a hexagon of about 0.7 km².",
        "ring of 6": "Hexagons have six neighbours at equal distance, unlike the 8 uneven ones of a square.",
        "res 5": "A coarse parent cell picks the shard. Nearby drivers stay on the same node.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for \"who is nearby\".\n\n1) An ordinary index on lat or lng reads a stripe; turn the position into a cell key (geohash, S2, H3). 2) Always read the cell and its neighbours, then sort by exact distance. 3) Keep fast-changing positions in memory and expire silent drivers. 4) Let cells follow density: a quadtree or several resolutions. 5) Shard by a coarse cell and give hot areas their own shard.",
    },
  },
};

export default text;
