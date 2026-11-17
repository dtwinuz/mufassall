import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Design a chat",
  summary:
    "Alice writes to Bob, and the message should appear on his screen in a fraction of a second, in the right order, even if his phone was asleep. We build the chat step by step: WebSocket gateways, routing, storage by conversation, sequence numbers, receipts, push, groups and presence.",
  learn: [
    "Why a chat keeps a WebSocket open and how a message finds the right gateway",
    "Why messages are partitioned by conversation, not by user",
    "Per-conversation sequence numbers instead of clocks",
    "Receipts, push for offline users, group fan-out and presence with TTL",
  ],
  nodes: {
    alice: "Alice's app",
    bob: "Bob's app",
    chat: "Chat service",
    msgs: "Message store",
    "gw-a": "Gateway A",
    "gw-b": "Gateway B",
    sessions: "Session registry",
    notify: "Push worker",
    push: "Push service",
  },
  metrics: {
    "deliver-p99": "Delivery p99",
    misordered: "Out-of-order messages",
    missed: "Unnoticed for 1 h+",
  },
  steps: {
    polling: {
      short: "Polling",
      title: "Asking every two seconds: anything new?",
      body: "The first version: Bob's app asks the server every 2 seconds for new messages. With 10 million connected users that is 5 million requests per second, and almost all of them come back empty.\n\nA message still waits up to 2 s before Bob sees it. The server burns 90% CPU answering \"nothing new\".",
      fields: {
        since: "Last moment the app checked. The server returns anything newer.",
        messages: "Empty, as on most polls: the cost of asking when nothing happened.",
      },
    },
    websocket: {
      short: "WebSocket",
      title: "One open connection per device",
      body: "Each app opens a WebSocket to a **gateway** and keeps it open. The server can now push a message the moment it arrives; nobody asks in vain. Gateways only hold connections, so one box can keep hundreds of thousands of them.\n\nWhen Bob connects, gateway B writes to the session registry: \"u_bob is connected here\". Delivery p99 drops from 2.1 s to 120 ms.",
      watch: "Connections are long-lived, so the load balancer must balance connections, not requests. Draining a gateway for a deploy means asking clients to reconnect elsewhere.",
      fields: {
        Upgrade: "The client asks to switch this HTTP connection to the WebSocket protocol.",
        Authorization: "Checked once, at connect. Every frame after that belongs to this user.",
        "101": "Switching Protocols: from here on the same TCP connection carries frames both ways.",
      },
    },
    route: {
      short: "Route",
      title: "Finding Bob's gateway",
      body: "Alice's message arrives at gateway A, which passes it to the chat service. The chat service asks the registry where Bob is connected and forwards the message to that gateway, which writes it to Bob's socket.\n\nBob has two devices, a phone and a laptop, so there are two connections, possibly on two gateways. Both get the message.",
      fields: {
        SMEMBERS: "All open connections of one user. A set, because one user can have several devices.",
        "gw-b": "Gateway B, connection `c_8812`: Bob's phone.",
        "gw-d": "Another gateway: Bob's laptop is connected there.",
      },
    },
    storage: {
      short: "Storage",
      title: "Store by conversation, not by user",
      body: "Every message is written before it is delivered. The partition key is the **conversation**: all messages of `c_a1b2` live on one shard, sorted inside it. Opening a chat is one range read: the last 50 rows of one partition.\n\nPartitioning by user would mean writing each message twice in a 1:1 chat and 300 times in a group. By conversation it is written once, and 64 shards spread the load.",
      fields: {
        conv_id: "Partition key. It decides the shard, so one chat never spans machines.",
        sent_at: "For now messages are sorted by the server's clock. The next step shows why that is a problem.",
        shard: "`c_a1b2` hashes to shard 12. Every message of this chat goes there.",
      },
    },
    order: {
      short: "Order",
      title: "Two quick messages arrive swapped",
      body: "Alice sends \"dinner tonight?\" and right after it \"at 7pm?\". They go to two chat service instances whose clocks differ by 50 ms. The second message gets the earlier timestamp.\n\nBob sees \"at 7pm?\" first. Sorting by wall clock across machines cannot give a reliable order inside one conversation.",
      watch: "Server clocks drift by milliseconds even with NTP. Never order by timestamps taken on different machines.",
      fields: {
        sent_at: "Each instance stamped its own clock. They disagree.",
        m_7f40: "The second message, shown first, because its server's clock was behind.",
      },
    },
    seq: {
      short: "Sequence",
      title: "A sequence number per conversation",
      body: "The shard that owns the conversation hands out the next number atomically: 1042, 1043, 1044. That number is the order, regardless of clocks. The lock is per conversation, so there is no global bottleneck.\n\nThe client sorts by `seq` and spots gaps: if it gets 1044 after 1042, it asks for 1043. A resent message carries the same client id, so a retry never creates a duplicate.",
      fields: {
        last_seq: "The last number used in this conversation. The new message gets 1043.",
        RETURNING: "Increment and read in one statement, so two writers never get the same number.",
      },
    },
    receipts: {
      short: "Receipts",
      title: "Delivered and read",
      body: "When Bob's device gets the message it acknowledges it: one tick for Alice. When Bob opens the chat, the app sends a read receipt.\n\nIt is not a receipt per message but one number per member per conversation: \"read up to 1043\". Everything up to it is read. One small write instead of one per message.",
      fields: {
        type: "`delivered` from the device, `read` when the chat is on screen.",
        up_to_seq: "Everything up to this number is read. Alice's ticks turn blue for all of them.",
      },
    },
    offline: {
      short: "Offline",
      title: "Bob's phone is asleep",
      body: "The phone puts the app in the background and the operating system closes its socket. The registry has no connection for Bob, so the chat service has nowhere to send the message.\n\nThe message is safe in the store, but Bob does not know it exists. 900 messages a day sit unnoticed for over an hour.",
      fields: {
        "empty array": "No open connection. Without another channel the message just waits.",
      },
    },
    push: {
      short: "Push",
      title: "Push notification, then catch-up",
      body: "When no connection is found, the chat service puts an event on a queue. A push worker reads it and calls the phone platform's push service, which wakes the phone and shows a notification.\n\nBob taps it, the app reconnects and sends the last `seq` it has for each conversation. The server returns everything newer from the store. Push only wakes; the store is the source of truth.",
      watch: "Push is best effort: it can be late, merged or dropped. Never put a message only in a push.",
      fields: {
        device_token: "Identifies this app on this phone. Treated as a secret and hidden.",
        collapse_key: "Ten messages in one chat become one notification, not ten.",
        badge: "Unread count shown on the app icon.",
      },
    },
    group: {
      short: "Groups",
      title: "Group chat: store once, fan out to who is online",
      body: "A team chat with 300 members. The message is stored once in the group's partition, like any conversation. Then the chat service finds which members are online and sends one frame per **gateway**, not per member; each gateway delivers to its own sockets.\n\nThe 259 offline members go to the push queue, collapsed per chat. For huge channels with 100 000+ members there is no per-member fan-out at all: clients pull by `seq`, like the celebrity case in a feed.",
      fields: {
        SINTER: "Intersection of two sets, walked from the smaller one: 300 members, not millions online.",
        members: "Member list of the group, cached.",
        online: "Everyone with at least one live connection.",
        "41": "41 of 300 are online. The rest get a push.",
      },
    },
    presence: {
      short: "Presence",
      title: "Online and last seen",
      body: "Each gateway sends a heartbeat for its users every 25 s, and the presence key lives for 60 s. If the phone drops into a tunnel, nobody logs out: the key simply expires and Bob becomes \"last seen 1 min ago\".\n\nPresence changes are sent only to people who have a chat with Bob open right now, not to all his contacts. Otherwise every login would trigger hundreds of messages.",
      watch: "Phones on bad networks flap online and offline. Wait a few seconds before announcing a change.",
      fields: {
        presence: "One key per user. Its existence is the online status.",
        EX: "60 s TTL, refreshed by each heartbeat. No heartbeat, no key: offline.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A chat is a store plus a set of open pipes.\n\n1) WebSocket gateways hold connections; a registry tells where each user is. 2) Store first, partitioned by conversation. 3) Order by a per-conversation sequence, never by clocks; clients fill gaps by `seq`. 4) Receipts are one number per member. 5) Offline users get a push and catch up from the store. 6) Groups fan out per gateway, presence lives on a TTL.",
    },
  },
};

export default text;
