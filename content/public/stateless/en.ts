import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Stateless servers",
  summary:
    "A shop API keeps logged-in users in its own memory. It works on one server and breaks the moment you add a second one or restart the first. Where the state should live instead.",
  learn: [
    "Why a session in process memory ties a user to one server",
    "Why sticky sessions only hide the problem",
    "Moving sessions to a shared store such as Redis",
    "Signed tokens: no lookup, but no instant logout either",
  ],
  nodes: {
    client: "Browser",
    app1: "App server 1",
    app2: "App server 2",
    lb: "Load balancer",
    redis: "Session store",
  },
  metrics: {
    servers: "Servers in service",
    logouts: "Unexpected logouts",
    p95: "Reply p95",
  },
  steps: {
    "one-server": {
      short: "One server",
      title: "Login on a single server",
      body: "The user logs in. The server checks the password, creates a session object in its own memory and sends back a cookie with the session ID.\n\nOn the next request the server reads the cookie and finds the session in the same memory. With one server this is simple and fast.",
      fields: {
        password: "Sent once, over HTTPS. Hidden here.",
        "Set-Cookie": "The session ID. Anyone who has it is logged in as this user, so it is hidden too.",
        user_id: "Who logged in. The server remembers it next to the session ID, in its own RAM.",
      },
    },
    overloaded: {
      short: "Overload",
      title: "One server is not enough",
      body: "Traffic tripled. The single server runs at almost 100% CPU and starts answering some requests with `503`.\n\nThe obvious move: run a second copy of the same app and split the traffic.",
      fields: {
        Cookie: "The browser sends the session cookie on every request.",
        "Retry-After": "The server asks the client to come back in 5 seconds. Users see an error page.",
      },
    },
    "add-lb": {
      short: "Two servers",
      title: "A load balancer and a second server",
      body: "A load balancer now receives every request and hands them out in turn: one to server 1, the next to server 2.\n\nEach server is half loaded and replies are fast again. The code did not change at all.",
      check: {
        q: "A user logged in on server 1. Round-robin sends their next click to server 2. What happens?",
        options: [
          "They are logged out: server 2 has no such session",
          "Server 2 asks server 1 for the session",
          "Nothing: the cookie alone proves the login",
        ],
        answer: 0,
        why: "The session lives only in server 1's memory. Server 2 finds nothing and answers `401`, so users are thrown back to login every other click.",
      },
      fields: {
        upstream: "The group of servers the load balancer can send a request to.",
        "round-robin": "The default: requests go to the servers in turn, without looking at who the user is.",
      },
    },
    "lost-session": {
      short: "Lost session",
      title: "Server 2 has never seen this user",
      body: "The user logged in on server 1. Their next request goes to server 2, which looks for the session in its own memory and finds nothing.\n\nThe user is thrown back to the login page, apparently at random: every other click.",
      watch: "Memory of one process is visible only to that process. Two copies of the app means two separate memories.",
      fields: {
        Cookie: "A perfectly valid session ID. It was created on server 1.",
        error: "Server 2 is not broken. It simply has no such session.",
      },
    },
    sticky: {
      short: "Sticky",
      title: "Sticky sessions: always the same server",
      body: "The load balancer now hashes the session cookie and always sends a user to the same server. Logouts stop.\n\nBut the load is no longer even: a few heavy users land on server 1, and the balancer is not allowed to move them.",
      watch: "Sticky sessions keep the state on one machine. They hide the problem, they do not remove it.",
      check: {
        q: "A deploy restarts server 1, where sticky sessions keep half the users. What happens to those users?",
        options: [
          "The balancer moves them to server 2 with sessions intact",
          "They wait a few seconds, then carry on as before",
          "They are all logged out and lose their carts",
        ],
        answer: 2,
        why: "Every session lived only in server 1's RAM and vanished with the process. Thousands of users are logged out at once, and their half-filled carts are gone.",
      },
      fields: {
        hash: "The server is chosen from the session cookie, not in turn.",
        consistent: "When a server is added or removed, most users keep their old server.",
      },
    },
    restart: {
      short: "Restart",
      title: "A deploy restarts server 1",
      body: "A new version is rolled out and server 1 restarts. Every session in its memory disappears with the process.\n\nThousands of users are logged out at once, and their half-filled carts are gone.",
      fields: {
        SIGTERM: "The stop signal before the new version starts. A normal, planned event.",
        sessions: "All of them lived only in RAM. Nobody else has a copy.",
      },
    },
    "shared-store": {
      short: "Shared store",
      title: "Sessions move to a shared store",
      body: "The servers no longer keep sessions in their own memory. They read and write them in a separate store, Redis, which both servers can reach.\n\nAny server can now serve any request. The load balancer goes back to plain round-robin and the load is even.",
      watch: "This is what **stateless** means: the server keeps nothing between requests. The state did not vanish, it moved to a shared place.",
      fields: {
        sess: "The key prefix. The key is a hash of the cookie, so the store never holds the raw session ID.",
        user_id: "The same data that used to sit in server memory.",
        cart_items: "The half-filled cart now survives a restart of either server.",
      },
    },
    "deploy-ok": {
      short: "Deploy again",
      title: "The same deploy, nobody notices",
      body: "Server 1 restarts for the next release. The load balancer stops sending it traffic, and server 2 serves everyone.\n\nServer 2 reads the sessions from Redis. No user is logged out; replies are only a bit slower while one server does all the work.",
      fields: {
        Cookie: "A session created on server 1 before the restart.",
        "X-Served-By": "Answered by server 2. The user does not see the difference.",
      },
    },
    "signed-token": {
      short: "Signed token",
      title: "Another way: the state travels with the request",
      body: "Instead of a session ID, login returns a signed token (JWT) that already contains the user ID and an expiry time. The server checks the signature with its key; no store lookup is needed.\n\nRedis is almost idle and every server can verify the token on its own.",
      watch: "A token is signed, not encrypted. Anyone holding it can read its contents, so put nothing secret inside.",
      check: {
        q: "A user presses log out on a stolen laptop. The signed token is valid for 15 minutes. What happens to it?",
        options: [
          "The server deletes it, so it stops working at once",
          "It keeps working for up to 15 minutes",
          "Its signature breaks, so servers reject it",
        ],
        answer: 1,
        why: "Servers check only the signature and the expiry; they ask no one about the token. It stays valid until it expires, unless its ID is put on a small deny list in Redis.",
      },
      fields: {
        access_token: "The signed token. The browser sends it in the `Authorization` header on every request.",
        expires_in: "Valid for 900 seconds (15 minutes). After that the client must get a new one.",
      },
    },
    revoke: {
      short: "Logout",
      title: "The price: a token cannot be taken back",
      body: "The user presses “log out” on a stolen laptop. The token is still valid for up to 15 minutes, and the servers do not ask anyone about it.\n\nSo a small deny list returns: the token's ID goes into Redis until it would expire anyway. Short-lived tokens keep that list tiny.",
      fields: {
        deny: "A list of tokens that must no longer be accepted.",
        jti_7f2: "The token's own unique ID, from its `jti` claim.",
        EX: "Kept for 900 seconds: after that the token has expired on its own.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Four rules for stateless servers.\n\n1) Nothing between requests lives in process memory: any server can die or be added at any time. 2) Sticky sessions hide the problem, they do not solve it. 3) Shared state goes to a shared store (Redis, a database). 4) Signed tokens remove the lookup but make logout harder: keep them short-lived.",
    },
  },
};

export default text;
