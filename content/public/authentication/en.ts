import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Authentication",
  summary:
    "How a service learns who is calling: storing passwords so a leak is not a disaster, sessions and tokens, how long a token lives and how to kill it, logging in through an identity provider, and a second factor.",
  learn: [
    "Why passwords are stored with a slow, salted hash like argon2 or bcrypt",
    "Server sessions vs JWT access tokens, and when each fits",
    "Short access tokens, refresh tokens and revocation",
    "Login through an identity provider (OAuth2 / OIDC) and MFA",
  ],
  nodes: {
    user: "User",
    web: "Web app",
    api: "Auth API",
    users: "Users DB",
    attacker: "Attacker",
    sessions: "Session store",
    orders: "Orders service",
    idp: "Identity provider",
  },
  metrics: {
    cracked: "Leaked hashes cracked",
    "login-ms": "Login time",
    takeovers: "Account takeovers",
  },
  steps: {
    leak: {
      short: "Leak",
      title: "The users table leaks",
      body: "A backup of the users table ends up public. Passwords were stored as plain SHA-256, without salt.\n\nSHA-256 is built to be fast: a single GPU tries billions of guesses a second. In a day 62% of the hashes are cracked, and people reuse those passwords elsewhere.",
      watch: "Plan for the leak, not against it. Storage must stay safe after the attacker has the file.",
      check: {
        q: "Passwords are now stored with argon2id and a random salt per user. What changes?",
        options: [
          "Little: GPUs crack argon2 about as fast",
          "Login takes seconds and users complain",
          "Login gets ~250 ms slower; cracking almost stops",
        ],
        answer: 2,
        why: "Each guess now costs about 250 ms and 64 MB, so guessing gets millions of times slower: cracked hashes fall from 62% to 0.5%. A quarter second at login goes unnoticed.",
      },
      fields: {
        password_sha256: "A fast hash of the password. Hidden here; in the leak it is a ready target for guessing.",
        salt: "None. Equal passwords give equal hashes, so one guess cracks everyone who chose `123456`.",
      },
    },
    "slow-hash": {
      short: "Slow hash",
      title: "Store a slow, salted hash",
      body: "The API now stores passwords with **argon2id** (bcrypt works too): a random salt per user and a hash that costs about 250 ms and 64 MB to compute.\n\nLogin gets slower by a quarter second, which no one notices. Guessing gets millions of times slower: the same leak now cracks almost nothing.",
      watch: "Never invent your own scheme or encrypt passwords with a key. Use a library's argon2 or bcrypt and its verify function.",
      fields: {
        password_hash: "Salt, parameters and hash in one string. Hidden here.",
        algo: "A hash made to be slow and memory-hungry, so GPUs gain little.",
        cost: "64 MB of memory, 3 passes. Raise it as servers get faster.",
      },
    },
    session: {
      short: "Session",
      title: "Session: a random id in a cookie",
      body: "After the password checks out, the API creates a session in the store (`u_42`, expires in 7 days) and gives the browser a random id in a cookie.\n\nEvery next request carries the cookie; the API looks the id up. Logout is simple: delete the session.",
      check: {
        q: "A new orders service must also know who is calling. What does that cost with sessions?",
        options: [
          "Every request in every service is a lookup in one store",
          "Nothing: the cookie itself says who the user is",
          "Each service has to keep its own session copy",
        ],
        answer: 0,
        why: "The cookie holds only a random id, so orders looks up every request in the session store too. The store climbs to 92% and becomes the one thing that slows everything.",
      },
      fields: {
        password: "Sent only over HTTPS and only to the login endpoint. Never logged.",
        "Set-Cookie": "`sid=...; HttpOnly; Secure; SameSite=Lax`. HttpOnly keeps JavaScript, and XSS, away from it. Value hidden.",
      },
    },
    "shared-store": {
      short: "Shared store",
      title: "Every service asks the session store",
      body: "An orders service appears. To know who is calling, it also looks up every request in the session store.\n\nNow each request in every service is a Redis round trip. The store sits at 92% and becomes the one thing that, when slow, slows everything.",
      fields: {
        GET: "One lookup per request, from every service.",
        sess: "The key is the session id. Whoever holds it is the user.",
      },
    },
    jwt: {
      short: "JWT",
      title: "JWT: a signed token any service can check",
      body: "The auth API now issues an **access token**: a JWT with the user id and an expiry, signed with the API's private key.\n\nOrders checks the signature with the public key and reads the claims. No lookup, no shared store: the session store drops to 25%.",
      watch: "A JWT is signed, not encrypted. Anyone holding it can read the payload, so put no secrets in it.",
      check: {
        q: "The user logs out, but their JWT already leaked through a logged URL. What happens?",
        options: [
          "Orders rejects it: logout cancelled the token",
          "It keeps working until `exp`, here 30 days",
          "It works only from the user's own IP address",
        ],
        answer: 1,
        why: "Logout deleted only the browser's copy. Orders checks the signature, not a central list, so the token is valid until it expires, 30 days after `iat`.",
      },
      fields: {
        Authorization: "`Bearer` and the token. Whoever holds the token is the user. Hidden here.",
        kid: "Which signing key was used, so keys can be rotated.",
        sub: "The subject: the user this token speaks for.",
        exp: "Expiry time. After it, every service rejects the token on its own.",
        signature: "Made with the private key. Any change to the payload breaks it.",
      },
    },
    stolen: {
      short: "Stolen",
      title: "A stolen token lives for 30 days",
      body: "A token leaked through a logged URL. The attacker sends it to Orders, and Orders accepts it: the signature is valid.\n\nThe user pressed \"log out\", but that only deleted the browser's copy. Nobody checks a central list, so the token works until it expires, in 30 days.",
      watch: "The price of \"no lookup\": you cannot take a JWT back before `exp`.",
      fields: {
        iat: "Issued at: when the token was created.",
        exp: "30 days after `iat`. That is the attacker's window.",
      },
    },
    refresh: {
      short: "Refresh",
      title: "Short access token plus a refresh token",
      body: "Access tokens now live 15 minutes. To get a new one, the web app sends a **refresh token** from an HttpOnly cookie to the auth API.\n\nThe refresh token is checked in the store and rotated on each use. A stolen access token expires within 15 minutes, and the attacker's replay starts failing.",
      fields: {
        grant_type: "\"Give me a new access token for this refresh token.\"",
        refresh_token: "A new one each time. Reusing an old one means theft: the whole family is revoked.",
        access_token: "The new short-lived JWT. Hidden here.",
        expires_in: "900 seconds. The longest a stolen access token is useful.",
      },
    },
    revoke: {
      short: "Revoke",
      title: "Revocation: logout that really logs out",
      body: "On logout or password change the API deletes the user's refresh token family. No new access tokens can be minted.\n\nFor the rare case that cannot wait 15 minutes, the token's id goes to a short deny list that services check. It expires together with the token.",
      fields: {
        DEL: "Deletes the refresh token family. The next refresh fails.",
        jti_8c1: "The JWT's own id, from its `jti` claim. Only this token is denied.",
        EX: "900 seconds: after that the token has expired anyway.",
      },
    },
    oidc: {
      short: "OIDC",
      title: "Login through an identity provider",
      body: "Users can now sign in with a company account. The web app redirects to the identity provider, the user logs in there, and comes back with a one-time `code`.\n\nThe API exchanges the code server-to-server for an **id token** (OIDC) that says who the user is. The app never sees that password.",
      watch: "Check the id token's issuer, audience and expiry. A valid signature from the wrong issuer is not a login.",
      fields: {
        Authorization: "The app's own client id and secret, so the provider knows who asks. Hidden here.",
        code: "One-time and short-lived, from the redirect. Useless without the client secret.",
        redirect_uri: "Must match the registered one exactly, or the provider refuses.",
        code_verifier: "PKCE: proves this is the same client that started the login.",
        id_token: "A signed JWT about the user: `sub`, email, issuer. Hidden here.",
      },
    },
    mfa: {
      short: "MFA",
      title: "A second factor stops reused passwords",
      body: "Attackers try email and password pairs leaked from other sites against `/login`. Some of them are correct.\n\nWith **MFA**, a correct password only opens the second step: a code from an authenticator app or a passkey. Without the device, the login stops here.",
      fields: {
        password: "Correct, taken from another site's leak. On its own it is no longer enough.",
        mfa_required: "The password checked out, but there is no session yet.",
        methods: "TOTP code or passkey. Passkeys also resist phishing.",
        mfa_token: "Ties the second step to this attempt, valid for minutes. Hidden here.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Four rules for authentication.\n\n1) Store passwords with a slow, salted hash (argon2id, bcrypt). 2) Sessions are easy to revoke; JWTs are easy to verify anywhere, so keep them short. 3) Pair a 15-minute access token with a rotated refresh token, and revoke by deleting refresh tokens. 4) Prefer an identity provider for login and add MFA; never put tokens in URLs, where logs keep them.",
    },
  },
};

export default text;
