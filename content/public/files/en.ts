import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "File uploads",
  summary:
    "A video app where phones upload 180 MB files and thousands watch them. Why bytes should not pass through your API, and how presigned URLs, multipart upload, a worker and a CDN share the job.",
  learn: [
    "Why uploads through the app server are slow and fill its disk",
    "Presigned URLs: the API signs, the phone uploads straight to storage",
    "Multipart upload: resume a failed part instead of the whole file",
    "Thumbnails and transcoding in a worker, delivery through a CDN, only metadata in the database",
  ],
  nodes: {
    phone: "Phone app",
    api: "API",
    disk: "API disk",
    bucket: "Object storage",
    db: "Database",
    queue: "Queue",
    worker: "Media worker",
    viewer: "Viewers",
    cdn: "CDN",
  },
  metrics: {
    upload: "Upload p95",
    failed: "Failed uploads",
    cost: "Monthly cost",
  },
  steps: {
    "through-api": {
      short: "Via API",
      title: "Every byte goes through the API",
      body: "A user uploads a 180 MB video from a phone. The app posts it to the API, the API reads the whole stream and writes it to its local disk.\n\nFor a minute and a half one API worker does nothing but copy bytes. With a few dozen uploads at once there are no workers left for ordinary requests.",
      watch: "An app server is built for many short requests. A long upload holds a connection, memory and a worker the whole time.",
      fields: {
        Authorization: "The user's token. A secret, hidden here.",
        "Content-Length": "180 MB in one request body. A drop at 99% means starting again.",
        "X-Response-Time": "94 seconds for one request. Load balancers and proxies often cut at 60.",
      },
    },
    "disk-full": {
      short: "Disk full",
      title: "The disk fills up, the other server has no file",
      body: "Videos pile up on the API's own disk until a write fails. Uploads start to fail, and the whole server goes down with them.\n\nThere is a second problem: there are two API servers behind a load balancer. A file saved on `api-1` does not exist on `api-2`, so half of the views return 404.",
      fields: {
        "no space left on device": "The local disk is full. Every write on this server now fails, not only uploads.",
        "404": "The file lives on another server's disk. Local disks do not scale out with the servers.",
      },
    },
    presign: {
      short: "Presign",
      title: "The API signs, the phone uploads",
      body: "Files now live in object storage: a separate service built for large objects, with no disk to fill. The phone asks the API for permission and gets a short-lived signed URL.\n\nThe bytes go straight from the phone to storage. The API only checks who the user is and how big the file may be. Its load falls to 10%.",
      watch: "Sign the size and the content type too, or the URL becomes free storage for anyone who gets it.",
      fields: {
        size: "The API checks the limit before it signs anything. A 5 GB file is refused here, not after the upload.",
        url: "Where to send the bytes. Not the API: object storage.",
        expires_in: "The permission is valid for 15 minutes. A leaked URL soon stops working.",
        "X-Upload-Signature": "The API's signature over the key, size and expiry. Storage checks it without calling the API. Hidden here.",
      },
    },
    flaky: {
      short: "Flaky net",
      title: "Mobile network: 80% done, start again",
      body: "One `PUT` carries the whole 180 MB. On a phone in a moving bus the connection drops at 151 MB.\n\nThe app has to start from the first byte. On a weak network a large file may never finish, and every attempt burns the user's mobile data.",
      fields: {
        "Content-Length": "The whole file in one request: all or nothing.",
        "connection reset": "The network dropped mid-upload. Everything sent so far is lost.",
        "byte 0": "The retry starts from the very beginning.",
      },
    },
    multipart: {
      short: "Multipart",
      title: "Multipart: the file in 8 MB parts",
      body: "The upload is split into 23 parts of 8 MB. The phone sends several in parallel and retries only the part that failed. At the end it tells storage to join the parts into one object.\n\nA dropped connection now costs at most 8 MB. Failed uploads fall below half a percent.",
      watch: "Unfinished multipart uploads take space until removed. Set a storage rule that deletes them after a day.",
      fields: {
        uploadId: "One multipart upload. Every part refers to it.",
        partNumber: "Part 17 of 23. Parts may arrive in any order.",
        "Content-Length": "8 MB: a small enough piece to resend on a weak network.",
        ETag: "Storage's checksum of this part. The final call lists all the ETags in order.",
      },
    },
    metadata: {
      short: "Metadata",
      title: "In the database: a row, not the file",
      body: "When the upload finishes, the phone tells the API. The API checks that the object really exists and writes one row: whose video it is, where it lies, how big it is and what state it is in.\n\nThe database stores facts about the file, never its bytes. The bytes stay in storage, and the row points to them by key.",
      fields: {
        object_key: "The path of the object in storage. The only link between the row and the bytes.",
        status: "`uploaded`: the raw file is there, but it is not ready to watch yet.",
      },
    },
    "sync-transcode": {
      short: "Transcode",
      title: "Transcoding inside the request",
      body: "Viewers need a 720p version and a thumbnail. The first version did it right in the API: download the raw file, run the converter, upload the result.\n\nOne video takes 68 seconds of full CPU. Other requests queue behind it, the health check times out and the load balancer takes the server out of rotation.",
      fields: {
        transcode: "Converting video is heavy CPU work that takes minutes, not milliseconds.",
        queued: "Ordinary requests wait behind the heavy job.",
        "timed out": "The load balancer thinks the server is dead and stops sending it traffic.",
      },
    },
    worker: {
      short: "Worker",
      title: "Storage event, queue, worker",
      body: "Storage now publishes an event when a new object appears. The event goes to a queue, and a separate media worker takes it, makes the 720p version and thumbnails, writes them back to storage and sets the status to `ready`.\n\nThe API is light again. Workers scale on their own: more videos, more workers, and nobody waits on a page.",
      watch: "The same event can arrive twice. Write results under fixed keys so a repeat just overwrites them.",
      fields: {
        event: "A new object was created. The worker does not poll storage.",
        key: "Which file to process. The worker finds the database row by the same key.",
      },
    },
    viral: {
      short: "Viral",
      title: "A video goes viral",
      body: "Thousands of viewers open the same video, each fetching it from storage in one region. Viewers far away wait 3 seconds before playback starts.\n\nEvery byte leaving storage is paid traffic. The monthly bill doubles in a week.",
      fields: {
        "Content-Length": "40 MB per view. Thousands of views of one file are thousands of identical downloads.",
        "X-Response-Time": "Far from the storage region the first bytes are slow to arrive.",
      },
    },
    cdn: {
      short: "CDN",
      title: "A CDN in front of storage",
      body: "Viewers now get the video from a CDN: servers in many cities that keep a copy close to the user. Only the first request in a region goes to storage; the rest are served from the edge.\n\nThe player asks for the file in pieces, so playback starts after the first megabyte. Storage traffic and cost fall sharply.",
      watch: "For private videos use signed CDN links with an expiry, otherwise a copied link works for anyone.",
      fields: {
        Range: "The player asks for the first megabyte only, then the next one as it plays.",
        "Cache-Control": "A processed file never changes under its name, so the edge may keep it for a year.",
        "X-Cache": "`HIT`: served from the edge, storage was not asked.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for files.\n\n1) Bytes do not go through the API: it signs a short-lived URL and the client uploads to object storage. 2) Large files go in parts that can be retried one by one. 3) The database keeps metadata and the object key, never the file. 4) Heavy processing runs in a worker triggered by an event. 5) Views go through a CDN with long caching for files that never change.",
    },
  },
};

export default text;
