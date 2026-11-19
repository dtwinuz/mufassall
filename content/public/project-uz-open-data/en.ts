import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: uz-open-data, open datasets with their recipe attached",
  summary:
    "uz-open-data is a small public repository from wonmortech: 2,289 mosques in Uzbekistan from OpenStreetMap as GeoJSON, and the Uzbek Cyrillic to 2026 Latin letter table. Every dataset sits next to the exact query or source it came from, so anyone can rebuild it with one curl and one python3. The whole pipeline: who uses the data and how, fetching from Overpass, cleaning to a small stable format, the transliteration table and its rules, licences per folder, the data-quality view, and how the browser explorer is built, tested and published.",
  learn: [
    "The user side: download the file in one line, browse it in the explorer, convert Cyrillic to the 2026 Latin alphabet",
    "The data pipeline: Overpass query, snapshot timestamps, a standard-library converter, a sorted one-feature-per-line GeoJSON",
    "Why values are never corrected here, why the licence is per folder, and what the ODbL asks of a reuser",
    "How the explorer is assembled, scanned for leaks, smoke-tested and deployed with proof and rollback",
  ],
  nodes: {
    user: "Data user",
    repo: "uz-open-data repo",
    app: "Explorer in the browser",
    site: "wonmor.io",
    conv: "Rebuild script",
    osm: "Overpass API",
    bitg: "bitg converter",
    ci: "Build and deploy",
  },
  metrics: {
    features: "Mosques in the dataset",
    unnamed: "Mosques without a name tag",
    failed: "Failed rebuilds left in the file",
    unexplained: "Unexplained count difference",
  },
  steps: {
    what: {
      short: "What it is",
      title: "Small datasets, each with its recipe",
      body: "Open data about Uzbekistan is often a PDF table or a spreadsheet nobody can rebuild. `wonmortech/uz-open-data` takes the opposite approach: each dataset is small, sits in its own folder, and the folder holds the exact query or source it was built from.\n\nToday there are two. `mosques/` is a snapshot of every OpenStreetMap object in Uzbekistan tagged as a Muslim place of worship: 2,289 features. `alphabet/` is a table of how each Uzbek Cyrillic letter is written in the 2026 Latin alphabet, transcribed from the open converter bitg. A third, Uzbek word lists, is planned, and the README says nothing is published for it yet.\n\nOne rule shapes everything: values are copied as they are in the source. If a mosque's name is misspelled, the fix belongs in OpenStreetMap, where every map using the data gets it.",
      fields: {
        "mosques/": "GeoJSON, the Overpass query and the converter, side by side.",
        "alphabet/": "A CSV with the two context rules spelled out.",
        planned: "Announced but not published: the repo does not pretend.",
        "corrections belong upstream": "This repo is a mirror with a recipe, not a second source of truth.",
      },
    },
    use: {
      short: "Download",
      title: "One line to download, five lines to use",
      body: "The most common user is a developer or a researcher who needs the points. The README's quick start is the whole journey: download the raw file with `curl`, open it with Python's standard `json` module and count. The output `2289 2137` is printed in the README, so a reader can check they got the same file: 2,289 features, 2,137 of them with a `name`.\n\nEach feature is a GeoJSON Point in WGS 84 with `osm_type` and `osm_id`, so `openstreetmap.org/<osm_type>/<osm_id>` opens the original object, its history and who mapped it. The file opens directly in QGIS, geojson.io or any GIS tool, with no API key and no account.",
      fields: {
        curl: "The raw file from the repo: no API, no rate limit, no key.",
        encoding: "Names are in Uzbek, Russian and mixed scripts: read as UTF-8.",
        named: "Only some objects have a name tag; the count says how many.",
        "2289 2137": "The expected output, printed in the README, so you can verify your copy.",
      },
    },
    explore: {
      short: "Explorer",
      title: "An explorer that loads exactly these files",
      body: "Not everyone writes Python. The live demo at `wonmor.io/demo/uz-open-data/` is an explorer that loads the same files in the browser: a map with filters and a density layer, a searchable table with CSV and GeoJSON export, a page per mosque with its nearest neighbours, a data-quality report and a converter.\n\nSearch works in Latin or Cyrillic and ignores apostrophes, because the same name is written with several different apostrophe characters. The pinned list is for planning a mapping trip and lives only in memory: it resets on reload. **Why no map tiles:** tiles would mean a third-party request for every visitor. Borders are drawn from Natural Earth (public domain), so the page makes no third-party requests at all.",
      fields: {
        Map: "Points drawn over simple borders, coloured by OSM type.",
        Table: "Every feature, searchable and exportable.",
        "apostrophes ignored": "o', o` and others match the same name.",
        Pinned: "Nothing is stored: a mapping list for one session.",
        "no tiles": "No backend and no third-party requests: the page works offline once loaded.",
      },
    },
    "convert-text": {
      short: "Converter",
      title: "Cyrillic in, 2026 Latin out",
      body: "The second user journey is text. Uzbekistan moves to an updated Latin alphabet in 2026, and much existing text is in Cyrillic. The explorer's converter applies the letter table to whatever you paste, live.\n\nThe examples on screen are bitg's own unit tests: the letter e becomes ye at the start of a word or after a vowel, ts becomes s at the start of a word but stays ts after a vowel, the hard sign becomes the tutuq mark U+02BC, and a capital letter that turns into two Latin letters keeps only the first one capital unless the whole word is in capitals. The README warns about the limit: a letter table does not know names and foreign words, so for running text the full bitg converter is the right tool.",
      fields: {
        yer: "e at the start of a word: ye.",
        poyezd: "e after a vowel: ye.",
        litsey: "ts after a vowel stays ts.",
        sirk: "Elsewhere it is s: a known trap for loanwords.",
        "U+02BC": "The tutuq character bitg uses by default, not an ASCII apostrophe.",
        Yangi: "Title case for a word that starts with a two-letter sound.",
      },
    },
    query: {
      short: "Fetch",
      title: "Fetch: one Overpass query",
      body: "The pipeline starts with a query to the Overpass API, the read-only query service over OpenStreetMap. The query is four lines and lives in `query.overpassql`, unchanged from the post that first described it: find the national boundary of Uzbekistan by its ISO code, select every node, way and relation tagged `amenity=place_of_worship` and `religion=muslim` inside it, and print tags plus a centre point.\n\n**Why Overpass and not a full OSM extract:** an extract of the country is hundreds of megabytes and needs a toolchain; this query returns exactly the objects needed in under a minute. `out tags center` asks for tags and one point per object, so buildings drawn as outlines (ways) and complexes (relations) get a single coordinate.",
      fields: {
        timeout: "The server may take up to 150 s before giving up.",
        "ISO3166-1": "The boundary is found by country code, not by a hand-drawn box.",
        place_of_worship: "The same filter as the post, so numbers are comparable.",
        center: "Ways and relations get a computed centre point.",
      },
    },
    snapshot: {
      short: "Snapshot",
      title: "A snapshot is a moment, so record the moment",
      body: "OpenStreetMap changes every minute, so a dataset from it is only meaningful with a date. The response itself says how fresh its data is: `timestamp_osm_base` is when the OSM data was last updated on that server, `timestamp_areas_base` when the area boundaries were last computed.\n\nThe mosques README records all of it in a Snapshot table: the query was sent at 07:33:00 UTC on 2026-11-13, the response arrived 41 seconds later, OSM data as of 07:32:21, areas as of 04:27:32, and the endpoint. Anyone who rebuilds later will get a slightly different file, and these lines explain why.",
      fields: {
        timestamp_osm_base: "The age of the data, not of the request.",
        timestamp_areas_base: "Boundaries are recomputed less often than the data.",
        type: "node, way or relation: decides where the coordinate comes from.",
        tags: "Free-form key-value pairs entered by mappers.",
      },
    },
    clean: {
      short: "Clean",
      title: "Clean: a converter that only uses the standard library",
      body: "`to_geojson.py` turns the Overpass response into GeoJSON. It keeps four tags (`name`, `name:uz`, `name:ru`, `addr:city`) plus the object's type and id, and nothing else, so the file is small and carries no stray personal tags. A node keeps its own coordinates; a way or relation takes the centre Overpass computed; an element without coordinates is skipped.\n\nFeatures are sorted by type and id and written one per line, with non-ASCII characters kept as they are. **Why:** the next rebuild produces a git diff a person can read, one line per changed mosque. The script prints a stats line, so a bad run is visible at once. It uses only the Python standard library: nothing to install, nothing that can break later.",
      check: {
        q: "Why sort features by (osm_type, osm_id) and write one per line?",
        options: [
          "GeoJSON requires sorted features",
          "So that a rebuild gives a small, readable git diff: one changed line per changed mosque",
          "To make the file smaller",
        ],
        answer: 1,
        why: "Overpass returns elements in no promised order. Sorting and one feature per line turn a re-run into a reviewable diff instead of a whole-file rewrite.",
      },
      fields: {
        KEEP: "The whole list of tags that survive.",
        center: "Ways and relations become points.",
        "sort by": "A stable order makes diffs meaningful.",
        features: "2,289 points written.",
        by_type: "1,511 nodes, 740 ways, 38 relations: matches the README.",
      },
    },
    format: {
      short: "Format",
      title: "The format a consumer gets",
      body: "Every line of the file is one feature like this: a Point with `[longitude, latitude]` in WGS 84 and a properties object. `osm_type` and `osm_id` are always present; the four name and address fields only when mappers entered them.\n\nThe example shows what \"values unchanged\" means in practice: the name is written exactly as the mapper typed it, here with a backtick as the apostrophe, and the Russian name is kept in its own field. The dataset does not transliterate or normalise; the explorer's quality page shows such spellings so someone can fix them in OpenStreetMap.",
      fields: {
        coordinates: "Longitude first, as GeoJSON requires.",
        osm_type: "Always present: needed to build the link back to OSM.",
        osm_id: "Always present: the object's permanent number.",
        name: "As entered; may be missing, may use any apostrophe.",
      },
    },
    alphabet: {
      short: "Alphabet",
      title: "Transliterate: a letter table copied from working code",
      body: "The alphabet table is not written from scratch. It is transcribed from bitg's Rust source at a pinned commit (`2de5c94`, 2026-11-13), because bitg is the converter people actually run and its rules are covered by unit tests. The README names the file, the functions and the commit, and says that if bitg changes, bitg wins and the table is regenerated.\n\nThe CSV has 39 rows for 37 letters: two letters depend on the one before them, so each gets two rows with a condition. The 2026 alphabet replaces four letters of the previous Latin alphabet (O' to Ö, G' to Ğ, Sh to Ş, Ch to Ç), per law O'RQ-1184 of 2026-10-21 as cited in the bitg README.",
      check: {
        q: "Why transcribe the table from bitg at a pinned commit instead of writing it from the law?",
        options: [
          "Because the law text is not public",
          "So the table matches a tested implementation exactly, and anyone can check it against that commit",
          "Because CSV cannot express the rules",
        ],
        answer: 1,
        why: "One source of truth: the table reproduces what a tested converter does at a known commit, instead of becoming a second, slightly different interpretation.",
      },
      fields: {
        condition: "Empty means always; otherwise the rule in words.",
        elsewhere: "The fallback row for a context-dependent letter.",
        "39 rows": "37 letters, two of them with two rows.",
        authoritative: "If they disagree, bitg is right and the table is rebuilt.",
      },
    },
    licence: {
      short: "Licence",
      title: "A licence per folder",
      body: "Data and code have different licences, and the repo keeps them apart by folder. The mosques data comes from OpenStreetMap, so it stays under the Open Database License 1.0 with the attribution \"© OpenStreetMap contributors\"; anyone who publishes an adapted database must share it under the ODbL too. The query, the converter and the letter table are MIT.\n\n**Why it matters to a user:** a company can use the mosque points in an app, but must credit OpenStreetMap, and an improved copy of the database must stay open. A `LICENSE-ODbL.md` next to the data explains this in plain words, and the explorer copies that notice next to the data it serves.",
      check: {
        q: "A startup merges the mosques with its own opening hours and publishes the combined database. What does the ODbL ask?",
        options: [
          "Nothing, the data is free",
          "Keep the OpenStreetMap attribution and share the adapted database under the ODbL",
          "Pay a fee to OpenStreetMap",
        ],
        answer: 1,
        why: "The ODbL is share-alike for databases: attribution plus the same licence for adapted databases. Produced works such as a rendered map have lighter duties.",
      },
      fields: {
        "ODbL 1.0": "The licence of all OpenStreetMap data.",
        "adapted database": "Share-alike applies to the database, not to every app that uses it.",
        MIT: "Code and the table: use freely, keep the notice.",
        "ODbL notice": "The explorer carries the licence with the data it shows.",
      },
    },
    quality: {
      short: "Quality",
      title: "Show the gaps instead of hiding them",
      body: "The explorer's data-quality page counts what is missing or odd: 2,137 named and 152 unnamed, 1,297 with a Russian name, only 26 with an explicit Uzbek name, 178 with a city. It lists generic names (a name that only says mosque), six different characters used as the Uzbek apostrophe, and likely duplicates: the same non-generic name within 150 m.\n\nNothing here edits the data. These are pointers for mappers to fix in OpenStreetMap. The Regions page is honest in the same way: it assigns each mosque to the nearest of 14 regional centres by great-circle distance and calls that an approximation for browsing, not an administrative boundary.",
      check: {
        q: "The quality page finds two mosques with the same name 80 m apart. What does the project do?",
        options: [
          "Delete one of them from mosques.geojson",
          "Nothing in the file: it is shown as a likely duplicate so a mapper can check and fix it in OpenStreetMap",
          "Merge them automatically in to_geojson.py",
        ],
        answer: 1,
        why: "Values are copied unchanged; a correction made only here would be lost on the next rebuild and would never reach other maps.",
      },
      fields: {
        "unnamed 152": "Objects tagged as mosques but without a name.",
        "generic names": "A name that says only what the object is.",
        "six different characters": "Why search ignores apostrophes.",
        "150 m": "Close enough to be the same building drawn twice.",
        approximation: "Nearest centre, not the legal boundary: said on the page.",
      },
    },
    build: {
      short: "Build",
      title: "Build the explorer, and refuse to publish leaks",
      body: "The datasets need no build. The explorer is plain HTML, CSS and JavaScript, and `tools/build-demo.mjs` assembles it into a folder that works under any sub-path: it copies the page, the self-hosted fonts with their licences, and the datasets themselves into `data/` unchanged, with the ODbL notice.\n\nThen it scans every HTML, JS and CSS file it produced for text that must never be published: IPv4 addresses, Uzbek phone numbers, GitHub tokens and private keys. One hit and the build exits with an error. **Why in the build:** the explorer is copied into another repository and served from there; this is the last point where its own repo can stop a mistake.",
      fields: {
        "plain HTML": "No framework: the files served are the files in the repo.",
        unchanged: "The explorer shows exactly what the repository holds.",
        "forbidden text": "A small list of patterns that would mean a leak.",
        "exit 1": "A failed scan means no output to publish.",
      },
    },
    test: {
      short: "Test",
      title: "Smoke tests in a real browser",
      body: "`npm run test:demo` runs Playwright against the built explorer: every route renders, the overview counts match the dataset, the table filters and pages through every feature, clicking a map point shows the nearest mosques, pins can be added, noted and removed and reset on reload, and the converter passes bitg's examples.\n\n14 tests pass, and the converter matches all 9 bitg examples. OpenSSF Scorecard runs on the repo, actions are kept up to date by Dependabot, and CODEOWNERS routes every change to a maintainer.",
      fields: {
        renders: "One test per page: no blank route ships.",
        "overview counts": "The numbers on screen are the numbers in the file.",
        "nearest mosques": "The map interaction works end to end.",
        "bitg examples": "The browser converter agrees with the Rust implementation.",
        "14 passed": "The whole smoke suite.",
      },
    },
    publish: {
      short: "Publish",
      title: "Publish through wonmor.io, with proof and rollback",
      body: "The built explorer is placed in the public `wonmortech/wonmor.io` repository under `public/demo/uz-open-data/` (added in PR #27, together with the other product demos) and goes live with that site's deploy.\n\nThat pipeline runs on every push to main: build with its own checks (site check, privacy scan, link check), stamp the commit SHA into `version.txt`, and send a tarball over SSH to a key that can only run `bin/receive`. CI then polls `wonmor.io/version.txt` until it shows the SHA (up to 20 tries, 3 s apart), smoke-tests key pages, a 404 and the CSP, and runs `rollback` if anything fails after shipping.",
      check: {
        q: "The SSH upload succeeded but the live version.txt still shows the old SHA after a minute. What happens?",
        options: [
          "CI reports success anyway",
          "The verify step fails, and because shipping succeeded, the rollback step runs",
          "The deploy waits forever",
        ],
        answer: 1,
        why: "Proof is the served SHA, not the upload. After 20 tries the step fails; the rollback step runs when the ship step succeeded and a later step failed.",
      },
      fields: {
        "public/demo/uz-open-data/": "The demo is a static folder inside the site repo.",
        "bin/receive": "A forced command: the CI key can publish or roll back, nothing else.",
        "version.txt": "The live site says which commit it serves.",
        "connect-src": "The smoke test fails if the public CSP was widened.",
        rollback: "The previous release is one symlink swap away.",
      },
    },
    recap: {
      short: "Recap",
      title: "uz-open-data in one screen",
      body: "**User side:** download one GeoJSON with curl and verify it with the printed `2289 2137`; browse it in an explorer with map, table, export, quality report and a Cyrillic to 2026 Latin converter; no account, no key, no third-party requests.\n\n**Data pipeline:** a four-line Overpass query, snapshot timestamps written down, a standard-library converter that keeps four tags, takes centres for ways and relations and sorts for readable diffs; a letter table transcribed from bitg at a pinned commit, with its context rules.\n\n**Rules:** values unchanged, corrections upstream; ODbL for OSM data with attribution and share-alike, MIT for code; gaps shown, not hidden.\n\n**Pipelines:** build with a leak scan, Playwright smoke tests and converter checks, Scorecard; published through wonmor.io with SHA proof, smoke test and rollback.",
    },
  },
  scenarios: {
    "overpass-busy": {
      label: "Overpass busy",
      steps: {
        "busy-bug": {
          short: "504",
          title: "A shared server says 504",
          body: "The public Overpass servers are shared by everyone, and the README warns that under load they answer 502 or 504. With `curl -s -o overpass.json`, the error page is written into the file just like a real answer.",
          fields: {
            "error page": "The file exists, so a careless script would carry on.",
            "502 or 504": "Load on a shared service, not a bug in the query.",
          },
        },
        "busy-fix": {
          short: "Retry",
          title: "Wait, retry, and trust the stats line",
          body: "The README's advice is to wait and retry rather than hammer a shared server. The converter reads the response's `elements` and prints a stats line with counts by type and the data timestamp, so a broken or partial response shows at once, and nothing is committed until the numbers look right.",
          fields: {
            "wait and retry": "Politeness toward a free public service is part of the recipe.",
            "timeout:150": "The query already gives the server time to finish.",
            "stats line": "Counts and timestamps make a bad file obvious before commit.",
          },
        },
      },
    },
    "count-drift": {
      label: "Count drift",
      steps: {
        "drift-bug": {
          short: "2,285 or 2,289",
          title: "Two numbers for the same filter",
          body: "The wonmor.io post that first described the filter reported 2,285 congregations. The dataset in this repo has 2,289 features with the same filter. A reader comparing them would reasonably ask which one is wrong.",
          fields: {
            "2,285": "The post's own import, from an earlier date.",
            "2,289": "The snapshot pulled on 2026-11-13.",
            "which one is wrong": "Without dates, a difference looks like an error.",
          },
        },
        "drift-fix": {
          short: "Dated",
          title: "Write down when, and the difference explains itself",
          body: "The mosques README answers it in the snapshot table: when the query was sent, when the response arrived, how fresh the OSM data was and which endpoint answered, plus one sentence: OpenStreetMap is edited continuously, and this file is a new pull, not a copy of the post's import. Neither number is wrong.",
          fields: {
            "Query sent": "The moment of the pull.",
            timestamp_osm_base: "The age of the data the server answered from.",
            Endpoint: "Which server; another mirror may lag.",
            "new pull": "Expected drift, stated in advance.",
          },
        },
      },
    },
  },
};

export default text;
