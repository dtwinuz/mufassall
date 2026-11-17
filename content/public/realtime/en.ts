import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Real-time updates",
  summary:
    "A chat must show a new message the moment it is sent. Polling, long polling, Server-Sent Events and WebSockets, and what it takes to run many open connections.",
  learn: [
    "What polling, long polling, SSE and WebSockets cost the server",
    "Why open connections need their own gateway layer",
    "How pub/sub delivers a message to a user on another gateway",
    "How a client reconnects without missing messages",
  ],
  nodes: {
    alice: "Alice",
    bob: "Bob",
    api: "Chat server",
    db: "Database",
    lb: "Load balancer",
    gw1: "Gateway 1",
    gw2: "Gateway 2",
    chat: "Chat service",
    bus: "Pub/sub",
  },
  metrics: {
    requests: "Requests",
    delay: "Delivery delay",
    missed: "Missed",
  },
  steps: {
    polling: {
      short: "Polling",
      title: "Asking every two seconds",
      body: "Each open chat asks the server “anything new since `m_730`?” every two seconds. With 100 000 open chats that is 50 000 requests a second.\n\nAlmost every answer is empty. A message still waits a second on average, half the polling interval.",
      watch: "Polling trades load for delay: poll faster and the load grows, poll slower and messages arrive late.",
      fields: {
        since: "The last message the client has. The server returns only newer ones.",
        messages: "Empty. The server read the database and spent a request to say “nothing”.",
      },
    },
    "long-poll": {
      short: "Long poll",
      title: "Long polling: the server holds the request",
      body: "The client sends the same request, but the server does not answer at once. It holds it open until a message arrives or 25 seconds pass, then the client asks again.\n\nRequests drop more than tenfold, and a message goes out the moment it appears.",
      watch: "Each waiting request still holds a connection and a slot on the server. Proxies with short timeouts cut it.",
      fields: {
        wait: "“Hold the request for up to 25 seconds if there is nothing yet.”",
        "X-Response-Time": "Seven seconds: the request waited until Bob's colleague wrote something.",
        cursor: "Where to continue from in the next request, so nothing is skipped or repeated.",
      },
    },
    sse: {
      short: "SSE",
      title: "Server-Sent Events: one stream down",
      body: "The client opens one HTTP request and the server never finishes the answer. Each new message is written into that stream as an event.\n\nIt is plain HTTP, works through most proxies, and the browser reconnects by itself. But it goes one way: to send, the client still makes normal POST requests.",
      fields: {
        Accept: "The client asks for an event stream, not a single answer.",
        id: "Every event has an ID. On reconnect the browser sends the last one in `Last-Event-ID`.",
        data: "The message itself. One event can be followed by thousands more on the same connection.",
      },
    },
    websocket: {
      short: "WebSocket",
      title: "WebSocket: one connection, both ways",
      body: "The client starts with an HTTP request and asks to **upgrade** it. After the `101` answer the same TCP connection carries small frames in both directions.\n\nMessages, typing indicators and read receipts all go over it. HTTP requests almost disappear and delivery takes tens of milliseconds.",
      watch: "A WebSocket is stateful: the server now remembers who is connected to it. That changes how you scale.",
      check: {
        q: "Every user now keeps a socket open all day on one chat server. What runs out first?",
        options: [
          "Request capacity: HTTP calls pile up",
          "File descriptors and memory for open sockets",
          "Database connections, one per message",
        ],
        answer: 1,
        why: "Each socket is a file descriptor, so the server stops at 65 535 open sockets and memory grows until GC pauses stall everyone. Connections, not requests, are now the limit.",
      },
      fields: {
        Upgrade: "Asks to switch this connection from HTTP to the WebSocket protocol.",
        "101": "Switching Protocols: from here on it is no longer HTTP.",
        "Sec-WebSocket-Accept": "Derived from the client's key. Proves the server really speaks WebSocket. Not a secret.",
      },
    },
    "too-many": {
      short: "Too many",
      title: "One server, 65 000 sockets",
      body: "Every user keeps a socket open all day. The single chat server runs out of file descriptors, memory grows and garbage-collection pauses stall every connection at once.\n\nNew users cannot connect, and messages to connected ones arrive late or not at all.",
      watch: "Connections, not requests, are now the limit. A quiet socket still costs memory.",
      fields: {
        EMFILE: "The process hit its open-file limit: every socket is a file descriptor.",
        open_sockets: "Exactly at the limit. The next user is refused.",
        "gc pause": "640 ms when no socket on this server is served at all.",
      },
    },
    gateways: {
      short: "Gateways",
      title: "A gateway layer holds the connections",
      body: "Connections move to a layer of **gateways**. A gateway only holds sockets and passes frames; the chat logic and the database sit behind it in an ordinary stateless service.\n\nThe load balancer spreads new connections across gateways, so more users means more gateways.",
      watch: "Balance by connection count, not by requests: one socket can live for hours.",
      check: {
        q: "Alice is on gateway 1, Bob on gateway 2. Alice sends a message to their room. What does Bob see?",
        options: [
          "Nothing, until he reloads",
          "The message: the load balancer routes it to him",
          "The message: the chat service pushes it to all users",
        ],
        answer: 0,
        why: "Gateway 1 delivers only to sockets connected to it. Nobody tells gateway 2, so Bob is skipped and missed messages jump to 450 a minute.",
      },
      fields: {
        room: "The chat room the client wants to follow.",
        "X-Gateway": "Bob landed on gateway 2. Alice is on gateway 1.",
      },
    },
    "wrong-node": {
      short: "Other gateway",
      title: "The message stays on the wrong gateway",
      body: "Alice sends a message. Gateway 1 saves it through the chat service and delivers it to everyone in the room **connected to gateway 1**.\n\nBob is on gateway 2. Nobody tells gateway 2, so Bob sees nothing until he reloads.",
      watch: "With more than one gateway, a sender and a receiver are almost never on the same one.",
      fields: {
        "local members": "Gateway 1 knows only its own sockets: Alice is here.",
        skipped: "Bob is in the room but not on this gateway. The message never reaches him.",
      },
    },
    bus: {
      short: "Pub/sub",
      title: "Pub/sub between gateways",
      body: "After saving a message, the chat service **publishes** it to the room's channel. Every gateway subscribes to the channels of the rooms its users have open.\n\nEach gateway gets the message and pushes it to its own local sockets. Bob gets it from gateway 2.",
      watch: "This pub/sub is fire-and-forget: a gateway that is not subscribed at that moment never sees the message.",
      fields: {
        PUBLISH: "Send to everyone subscribed to the channel right now.",
        "room:r_17": "One channel per room, so a gateway only receives rooms it needs.",
        "(integer) 2": "Two gateways were subscribed and got the message.",
      },
    },
    dropped: {
      short: "Drop",
      title: "The phone goes into a tunnel",
      body: "Bob's connection breaks without a goodbye. While he is away, three messages are published.\n\nGateway 2 has no socket for Bob, so it has nobody to give them to. When Bob comes back, the chat shows a gap.",
      watch: "Mobile connections drop all the time. Plan for reconnects, not for the happy path.",
      check: {
        q: "Bob comes back online after the tunnel. How does he get the three messages he missed?",
        options: [
          "The live channel replays them on reconnect",
          "Gateway 2 kept them for him while he was away",
          "His app sends the last ID it saw and gets everything newer",
        ],
        answer: 2,
        why: "Live pub/sub kept nothing for him. The app resumes after `m_740`, the gateway reads the three newer messages from the chat service, and only then switches to live delivery.",
      },
      fields: {
        "1006": "Abnormal closure: the socket died without a close frame, typical for a lost network.",
        dropped: "Live pub/sub keeps nothing for an absent subscriber.",
      },
    },
    resume: {
      short: "Resume",
      title: "Reconnect and catch up from the last ID",
      body: "Bob's app reconnects with growing pauses and random jitter, so thousands of phones do not reconnect in the same second. Then it says which message it saw last.\n\nThe gateway fetches everything newer from the chat service and only then switches to live delivery. The gap is filled.",
      watch: "The database is the source of truth; the live channel is only a fast path. The client drops duplicates by message ID.",
      fields: {
        after: "The last message Bob saw before the drop.",
        messages: "The three messages published while Bob was away, read from the database.",
        live: "History is done; from now on new messages come through the live channel.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Pick the cheapest channel that fits: polling for rare updates, SSE for server-to-client streams, WebSockets for two-way chat.\n\n1) Long-lived connections go to a separate gateway layer. 2) Gateways learn about messages through pub/sub. 3) Live delivery may miss; the database is the truth. 4) Clients reconnect with backoff and jitter and resume from their last ID.",
    },
  },
};

export default text;
