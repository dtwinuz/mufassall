import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Case: Figma multiplayer editing",
  summary:
    "Several people edit one design file at once. How Figma keeps everyone in sync without operational transforms: a server that is the single authority, last-writer-wins per property, hidden echoes, client-made ids, cycle checks and fractional indexing. Source: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/",
  learn: [
    "Why a central authority lets you skip the hard parts of OT and CRDTs",
    "A document as a map of objects to properties, with conflicts per property",
    "Why a client hides server changes that conflict with its own unacknowledged ones",
    "Creating objects offline, rejecting tree cycles and ordering with fractional indexes",
    "What happens to edits made offline when the connection comes back",
  ],
  nodes: {
    alice: "Alice's browser",
    bob: "Bob's browser",
    srv: "Document process",
  },
  metrics: {
    unacked: "Unacknowledged",
    flicker: "Flickers",
    lost: "Lost edits",
  },
  steps: {
    open: {
      short: "Open",
      title: "One process per document, changes over a WebSocket",
      body: "Clients are web pages that talk to a cluster of servers over WebSockets. The servers start a separate process for each multiplayer document, and everyone editing that file connects to it.\n\nOn opening, the client downloads a full copy of the file; after that only changes travel, in both directions. Comments, users, teams and projects live in Postgres and are synced by a different system. The steps in this lesson are simplified illustrations of the mechanism, not Figma's protocol.",
      fields: {
        "full copy": "The starting state. Changes are applied on top of it.",
        WebSocket: "A long-lived connection to the process that owns this document.",
        "only changes": "Small messages instead of the whole file each time.",
      },
    },
    model: {
      short: "Model",
      title: "A document is a map of objects to properties",
      body: "A Figma document is a tree of objects, like the HTML DOM: a root, pages, then what is on each page. Conceptually it is `Map<ObjectID, Map<Property, Value>>`.\n\nThe team chose not to use operational transforms, the approach behind Google Docs: Figma is not a text editor, and OT was unnecessarily complex for it. The design is inspired by CRDTs, but because the server is the central authority, much of the CRDT overhead can be dropped.",
      watch: "One authority that orders everything is a big simplification. Pick it if your product can live with a server in the middle.",
      fields: {
        id: "Which object. The key of the outer map.",
        fill: "One property. The server keeps the latest value any client sent for it.",
        ack: "The server confirms it has the change; until then it is unacknowledged.",
      },
    },
    "no-conflict": {
      short: "No conflict",
      title: "Different properties never conflict",
      body: "Alice changes the fill of a rectangle while Bob moves it. They touch different properties of the same object, so both changes simply stay.\n\nChanges to different properties, or to the same property on different objects, do not conflict at all. Most real edits fall in this case.",
      fields: {
        id: "The same rectangle Alice is coloring.",
        x: "A different property than fill, so nothing to resolve.",
      },
    },
    "same-property": {
      short: "Same property",
      title: "Same property: the last value the server got wins",
      body: "Now both edit the same text property at the same time. The rule is last-writer-wins: the server keeps the value it received last. The server defines the order, so no timestamps are needed.\n\nValues are atomic. If the text is \"B\" and Alice makes it \"AB\" while Bob makes it \"BC\", the result is AB or BC, never ABC.",
      check: {
        q: "The text is \"B\". Alice types \"AB\", Bob types \"BC\" at the same moment. What can the file end with?",
        options: [
          "\"ABC\": the server merges both edits",
          "\"AB\" or \"BC\": whichever reached the server last",
          "An error: the server asks both to retry",
        ],
        answer: 1,
        why: "A property value is replaced as a whole. The server keeps the one it received last and sends it to everyone. Merging characters would need text-editing machinery that Figma deliberately avoided.",
      },
      fields: {
        text: "One property, written by both. One of the two values wins whole.",
        never: "No character-level merge: values are atomic.",
      },
    },
    flicker: {
      short: "Flicker",
      title: "A stale echo makes the screen flicker",
      body: "A client applies its own change at once, without waiting for the server. Alice makes a rectangle red. Before the server acknowledges her change, it forwards Bob's earlier change: blue.\n\nIf Alice's client applied it, her screen would go red, then blue, then red again when her own change is confirmed.",
      fields: {
        unacknowledged: "Sent, applied locally, not yet confirmed by the server.",
        older: "Bob's change reached the server before Alice's, so it is already out of date for her.",
        screen: "The flicker the user would see.",
      },
    },
    "drop-echo": {
      short: "Hide echoes",
      title: "Drop incoming changes that clash with your own pending ones",
      body: "The fix: while a client has an unacknowledged change to a property, it discards incoming server changes to that same property. Changes to other properties are applied normally.\n\nAlice's red stays on her screen, and once the server acknowledges it, everyone agrees on red.",
      fields: {
        drop: "Same object, same property as a pending local change: ignore it.",
        apply: "A different property: no clash, show it.",
      },
    },
    ids: {
      short: "Object ids",
      title: "Clients make object ids themselves",
      body: "Creating and deleting objects are explicit actions; writing to an unknown id does not create anything. Every client has a unique client id, and it is part of every object id that client generates, so two clients never pick the same id.\n\nA deleted object is removed from the server; its data lives in the undo buffer of the client that deleted it.",
      check: {
        q: "Why does the client generate object ids, and not the server?",
        options: [
          "The server is too slow to hand out ids",
          "Ids must be random to be secure",
          "Creating objects has to work while offline",
        ],
        answer: 2,
        why: "If only the server could assign ids, nothing could be created without a connection. Putting the unique client id inside each object id lets every client create objects on its own without collisions.",
      },
      fields: {
        id: "The client id is part of it, so it is unique without asking the server.",
        type: "What is being created. Creation is a separate, explicit action.",
        parent: "Where in the tree the new object goes.",
      },
    },
    cycle: {
      short: "Cycle",
      title: "Two moves that would make a cycle",
      body: "Each object stores a link to its parent as a property, so moving an object keeps its identity. Alice moves frame A into frame B while Bob moves B into A. Applied together, each would be inside the other.\n\nThe server rejects a parent change that would create a cycle. For a moment a client may see the cycle; it then takes those objects out of the tree until the server decides. They briefly disappear, an accepted trade-off because this is rare.",
      fields: {
        parent: "The parent link is just a property, changed like any other.",
        rejected: "The server checks the tree and refuses the move that would close a loop.",
      },
    },
    order: {
      short: "Order",
      title: "Ordering children with fractional indexes",
      body: "The order of layers inside a parent is a fraction between 0 and 1. To put an object between two others, take the average of their positions. Nobody else's position changes, so two people inserting at once do not fight over a shared list.\n\nThe parent link and the position are stored as one property, so they always change together.",
      check: {
        q: "The neighbours are at 0.5 and 0.75. Where does the new layer go?",
        options: ["0.625", "0.76", "Both neighbours shift to make room"],
        answer: 0,
        why: "The average of 0.5 and 0.75 is 0.625, strictly between them. No other object is renumbered, so the change touches only the object being inserted.",
      },
      fields: {
        parent_and_position: "One property holding both, so a move is atomic. The name here is illustrative.",
        position: "A fraction between the two neighbours.",
      },
    },
    offline: {
      short: "Offline",
      title: "Editing while offline",
      body: "Bob's laptop loses the network. Figma lets a client keep editing offline for any length of time: his changes apply locally and wait.\n\nMeanwhile Alice keeps editing the same file, so the state Bob last saw goes stale.",
      fields: {
        locally: "The edits are kept on Bob's side until he reconnects.",
        Alice: "The document moves on without him.",
      },
    },
    reconnect: {
      short: "Reconnect",
      title: "Reconnect: fresh copy, then replay",
      body: "When Bob reconnects, his client downloads a fresh copy of the document, reapplies his offline edits on top of that latest state, and opens a new WebSocket.\n\nHis edits go through the same rules as any other change: per-property last-writer-wins and the cycle check on the server.",
      watch: "Replaying local intent on top of the newest state is simpler than merging two histories.",
      fields: {
        "fresh copy": "The current state, including everything Alice did.",
        reapply: "Bob's offline changes, applied on top of it.",
        "new WebSocket": "Back to normal: only changes from now on.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "What to take from Figma's design.\n\n1) If a server can be the single authority, you can drop much of OT and CRDT complexity. 2) Model the document as objects with properties; conflicts happen only on the same property and resolve last-writer-wins, with atomic values. 3) Apply local changes at once and ignore server changes that clash with your unacknowledged ones. 4) Let clients create ids (client id inside), check tree moves for cycles on the server, and order children with fractional indexes. 5) After offline work, load a fresh copy and replay local edits. And for undo: undoing a lot, copying something and redoing back to the present must leave the document unchanged.\n\nSource: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/",
    },
  },
};

export default text;
