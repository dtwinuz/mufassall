import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Design a video streaming site",
  summary:
    "Creators upload hour-long 4K videos, viewers watch on phones over shaky mobile links, and a premiere brings 200 000 people at once. A video site built step by step: resumable uploads, a transcoding pipeline, HLS with adaptive bitrate, a CDN, view counting and cold storage.",
  learn: [
    "Why a big upload goes straight to storage in resumable parts",
    "Transcoding into a bitrate ladder, in parallel chunks",
    "HLS segments and playlists, and how the player switches quality",
    "CDN in front of the origin, counting views without a hot row, hot and cold storage",
  ],
  nodes: {
    creator: "Creator",
    upload: "Upload API",
    raw: "Raw uploads",
    viewer: "Viewer",
    queue: "Transcode queue",
    workers: "Transcoders",
    media: "Video storage",
    cdn: "CDN",
    counter: "View counter",
    videos: "Videos DB",
    cold: "Cold storage",
  },
  metrics: {
    start: "Time to first frame",
    rebuffer: "Rebuffering",
    ready: "Upload to playable",
    origin: "Origin traffic",
    cost: "Storage cost",
  },
  steps: {
    upload: {
      short: "Upload",
      title: "A 2 GB file in one request",
      body: "A creator uploads a one-hour 4K video, 2 GB, from a hotel. The app sends it as one POST to the upload API, which streams it on to storage.\n\nAfter 23 minutes and 1.4 GB the Wi-Fi drops. The request fails, nothing is kept, and the upload starts from zero. Meanwhile each open upload holds an API server connection for half an hour.",
      fields: {
        "Content-Length": "2 GB in one body. Any break loses all of it.",
        "1.4 GB": "Almost three quarters sent, and thrown away.",
        "504": "The gateway gave up waiting. The creator sees \"upload failed\".",
      },
    },
    resumable: {
      short: "Resumable",
      title: "Upload straight to storage, in parts",
      body: "The upload API now only checks the creator and hands out signed links, one per 16 MB part. The app sends parts straight to storage, several at once, and storage remembers which parts arrived.\n\nAfter a drop the app asks which parts are stored and sends only the missing ones. The API servers no longer carry video bytes at all.",
      watch: "Keep large bytes off your app servers: they should hand out permissions, not pipe files.",
      fields: {
        partNumber: "Part 88 of 128. Parts can arrive in any order.",
        "Content-Length": "16 MB per part: small enough to resend cheaply.",
        ETag: "Storage's receipt for the part. The final \"complete\" call lists them all.",
        "only part 88": "A drop costs one part, not the whole file.",
      },
    },
    "play-raw": {
      short: "Raw file",
      title: "Playing the original on a phone",
      body: "The first version plays the uploaded file as it is. It is 4K at 45 Mbit/s, and a viewer on a phone has a 4 Mbit/s link.\n\nThe player downloads more than ten times slower than it plays. The first frame takes 14 seconds and the video stops every few seconds to buffer. The phone could not even show 4K on its small screen.",
      fields: {
        Range: "The player asks for bytes from the start. It can only play what has arrived.",
        "45 Mbit/s": "What the original needs to play without pauses.",
        "4 Mbit/s": "What the viewer actually has. Eleven times less.",
      },
    },
    transcode: {
      short: "Transcode",
      title: "Transcode into a bitrate ladder, in chunks",
      body: "When the upload completes, storage puts a job in the transcode queue. Workers re-encode the video into a ladder: 1080p, 720p, 480p and 240p, each at its own bitrate.\n\nOne worker would need about an hour for a one-hour video. So the video is cut into one-minute chunks, 60 workers encode them in parallel, and the pieces are joined. The video is playable 12 minutes after upload.",
      check: {
        q: "A one-hour video, one worker encodes at about real time. With 60 one-minute chunks on 60 workers, roughly how long until it is ready?",
        options: [
          "A few minutes plus splitting, queueing and joining",
          "Still about an hour: encoding cannot be split",
          "One minute exactly",
        ],
        answer: 0,
        why: "Each chunk takes about a minute of work, and they run at once. Splitting the file, waiting for free workers, joining the pieces and slow chunks add a little more, so it is minutes, not an hour and not exactly one minute.",
      },
      fields: {
        chunk: "Chunk 17 of 60. Each chunk is an independent job.",
        from_s: "The chunk covers seconds 960 to 1020 of the video.",
        ladder: "Every chunk is encoded into all qualities, so any rendition can be joined.",
      },
    },
    hls: {
      short: "HLS",
      title: "HLS: playlists and 6-second segments",
      body: "Each rendition is cut into 6-second segments, small files with names like `seg_042.m4s`. A master playlist lists the renditions with their bitrate and resolution; each rendition has its own playlist of segments.\n\nThe player downloads the master playlist, picks a rendition and fetches segments one by one. It can start after the first segment instead of waiting for a large file: the first frame now comes in 2 seconds.",
      fields: {
        "master.m3u8": "The entry point: which qualities exist.",
        BANDWIDTH: "Bits per second this rendition needs. The player compares it with the link.",
        RESOLUTION: "The frame size. A phone does not need more than its screen.",
        "6-second segments": "Plain files over plain HTTP. Any web server or CDN can serve them.",
      },
    },
    abr: {
      short: "Adaptive",
      title: "Adaptive bitrate: quality follows the link",
      body: "The viewer enters a metro station. The player measures that the last segment came at 1.9 Mbit/s and its buffer is down to 7 seconds. For the next segment it picks 480p instead of 1080p.\n\nThe picture gets softer for a while, but it does not stop. When the buffer is full again, the player climbs back up. Segments of all renditions start at the same moments, so a switch is seamless.",
      check: {
        q: "Why can the player switch quality in the middle of a video at all?",
        options: [
          "The server re-encodes the video live for each viewer",
          "The player lowers the resolution itself while decoding",
          "Every rendition is cut at the same timestamps, so segment 42 of any quality fits",
        ],
        answer: 2,
        why: "The renditions were encoded with aligned segment borders. The player can take segment 41 from 1080p and segment 42 from 480p, and the timeline stays continuous. Nothing is encoded for the viewer on the fly.",
      },
      fields: {
        measured: "Download speed of the last segments: the player's estimate of the link.",
        buffer: "Seconds of video already downloaded. Low buffer means stepping down now.",
        "480p": "A lower rung of the ladder for the next segment only.",
      },
    },
    premiere: {
      short: "Premiere",
      title: "A premiere: 200 000 viewers at once",
      body: "A popular channel premieres a new video at 20:00. 200 000 viewers press play in the same minute, each pulling about 5 Mbit/s.\n\nThat is 1 Tbit/s from one storage bucket in one region. The storage starts throttling, the first byte takes almost 5 seconds, and viewers far from the region suffer the most.",
      fields: {
        "200000 viewers": "All watching the same segments in the same minutes.",
        "1 Tbit/s": "Far beyond what one origin and one network uplink should carry.",
        "Slow Down": "The storage throttles requests. The player sees stalls.",
      },
    },
    cdn: {
      short: "CDN",
      title: "Segments from the CDN",
      body: "A CDN stands in front of the video storage. Viewers fetch segments from the nearest edge; only the first request for each segment goes back to the origin.\n\nSegments never change after they are written, so the CDN may keep them for a year. The origin traffic drops from 1 Tbit/s to about 20 Gbit/s. A live stream's playlist does change, so it gets a TTL of a second or two.",
      watch: "Name segments so they never change. Then caching them forever is safe, and only playlists need a short TTL.",
      fields: {
        "Cache-Control": "Immutable for a year. A new encode gets new file names instead.",
        "X-Cache": "Served from the edge. The origin did not see this request.",
        Age: "The edge has held this copy for 312 seconds.",
      },
    },
    views: {
      short: "Views",
      title: "One row for every view",
      body: "The player reports a heartbeat while it plays, and the counter adds one to the video's row for each. During the premiere that is 40 000 updates a second, all on the same row.\n\nEach update waits for a lock on that row. Updates queue up, the database is at 100%, and other queries on the videos table slow down with it.",
      check: {
        q: "How do you count 40 000 heartbeats a second without a hot row?",
        options: [
          "A faster database server for the videos table",
          "Count in memory per time window, then write one sum per video",
          "Drop the view counter during premieres",
        ],
        answer: 1,
        why: "A faster server only raises the ceiling a little: every update still takes the same row's lock. Summing in a window turns 40 000 writes a second into one write per video per minute.",
      },
      fields: {
        "views + 1": "One write per heartbeat. The work grows with the audience.",
        "lock wait": "Every update queues behind the previous one on the same row.",
        "one row": "All writes go to one place, so adding servers does not help.",
      },
    },
    "view-batch": {
      short: "Batch",
      title: "Count in windows, write once a minute",
      body: "The counter now sums heartbeats in memory for one minute. It also decides what a view is: at least 30 seconds watched, counted once per session, so reloads do not inflate it.\n\nOnce a minute it writes one number per video. The database sees one update a minute for the premiere instead of 40 000 a second. The count on the page lags by up to a minute, and nobody minds.",
      watch: "An exact, real-time counter is rarely worth its cost. Decide how stale and how precise it may be.",
      fields: {
        window: "One minute of heartbeats, summed in memory.",
        "30 s": "The rule for what counts as a view.",
        "one per session": "Reloading the page does not add views.",
        "41700": "One write with the minute's total.",
      },
    },
    cold: {
      short: "Cold storage",
      title: "Hot and cold storage",
      body: "Most views go to a small share of videos; most videos are watched a handful of times a year. All renditions of all of them sit in fast storage and cost $18 000 a month.\n\nA lifecycle rule moves videos with fewer than 10 views in 90 days to cold storage, keeping only 480p hot so they still start quickly. The raw uploads are deleted after 30 days. Cost drops to $7 000 a month, and a rare viewer of an old video waits a few seconds more.",
      fields: {
        rule: "Which videos count as cold: watched less than 10 times in 90 days.",
        move_to: "A cheaper class: lower price per GB, slower first byte.",
        keep_hot: "One rendition stays fast, so even an old video starts at once.",
        delete_raw_after_days: "The 4K original is no longer needed once the ladder is built.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six decisions for a video site.\n\n1) Uploads go straight to storage in resumable parts; app servers only sign. 2) Transcode into a bitrate ladder, in parallel chunks. 3) Serve HLS: playlists plus small aligned segments. 4) Let the player adapt quality to the link and buffer. 5) Put a CDN in front; immutable segment names make caching safe. 6) Count views in windows, and move the long tail to cold storage.",
    },
  },
};

export default text;
