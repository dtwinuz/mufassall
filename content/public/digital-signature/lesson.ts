import { defineLesson } from "@mufassall/scene-schema";

/**
 * A seller signs a contract with a key that lives on a hardware token, a document server
 * verifies it (math, chain, validity, revocation), a timestamp authority makes the signing time
 * provable for years, and the buyer adds a second signature. Structures follow CMS (RFC 5652),
 * OCSP (RFC 6960) and TSP (RFC 3161); the signature algorithm is whatever the national standard
 * prescribes, the shape stays the same. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "digital-signature",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "revoked", unit: "/day", better: "down" },
    { id: "unprovable", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "hash",
      kind: "case",
      nodes: {
        signer: { kind: "actor", at: [0, 0] },
        app: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [5, 4] },
        docs: { kind: "db", at: [10, 4] },
      },
      edges: {
        open: { from: "signer", to: "app", rate: 1 },
        send: { from: "app", to: "api", rate: 2 },
      },
      metrics: { p95: 35, revoked: 0, unprovable: 0 },
      focus: ["app", "api"],
      exchange: {
        edge: "send",
        request: { format: "http", head: "GET /contracts/ct_2041/file HTTP/1.1" },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Content-Type", "application/pdf"],
            ["Content-Length", "84213"],
          ],
          body: "%PDF-1.7 ... (84 213 bytes)\n-- app: SHA-256(file) = 3f9a6c1e...b07d\n-- change one byte and the hash is different",
        },
        marks: ["Content-Length", "SHA-256"],
      },
    },
    {
      id: "token",
      kind: "case",
      nodes: { token: { kind: "storage", at: [0, 8] } },
      edges: {
        hash: { from: "app", to: "token", rate: 1 },
        sig: { from: "token", to: "app", flow: "ack", rate: 1 },
      },
      focus: ["app", "token"],
      exchange: {
        edge: "hash",
        request: {
          format: "text",
          head: "app -> token: C_Sign over PKCS#11",
          body: "signedAttrs:\n  contentType: data\n  messageDigest: 3f9a6c1e...b07d\n  signingTime: 2026-11-18 09:14:05Z\ninput = SHA-256(DER(signedAttrs)), 32 bytes\nkey object: CKA_EXTRACTABLE = false",
        },
        response: {
          format: "text",
          head: "token: signature, 64 bytes",
          body: "PIN checked inside the token\nthe private key never left the device",
        },
        marks: ["signedAttrs", "messageDigest", "signingTime", "CKA_EXTRACTABLE", "PIN"],
      },
    },
    {
      id: "send",
      kind: "case",
      edges: { store: { from: "api", to: "docs", rate: 2 } },
      focus: ["app", "api", "docs"],
      exchange: {
        edge: "send",
        request: {
          format: "http",
          head: "POST /contracts/ct_2041/signatures HTTP/1.1",
          headers: [
            ["Content-Type", "application/pkcs7-signature"],
            ["Authorization", "***"],
          ],
          body: "ContentInfo: SignedData\n  digestAlgorithms: sha256\n  encapContentInfo: data, eContent absent (detached)\n  certificates: signer, Issuing CA\n  signerInfos[0]:\n    sid: Issuing CA, serial 4F1A07\n    digestAlgorithm: sha256\n    signedAttrs: contentType, messageDigest, signingTime\n    signatureAlgorithm: ecdsa-with-SHA256\n    signature: ***",
        },
        response: { format: "http", head: "HTTP/1.1 202 Accepted" },
        marks: ["Authorization", "SignedData", "detached", "certificates", "sid", "digestAlgorithm", "signature"],
        masked: ["Authorization"],
      },
    },
    {
      id: "verify",
      kind: "fix",
      edges: { store: { rate: 3 } },
      metrics: { p95: 40 },
      focus: ["api", "docs"],
      exchange: {
        edge: "store",
        request: {
          format: "text",
          head: "verify ct_2041 signer #0",
          body: "1 SHA-256(file) == messageDigest           ok\n2 signature over DER(signedAttrs) checked\n  with the public key from the certificate  ok\n3 chain: signer -> Issuing CA -> Root CA    ok\n4 notBefore <= now <= notAfter             ok\n-> stored: file, CMS, verdict",
        },
        marks: ["messageDigest", "public key", "Root CA", "notAfter"],
      },
    },
    {
      id: "revoked",
      kind: "problem",
      nodes: { thief: { kind: "actor", at: [3, 0] } },
      edges: { forge: { from: "thief", to: "api", flow: "fail", rate: 2 } },
      metrics: { revoked: 6 },
      focus: ["thief", "api"],
      exchange: {
        edge: "forge",
        request: {
          format: "text",
          head: "verify ct_2077 signer #0",
          body: "1 messageDigest  ok\n2 signature      ok\n3 chain          ok\n4 validity       ok\n-> ACCEPTED\n-- the CA revoked serial 4F1A07 yesterday at 16:40",
        },
        marks: ["ACCEPTED", "revoked"],
      },
    },
    {
      id: "ocsp",
      kind: "fix",
      nodes: { ca: { kind: "external", at: [6, 0] } },
      edges: { ocsp: { from: "api", to: "ca", rate: 2 }, forge: { cut: true } },
      metrics: { p95: 210, revoked: 0 },
      focus: ["api", "ca"],
      exchange: {
        edge: "ocsp",
        request: {
          format: "http",
          head: "POST /ocsp HTTP/1.1",
          headers: [["Content-Type", "application/ocsp-request"]],
          body: "OCSPRequest\n  certID:\n    hashAlgorithm: sha256\n    issuerNameHash: 7c2e...91\n    issuerKeyHash: a40b...5d\n    serialNumber: 4F1A07\n  nonce: 6b1f...e2",
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["Content-Type", "application/ocsp-response"]],
          body: "responseStatus: successful\ncertStatus: revoked\nrevocationTime: 2026-11-17 16:40Z\nrevocationReason: keyCompromise\nthisUpdate: 09:10Z, nextUpdate: 13:10Z\nresponder signature: ***",
        },
        marks: ["serialNumber", "nonce", "certStatus", "revocationTime", "nextUpdate"],
      },
    },
    {
      id: "expired",
      kind: "problem",
      nodes: { thief: null },
      metrics: { unprovable: 1200 },
      focus: ["api", "ca"],
      exchange: {
        edge: "ocsp",
        request: {
          format: "text",
          head: "2028-05-10 re-verify ct_2041 signer #0",
          body: "signingTime 2026-11-18 09:14:05Z\n  -- written by the signer's own computer clock\ncert notAfter 2027-03-01          -> expired\nOCSP for serial 4F1A07            -> unknown\nwas the key valid when it signed? no proof\n-> INDETERMINATE",
        },
        marks: ["signingTime", "expired", "unknown", "INDETERMINATE"],
      },
    },
    {
      id: "timestamp",
      kind: "fix",
      nodes: { tsa: { kind: "external", at: [10, 0] } },
      edges: { tsa: { from: "api", to: "tsa", rate: 2 } },
      metrics: { p95: 260 },
      focus: ["api", "tsa"],
      exchange: {
        edge: "tsa",
        request: {
          format: "http",
          head: "POST /tsa HTTP/1.1",
          headers: [["Content-Type", "application/timestamp-query"]],
          body: "TimeStampReq\n  version: 1\n  messageImprint:\n    hashAlgorithm: sha256\n    hashedMessage: SHA-256(signature value)\n  nonce: 0x51c3a9\n  certReq: true",
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["Content-Type", "application/timestamp-reply"]],
          body: "status: granted\ntimeStampToken (SignedData by the TSA):\n  genTime: 2026-11-18 09:14:07Z\n  serialNumber: 88213\n  TSA signature: ***\n-> added to signerInfos[0].unsignedAttrs",
        },
        marks: ["messageImprint", "hashedMessage", "nonce", "genTime", "unsignedAttrs"],
      },
    },
    {
      id: "evidence",
      kind: "fix",
      metrics: { unprovable: 0 },
      focus: ["api", "docs"],
      exchange: {
        edge: "store",
        request: {
          format: "text",
          head: "2028-05-10 re-verify ct_2041 signer #0",
          body: "proven time = TSA genTime 2026-11-18 09:14:07Z\ncert valid at that time (until 2027-03-01) ok\nstored OCSP from 09:14:20Z: good            ok\nrevoked 2027-01-12, cessationOfOperation\n  -- after the proven time, so it does not matter\n-> VALID",
        },
        marks: ["proven time", "stored OCSP", "after", "VALID"],
      },
    },
    {
      id: "countersign",
      kind: "case",
      nodes: { partner: { kind: "client", at: [5, 9] } },
      edges: { cosign: { from: "partner", to: "api", rate: 2 } },
      focus: ["partner", "api"],
      exchange: {
        edge: "cosign",
        request: {
          format: "http",
          head: "POST /contracts/ct_2041/signatures HTTP/1.1",
          headers: [
            ["Content-Type", "application/pkcs7-signature"],
            ["Authorization", "***"],
          ],
          body: "SignedData (same file, detached)\n  signerInfos[0]: seller, serial 4F1A07\n    messageDigest: 3f9a6c1e...b07d\n    unsignedAttrs: timeStampToken 09:14:07Z\n  signerInfos[1]: buyer, serial 2C9D11\n    messageDigest: 3f9a6c1e...b07d\n    unsignedAttrs: timeStampToken 15:32:40Z",
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["Authorization", "signerInfos", "messageDigest", "timeStampToken"],
        masked: ["Authorization"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
