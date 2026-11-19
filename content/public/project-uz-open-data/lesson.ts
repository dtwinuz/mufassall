import { defineLesson } from "@mufassall/scene-schema";

/**
 * uz-open-data (wonmortech/uz-open-data, public; data ODbL 1.0, code MIT): small open datasets about
 * Uzbekistan, each next to the exact query or source it was built from. 2,289 mosques from OpenStreetMap
 * (snapshot 2026-11-13) and the Uzbek Cyrillic -> 2026 Latin letter table transcribed from bitg. The explorer
 * demo is published inside wonmor.io under /demo/uz-open-data/. Sources: README.md, mosques/README.md,
 * mosques/query.overpassql, mosques/to_geojson.py, alphabet/README.md + CSV, tools/build-demo.mjs,
 * tests/demo/smoke.spec.mjs, git log; wonmortech/wonmor.io deploy.yml and commit 2853313 (#27).
 */
export default defineLesson({
  slug: "project-uz-open-data",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "features", unit: "", better: "up" },
    { id: "unnamed", unit: "", better: "down" },
    { id: "failed", unit: "", better: "down" },
    { id: "unexplained", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "what",
      kind: "case",
      nodes: {
        user: { kind: "actor", at: [0, 10] },
        repo: { kind: "storage", at: [7, 7] },
      },
      edges: { get: { from: "user", to: "repo", rate: 2, mode: "call" } },
      metrics: { features: 2289 },
      focus: ["user", "repo"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "github.com/wonmortech/uz-open-data",
          body: "mosques/    2,289 mosques from OpenStreetMap as GeoJSON, the Overpass query, a converter   ODbL 1.0\nalphabet/   Uzbek Cyrillic -> 2026 Latin letter table (CSV), transcribed from bitg            MIT\nplanned     Uzbek word lists: nothing published yet\nrule        values are copied as they are in the source; corrections belong upstream",
        },
        marks: ["mosques/", "alphabet/", "planned", "corrections belong upstream"],
      },
    },
    {
      id: "use",
      kind: "case",
      focus: ["user", "repo"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "quick start from the README",
          body: "curl -sLO https://raw.githubusercontent.com/wonmortech/uz-open-data/main/mosques/mosques.geojson\n\nimport json\nfc = json.load(open(\"mosques.geojson\", encoding=\"utf-8\"))\nnamed = [f for f in fc[\"features\"] if \"name\" in f[\"properties\"]]\nprint(len(fc[\"features\"]), len(named))",
        },
        response: { format: "text", head: "stdout", body: "2289 2137" },
        marks: ["curl", "encoding", "named", "2289 2137"],
      },
    },
    {
      id: "explore",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [3, 12] },
        site: { kind: "cdn", at: [11, 11] },
      },
      edges: {
        browse: { from: "user", to: "app", rate: 2 },
        load: { from: "app", to: "site", rate: 2, mode: "call" },
      },
      focus: ["user", "app", "site"],
      exchange: {
        edge: "load",
        request: { format: "http", head: "GET /demo/uz-open-data/data/mosques.geojson HTTP/1.1", headers: [["Host", "wonmor.io"]] },
        response: {
          format: "text",
          head: "the explorer, all in the browser",
          body: "Map       every point by OSM type, a density layer, nearest mosques for a click\nTable     search in Latin or Cyrillic (apostrophes ignored), filter, sort, CSV and GeoJSON export\nDetail    stored properties, derived region, a mini map\nPinned    a short list with notes for a mapping trip; resets on reload\nno tiles, no backend, no third-party requests",
        },
        marks: ["Map", "Table", "apostrophes ignored", "Pinned", "no tiles"],
      },
    },
    {
      id: "convert-text",
      kind: "case",
      focus: ["user", "app"],
      exchange: {
        edge: "browse",
        request: {
          format: "text",
          head: "Converter page: Cyrillic in, 2026 Latin out (bitg's own examples)",
          body: "ер      -> yer      e at the start of a word is ye\nпоезд   -> poyezd   e after a vowel is ye\nкелди   -> keldi    otherwise e\nлицей   -> litsey   ts after a vowel\nцирк    -> sirk     otherwise s\nмаъно   -> maʼno    hard sign becomes the tutuq U+02BC\nЯнги    -> Yangi    ЯНГИ -> YANGI",
        },
        marks: ["yer", "poyezd", "litsey", "sirk", "U+02BC", "Yangi"],
      },
    },
    {
      id: "query",
      kind: "fix",
      nodes: {
        conv: { kind: "worker", at: [4, 3] },
        osm: { kind: "external", at: [0, 0] },
      },
      edges: { fetch: { from: "conv", to: "osm", rate: 1, mode: "call" } },
      focus: ["conv", "osm"],
      exchange: {
        edge: "fetch",
        request: {
          format: "text",
          head: "POST https://overpass-api.de/api/interpreter   (data@query.overpassql)",
          body: "[out:json][timeout:150];\narea[\"ISO3166-1\"=\"UZ\"][admin_level=2]->.c;\nnwr[\"amenity\"=\"place_of_worship\"][\"religion\"=\"muslim\"](area.c);\nout tags center;",
        },
        marks: ["timeout", "ISO3166-1", "place_of_worship", "center"],
      },
    },
    {
      id: "snapshot",
      kind: "case",
      focus: ["conv", "osm"],
      exchange: {
        edge: "fetch",
        request: {
          format: "text",
          head: "sent 2026-11-13 07:33:00 UTC",
          body: "curl -s https://overpass-api.de/api/interpreter --data-urlencode data@query.overpassql -o overpass.json",
        },
        response: {
          format: "json",
          head: "received 07:33:41 UTC (one element shown)",
          body: `{
  "osm3s": {
    "timestamp_osm_base": "2026-11-13T07:32:21Z",
    "timestamp_areas_base": "2026-11-13T04:27:32Z"
  },
  "elements": [
    {
      "type": "node",
      "id": 1300467475,
      "lat": 38.0659446,
      "lon": 66.9870089,
      "tags": { "amenity": "place_of_worship", "religion": "muslim", "name": "SAYROB jom\`e masjidi" }
    }
  ]
}`,
        },
        marks: ["timestamp_osm_base", "timestamp_areas_base", "type", "tags"],
      },
    },
    {
      id: "clean",
      kind: "fix",
      edges: { write: { from: "conv", to: "repo", rate: 1 } },
      focus: ["conv", "repo"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "python3 to_geojson.py overpass.json mosques.geojson   (standard library only)",
          body: "KEEP = (\"name\", \"name:uz\", \"name:ru\", \"addr:city\")   + osm_type, osm_id\nnode            -> its own lon, lat\nway, relation   -> the center Overpass computed\nno coordinates  -> skipped\nsort by (osm_type, osm_id), one feature per line, ensure_ascii=False",
        },
        response: {
          format: "json",
          head: "stdout",
          body: `{ "features": 2289, "by_type": { "node": 1511, "way": 740, "relation": 38 }, "osm_base": "2026-11-13T07:32:21Z" }`,
        },
        marks: ["KEEP", "center", "sort by", "features", "by_type"],
      },
    },
    {
      id: "format",
      kind: "case",
      focus: ["repo"],
      exchange: {
        edge: "write",
        request: {
          format: "json",
          head: "mosques/mosques.geojson, one line",
          body: `{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [66.9870089, 38.0659446] },
  "properties": {
    "osm_type": "node",
    "osm_id": 1300467475,
    "name": "SAYROB jom\`e masjidi",
    "name:ru": "..."
  }
}`,
        },
        marks: ["coordinates", "osm_type", "osm_id", "name"],
      },
    },
    {
      id: "alphabet",
      kind: "case",
      nodes: { bitg: { kind: "external", at: [12, 2] } },
      edges: { copy: { from: "bitg", to: "repo", rate: 1 } },
      focus: ["bitg", "repo"],
      exchange: {
        edge: "copy",
        request: {
          format: "text",
          head: "transcribed from dtwinuz/bitg crates/bitg-core/src/cyrillic.rs at 2de5c94 (2026-11-13)",
          body: "cyrillic_lower,cyrillic_upper,latin_lower,latin_upper,condition\nе,Е,ye,Ye,at the start of a word or after a vowel ... or after ъ or ь\nе,Е,e,E,elsewhere\nц,Ц,ts,Ts,after a vowel\nц,Ц,s,S,elsewhere\nш,Ш,ş,Ş,\nў,Ў,ö,Ö,",
        },
        response: {
          format: "text",
          head: "alphabet/README.md",
          body: "39 rows for 37 letters; two letters depend on the letter before them\nthe 2026 alphabet: O' -> Ö, G' -> Ğ, Sh -> Ş, Ch -> Ç (law O'RQ-1184 of 2026-10-21)\nif bitg changes its mapping, bitg is authoritative and this table is regenerated",
        },
        marks: ["condition", "elsewhere", "39 rows", "authoritative"],
      },
    },
    {
      id: "licence",
      kind: "case",
      focus: ["repo", "user"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "licence per folder",
          body: "mosques/mosques.geojson   ODbL 1.0, \"© OpenStreetMap contributors\"\n                          share an adapted database under the ODbL too\nquery + to_geojson.py     MIT\nalphabet/ CSV             MIT (derived from bitg, MIT OR Apache-2.0)\nexplorer                  copies the ODbL notice next to the data it serves",
        },
        marks: ["ODbL 1.0", "adapted database", "MIT", "ODbL notice"],
      },
    },
    {
      id: "quality",
      kind: "case",
      metrics: { unnamed: 152 },
      focus: ["app"],
      exchange: {
        edge: "browse",
        request: {
          format: "text",
          head: "explorer: Data quality and Regions pages",
          body: "named 2,137  unnamed 152   name:ru 1,297   name:uz 26   addr:city 178\ngeneric names       a name that only says mosque, by a pattern\napostrophes         six different characters used for the Uzbek o' and g'\nlikely duplicates   the same non-generic name within 150 m\nregions             nearest of 14 regional centres (haversine): an approximation for browsing",
        },
        marks: ["unnamed 152", "generic names", "six different characters", "150 m", "approximation"],
      },
    },
    {
      id: "build",
      kind: "fix",
      nodes: { ci: { kind: "worker", at: [12, 6] } },
      edges: { ship: { from: "ci", to: "site", rate: 1 } },
      focus: ["repo", "ci"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "node tools/build-demo.mjs -> dist/demo/uz-open-data/",
          body: "copy demo/ (plain HTML, CSS, JS) and the self-hosted fonts with their licences\ncopy mosques.geojson, query.overpassql, LICENSE-ODbL.md, the CSV into data/ unchanged\nscan every .html .js .css for forbidden text: IPv4, +998 phone, GitHub token, private key\nany hit -> exit 1, nothing is published",
        },
        marks: ["plain HTML", "unchanged", "forbidden text", "exit 1"],
      },
    },
    {
      id: "test",
      kind: "case",
      focus: ["ci", "app"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "npm run test:demo   (Playwright, tests/demo/smoke.spec.mjs)",
          body: "route #/<page> renders              one test per page\noverview counts match the dataset\ntable filters, sorts and pages through every feature\nmap selects a point and shows nearest mosques\npins can be added, noted and removed; reload resets them\nalphabet converter passes the bitg examples",
        },
        response: { format: "text", head: "result", body: "14 passed; converter 9/9 bitg examples" },
        marks: ["renders", "overview counts", "nearest mosques", "bitg examples", "14 passed"],
      },
    },
    {
      id: "publish",
      kind: "fix",
      focus: ["ci", "site"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "wonmortech/wonmor.io: the built explorer lives in public/demo/uz-open-data/ (#27)",
          body: "push to main -> npm run build (site check, privacy scan, link check)\nversion.txt = commit SHA; tar | ssh to a key bound to bin/receive (host key pinned)\nverify: poll https://wonmor.io/version.txt until it equals the SHA (20 x 3 s)\nsmoke: key pages 200, a missing page 404, CSP still has connect-src 'self'\nfailure after shipping -> rollback",
        },
        marks: ["public/demo/uz-open-data/", "bin/receive", "version.txt", "connect-src", "rollback"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "overpass-busy",
      from: "query",
      steps: [
        {
          id: "busy-bug",
          kind: "problem",
          metrics: { failed: 1 },
          focus: ["conv", "osm"],
          exchange: {
            edge: "fetch",
            request: {
              format: "text",
              head: "rebuild on a busy day",
              body: "curl -s https://overpass-api.de/api/interpreter --data-urlencode data@query.overpassql -o overpass.json",
            },
            response: {
              format: "text",
              head: "HTTP/1.1 504 Gateway Timeout",
              body: "overpass.json now holds an error page, not JSON\nthe public Overpass servers are shared and answer 502 or 504 under load",
            },
            marks: ["error page", "502 or 504"],
          },
        },
        {
          id: "busy-fix",
          kind: "fix",
          metrics: { failed: 0, features: 2289 },
          focus: ["conv", "osm"],
          exchange: {
            edge: "fetch",
            request: {
              format: "text",
              head: "what the README asks",
              body: "wait and retry; do not hammer a shared server\nthe query already carries [timeout:150]\nthe converter reads elements and prints a stats line: a bad file is visible at once\ncommit only when the stats line shows the expected shape",
            },
            marks: ["wait and retry", "timeout:150", "stats line"],
          },
        },
      ],
    },
    {
      id: "count-drift",
      from: "snapshot",
      steps: [
        {
          id: "drift-bug",
          kind: "problem",
          metrics: { unexplained: 4 },
          focus: ["repo", "user"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "two numbers for the same filter",
              body: "post \"Mosques from OpenStreetMap\"   2,285 congregations, its own earlier import\nmosques.geojson                    2,289 features, pulled on 2026-11-13\nquestion                           which one is wrong?",
            },
            marks: ["2,285", "2,289", "which one is wrong"],
          },
        },
        {
          id: "drift-fix",
          kind: "fix",
          metrics: { unexplained: 0 },
          focus: ["repo"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "mosques/README.md, Snapshot table",
              body: "Query sent            2026-11-13 07:33:00 UTC\nResponse received     2026-11-13 07:33:41 UTC\ntimestamp_osm_base    2026-11-13T07:32:21Z\nEndpoint              https://overpass-api.de/api/interpreter\nnote                  OpenStreetMap is edited continuously; this file is a new pull, not a copy of that import",
            },
            marks: ["Query sent", "timestamp_osm_base", "Endpoint", "new pull"],
          },
        },
      ],
    },
  ],
});
