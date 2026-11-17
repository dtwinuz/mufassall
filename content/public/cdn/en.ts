import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "CDN and edge caching",
  summary:
    "A shop's server sits on one continent, its buyers on another. Images and scripts move to edge caches near the users: how a request reaches the edge, when it goes back to the origin, how to replace a file and what must never be cached.",
  learn: [
    "How an edge cache sits between users and the origin, and what a miss and a hit cost",
    "`Cache-Control` decides what may be cached and for how long",
    "Purge vs versioned URLs for replacing a file",
    "An origin shield, and why private responses must never be cached",
  ],
  nodes: {
    client: "Buyer, region A",
    origin: "Origin server",
    bucket: "File storage",
    edge: "Edge cache A",
    ops: "Engineer",
    client2: "Buyer, region B",
    edge2: "Edge cache B",
    shield: "Origin shield",
  },
  metrics: {
    p95: "Page load p95",
    "hit-ratio": "Edge hit ratio",
    "origin-reqs": "Requests to origin",
    wrong: "Wrong content served",
  },
  steps: {
    "far-origin": {
      short: "Far away",
      title: "Every image crosses half the planet",
      body: "The shop's server is in one data centre. A buyer far away opens a product page with 40 images and a few scripts, and each one travels the whole distance and back.\n\nThe network delay alone is around 200 ms per round trip. The page takes almost two seconds, and the server spends its time sending the same files again and again.",
      fields: {
        "Content-Length": "412 KB for one photo. The same bytes leave the server for every visitor.",
        "Server-Timing": "1870 ms in total. Most of it is distance, not work.",
      },
    },
    "edge-cache": {
      short: "Edge",
      title: "A cache near the buyers",
      body: "A CDN runs cache servers in many cities. The static files get their own name, and DNS points that name at the edge closest to the buyer.\n\nThe buyer now talks to a server a few milliseconds away. The edge is empty for now, so at first every request still goes on to the origin.",
      fields: {
        CNAME: "The shop's name is an alias for the CDN's name. The CDN decides which edge answers.",
        "198.51.100.24": "The address of the nearest edge for this buyer. A buyer elsewhere gets a different one.",
      },
    },
    miss: {
      short: "Miss",
      title: "A miss: the edge asks the origin once",
      body: "The edge does not have the photo yet. It fetches it from the origin, passes it on to the buyer and keeps a copy.\n\nWhether it may keep a copy, and for how long, is decided by the origin, in the `Cache-Control` header.",
      watch: "No `Cache-Control` means each CDN guesses on its own. Always set it explicitly.",
      fields: {
        "Cache-Control": "`public`: any cache may store it. `max-age=86400`: for one day.",
        ETag: "A fingerprint of this file version. The edge can later ask «has it changed?» cheaply.",
      },
    },
    hit: {
      short: "Hit",
      title: "A hit: the origin is not involved",
      body: "Every following buyer in this region gets the photo straight from the edge. 95% of requests never reach the origin.\n\nPages load in about 100 ms and the origin is almost idle.",
      fields: {
        "X-Cache": "Answered from the edge's cache.",
        Age: "This copy has been in the cache for 5312 seconds, about an hour and a half.",
      },
    },
    "wrong-image": {
      short: "Old file",
      title: "The photo changed, the edge still has the old one",
      body: "The shop uploads a better photo under the same file name. The origin has the new photo; the edges keep serving the old one until `max-age` runs out.\n\nFor up to a day some buyers see the old picture, depending on which edge they hit.",
      fields: {
        ETag: "The old fingerprint. This is the previous version of the file.",
        Age: "8 hours old and still valid for 16 more, as far as the edge knows.",
      },
    },
    purge: {
      short: "Purge",
      title: "Purge: tell every edge to drop the file",
      body: "The engineer calls the CDN's purge API. Within seconds every edge throws away its copy, and the next request fetches the new photo.\n\nIt works, but it is a manual step after each change, and right after a purge every edge misses at once.",
      fields: {
        Authorization: "The CDN account key. Hidden here.",
        paths: "Which files to drop. A wildcard purge empties far more and hits the origin harder.",
        eta_s: "About 5 seconds until all edges have dropped it.",
      },
    },
    versioned: {
      short: "Versions",
      title: "Versioned URLs: a new file gets a new name",
      body: "The build adds a short hash of the content to every file name. A new photo means a new URL; the old URL is simply never asked for again.\n\nNow each file can be cached for a year and nothing needs to be purged. Only the HTML page that lists the URLs keeps a short cache time.",
      watch: "This is why the page itself must not be cached for long: it is what points to the new names.",
      fields: {
        "3f9a2c": "A hash of the file content. Change one byte and the name changes.",
        "Cache-Control": "One year and `immutable`: this name will never have other content.",
      },
    },
    "many-edges": {
      short: "Many edges",
      title: "Each edge asks the origin on its own",
      body: "Buyers in a second region get their own edge. There are 41 edges worldwide, and after a release each one misses the new script separately.\n\nThe origin receives the same file request 41 times in a minute, on top of all the other new files. It slows down.",
      fields: {
        MISS: "Every edge misses for itself. Edges do not share their caches.",
        "41 edges": "41 identical fetches for one file, multiplied by every new file in the release.",
      },
    },
    shield: {
      short: "Shield",
      title: "An origin shield in between",
      body: "The edges now ask one middle cache, the **origin shield**, instead of the origin. Only the shield talks to the origin.\n\nIf 41 edges miss the same file, the shield fetches it once and serves the rest. The origin is calm again.",
      fields: {
        Via: "The request's path: edge B, then the shield. Only now it reaches the origin.",
        "Cache-Control": "The same header as before: the shield follows the same rules as the edges.",
      },
    },
    "private-leak": {
      short: "Leak",
      title: "A personal response was cached",
      body: "The cart endpoint was answered with `public` by mistake. The edge cached buyer `u_42`'s cart for a minute and gave it to the next buyer who opened `/api/cart`.\n\nOne line in a header turned into a data leak.",
      watch: "Anything that depends on who is asking (cart, profile, orders, a page with a name on it) must never land in a shared cache.",
      fields: {
        Cookie: "The buyer who asked is `u_77`. The edge did not look at this.",
        "Cache-Control": "`public` lets every shared cache store it. Wrong for a personal response.",
        "X-Cache": "Served from cache: the origin never saw this request.",
        user_id: "Someone else's cart.",
      },
    },
    "no-store": {
      short: "No store",
      title: "Personal responses: private, no-store",
      body: "Personal API responses now carry `private, no-store`. The edge passes them through to the origin every time and keeps nothing.\n\nThe hit ratio dips a little because these requests always go to the origin. That is the right price.",
      fields: {
        "Cache-Control": "`private`: only the buyer's own browser may keep it. `no-store`: do not write it anywhere.",
        "X-Cache": "The edge bypassed its cache entirely.",
        user_id: "The right cart for the right buyer.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for a CDN.\n\n1) Static files are served from an edge near the user; the origin only fills misses. 2) The origin sets `Cache-Control` explicitly on every response. 3) Replace files with versioned URLs; keep purge for emergencies. 4) An origin shield turns many edge misses into one. 5) Personal responses are `private, no-store`, always.",
    },
  },
};

export default text;
