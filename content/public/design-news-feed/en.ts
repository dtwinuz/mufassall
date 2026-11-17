import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Design a news feed",
  summary:
    "People post, and everyone who follows them should see it in their feed within seconds. We build the feed step by step: pull on read, push on write, the celebrity problem and a hybrid, ranking, media on a CDN, and what happens when the feed cache dies.",
  learn: [
    "Fan-out on read vs fan-out on write, and what each costs",
    "Why a few huge accounts break push, and how a hybrid fixes it",
    "A per-user feed cache that stores ids, not posts",
    "Cursor pagination, ranking and media on a CDN",
  ],
  nodes: {
    author: "Author's app",
    reader: "Reader's app",
    api: "Feed API",
    db: "Posts & follows DB",
    queue: "Post queue",
    fanout: "Fan-out worker",
    feeds: "Feed cache",
    cdn: "CDN",
    media: "Media storage",
  },
  metrics: {
    "feed-p99": "Feed load p99",
    fanout: "Feed inserts",
    "post-delay": "Time to reach followers",
  },
  steps: {
    post: {
      short: "Post",
      title: "Posting: one row, one id",
      body: "The author sends text and the ids of photos uploaded earlier. The API stores one row in `posts` and returns its id. The id is time-sortable (timestamp bits first, like the unique-id lesson), so newer posts always have bigger ids.\n\nModel scale: 20 million daily readers, 500 000 posts a day (about 6/s), 300 followers on average. Writes are tiny; reading the feed is the hard part.",
      fields: {
        Authorization: "Who is posting. A session token, hidden here.",
        media_ids: "Photos are uploaded separately first. The post only references them.",
        post_id: "64-bit id that starts with the timestamp: sorting by id is sorting by time.",
      },
    },
    pull: {
      short: "Pull",
      title: "Fan-out on read: build the feed when it is opened",
      body: "The simplest feed: when a reader opens the app, find everyone they follow, take their recent posts, sort by time and return the top 50. This is **fan-out on read**: the work happens at read time.\n\nFor one user following 200 people it takes 38 ms. Posting stays free: nothing happens until someone reads.",
      check: {
        q: "20 million readers open the feed about 10 times a day. How does pull hold up?",
        options: [
          "The database saturates; p99 reaches 1.8 s",
          "Fine: each feed still takes about 38 ms",
          "Writes slow down, reads stay fast",
        ],
        answer: 0,
        why: "That is 2 300 feed builds a second, about 10 000 at peak, and each reads tens of thousands of rows to keep 50. The database sits at 97% and feed p99 climbs to 1.8 s.",
      },
      fields: {
        JOIN: "Joins every followed author with their posts: the more you follow, the more rows it touches.",
        "ORDER BY": "Everything must be sorted before the top 50 is known.",
        LIMIT: "Only 50 rows come back, but thousands were read to pick them.",
      },
    },
    "pull-slow": {
      short: "Pull is slow",
      title: "Pull at scale: the database does it all, every time",
      body: "20 million readers open the feed about 10 times a day: 2 300 feed builds/s on average, around 10 000 at the evening peak. Each one reads tens of thousands of rows to keep 50. The database sits at 97% and feed p99 reaches 1.8 s.\n\nThe same feed is rebuilt from scratch on every open, although almost nothing changed since the last one.",
      fields: {
        EXPLAIN: "Shows what the query really did, with timings.",
        "Rows Removed": "Rows read and then thrown away by the sort: wasted work.",
        "Execution Time": "1.7 s for one feed. At peak thousands of these run at once.",
      },
    },
    push: {
      short: "Push",
      title: "Fan-out on write: deliver at posting time",
      body: "Flip it: when someone posts, a queue hands the post to a fan-out worker. It reads the author's followers and pushes the post id onto each follower's list in the feed cache. Reading a feed becomes one cache read.\n\nThe cost moves to writing: 6 posts/s × 300 followers ≈ 1 800 list inserts/s. Posting returns at once; followers see the post about 2 s later.",
      watch: "Store post ids, not posts. An edit or delete then touches one row, not 300 copies; hydration skips deleted ids.",
      fields: {
        LPUSH: "Puts the new post id at the head of this follower's list.",
        LTRIM: "Keeps only the newest 800 ids. Older pages come from the database.",
        feed: "One list per user: `feed:<user>`.",
      },
    },
    "read-fast": {
      short: "Fast read",
      title: "Reading the feed is now one range read",
      body: "The API reads the first 50 ids of `feed:u_42`, then fetches those posts by id from a post cache (most are hot) and returns them. No join, no sort.\n\nFeed p99 drops from 1.8 s to 25 ms, and the database only sees writes and cache misses.",
      check: {
        q: "An account with 30 million followers posts. What happens to fan-out on write?",
        options: [
          "Nothing special: one post is one queue job",
          "Its readers' feeds load slowly, others are fine",
          "The queue stalls; posts take up to 10 minutes",
        ],
        answer: 2,
        why: "The worker must write 30 million list entries, minutes of work at 200 000 inserts/s. Ordinary posts queued behind it wait too, so post delay grows from 2 s to up to 10 minutes.",
      },
      fields: {
        LRANGE: "Reads a slice of the list by position: O(50), whatever the follower count.",
        "49": "Positions 0 to 49: the first page.",
      },
    },
    celebrity: {
      short: "Celebrity",
      title: "A celebrity posts: 30 million inserts",
      body: "An account with 30 million followers posts. The fan-out worker must write 30 million list entries. At 200 000 inserts/s that is minutes of work, and every ordinary post queued behind it waits too.\n\nPosts now take up to 10 minutes to reach followers. Most of those 30 million followers will not even open the app today.",
      watch: "Push cost grows with followers, not with posts. One account can stall the whole pipeline.",
      fields: {
        followers: "30 million feeds to update for a single post.",
        eta: "37 minutes left for this one post. Everything behind it waits.",
      },
    },
    hybrid: {
      short: "Hybrid",
      title: "Hybrid: push for most, pull for the famous",
      body: "Accounts above 100 000 followers are not fanned out. At read time the API takes the pushed list from the cache, adds the recent posts of the few big accounts this reader follows, and merges them by id.\n\nThat pull is cheap: a reader follows only a handful of such accounts, and their recent posts are themselves cached and read by millions. Fan-out is back to 1 800/s and posts reach followers in 2 s.",
      watch: "Skip fan-out to users inactive for 30 days as well. Build their feed by pull when they return.",
      fields: {
        author_id: "Only the big accounts this reader follows: usually fewer than ten.",
        interval: "Only recent posts are merged. Older ones were already seen or are on later pages.",
      },
    },
    rank: {
      short: "Rank",
      title: "Ranking and the cursor",
      body: "A strict time order buries posts from close friends under noise. The API takes a few hundred candidates, scores each one (how often you interact with the author, freshness, early likes) and returns the top 20.\n\nPages use a **cursor**, not an offset: new posts arrive at the top while you scroll, and an offset would show duplicates or skip posts. The cursor remembers where the last page ended.",
      fields: {
        cursor: "Opaque position from the previous page. The client just sends it back.",
        score: "Ranking score for this reader. Higher comes first.",
        next_cursor: "Where the next page starts. Missing means the end.",
      },
    },
    media: {
      short: "CDN",
      title: "Photos come from a CDN, not the API",
      body: "Images are most of the bytes. They are stored once in object storage in a few sizes and served by a CDN near the reader. The API returns only URLs.\n\nFile names include the media id and size, so a file never changes and can be cached for a year. The origin sees a tiny fraction of image traffic.",
      fields: {
        "720": "A resized copy for phone screens. The app picks the size it needs.",
        "Cache-Control": "Cache for a year: `immutable` because a new photo gets a new name.",
        "X-Cache": "Served from the edge; the storage was not touched.",
      },
    },
    "cache-loss": {
      short: "Cache dies",
      title: "A feed cache node dies",
      body: "One node of the feed cache goes down. One in eight users suddenly have no feed list, and new posts cannot be pushed to them.\n\nThe cache was treated as the source of truth for feeds, but it is only a copy: every list can be rebuilt from the database.",
      check: {
        q: "Users whose feed list was lost open the app. What should the API do?",
        options: [
          "Show an empty feed until the node is back",
          "Pull recent posts from the database for them",
          "Rebuild every lost list at once, then serve",
        ],
        answer: 1,
        why: "For missing lists the API falls back to pull, only the last two days of posts: about 40 ms instead of 25. Lists are rebuilt on next open for active users, not all at once, so the database is not flooded.",
      },
      fields: {
        "connection refused": "The node holding `feed:u_42` is gone. Its lists are lost with it.",
      },
    },
    rebuild: {
      short: "Rebuild",
      title: "Fall back to pull, rebuild in the background",
      body: "For users whose list is missing, the API falls back to pull: recent posts of followed authors, last two days only. Each such feed takes ~40 ms instead of 25, which the database can absorb for a fraction of users.\n\nMeanwhile the lists are rebuilt on the restored node: on next open for active users, never for inactive ones. Each cache node also has a replica, so next time a failover takes seconds.",
      watch: "Without a bounded fallback, the whole read load lands on the database at once.",
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A feed is a trade between work on write and work on read.\n\n1) Pull is simple but rebuilds every feed on every open. 2) Push makes reads one cache range, at a cost per follower on write. 3) Big accounts are pulled at read time and merged. 4) Feed lists hold ids, are capped and can always be rebuilt. 5) Rank a few hundred candidates, page by cursor, and serve media from a CDN.",
    },
  },
};

export default text;
