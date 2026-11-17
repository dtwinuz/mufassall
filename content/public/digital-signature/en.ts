import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Electronic digital signature",
  summary:
    "A seller signs a contract with a key that never leaves a hardware token, the buyer signs it too, and the signatures must still be provable years after the certificates expire. What is hashed, what the signature covers, how a server checks it, and why a trusted timestamp matters.",
  learn: [
    "What exactly gets signed: the file hash inside the signed attributes",
    "What a CMS (PKCS#7) signature carries, detached or attached",
    "Four server checks: math, chain, validity, revocation via OCSP",
    "Why a trusted timestamp keeps an old signature valid after the certificate expires",
  ],
  nodes: {
    signer: "Seller",
    app: "Signing app",
    token: "Key token",
    api: "Document server",
    docs: "Document store",
    thief: "Thief",
    ca: "CA (OCSP)",
    tsa: "Timestamp TSA",
    partner: "Buyer app",
  },
  metrics: {
    p95: "Signature intake p95",
    revoked: "Accepted, cert revoked",
    unprovable: "Old signatures unprovable",
  },
  steps: {
    hash: {
      short: "Hash",
      title: "The app hashes the exact bytes of the contract",
      body: "The seller opens contract `ct_2041` in the signing app. The app downloads the PDF and computes its SHA-256: a 32-byte fingerprint of the file.\n\nNothing signs the 84 KB file itself. Everything that follows works on this hash, so the bytes the server stores must be exactly the bytes the app hashed.",
      watch: "For JSON documents, sign the exact bytes you send. Re-serialising the JSON on the server can change spaces or key order and break the hash.",
      fields: {
        "Content-Length": "The file size. The hash covers every one of these bytes.",
        "SHA-256": "The document fingerprint. Change one byte, and it is a completely different value.",
      },
    },
    token: {
      short: "Key",
      title: "The private key signs inside the token and never leaves it",
      body: "The app does not sign the file hash directly. It builds **signed attributes**: content type, the file hash as `messageDigest` and the signing time. It hashes their DER encoding and sends those 32 bytes to the token.\n\nThe token checks the PIN and signs with the private key stored inside it. Only the signature comes back. The key is marked non-extractable, so no app and no virus can copy it.",
      watch: "The signature covers the attributes, and through `messageDigest` the document. Swap the file or the time, and the check fails.",
      fields: {
        signedAttrs: "The set that is actually signed. It links the document and the time to the signature.",
        messageDigest: "The SHA-256 of the contract from the previous step.",
        signingTime: "The time the signer claims. It comes from the user's own computer clock.",
        CKA_EXTRACTABLE: "A token attribute: `false` means the key cannot be read out, only used.",
        PIN: "Unlocks the key for one session. Checked by the token, not by the app.",
      },
    },
    send: {
      short: "CMS",
      title: "The signature travels as a CMS package",
      body: "The app wraps the signature into CMS (also called PKCS#7) `SignedData`: algorithms, the signer's certificate with its issuer, and a `signerInfo` with the signed attributes and the signature value.\n\nHere it is **detached**: the PDF is not inside, the server already has it. An **attached** CMS carries the document inside, which is bigger but self-contained and handy for small JSON invoices.",
      fields: {
        Authorization: "The user's session token on the server. Hidden here.",
        SignedData: "The CMS type for signed content.",
        detached: "`eContent` is empty: the server must put the same file bytes next to it to check.",
        certificates: "The signer certificate with the public key, plus the issuing CA certificate to build the chain.",
        sid: "Which certificate made this signature: issuer plus serial number.",
        digestAlgorithm: "The hash used for `messageDigest` and for the signed attributes.",
        signature: "The 64 bytes from the token. Not a secret, but long, so it is shortened here.",
      },
    },
    verify: {
      short: "Verify",
      title: "The server checks the signature in four steps",
      body: "The server hashes its copy of the file and compares it with `messageDigest`. Then it checks the signature over the signed attributes with the public key from the certificate.\n\nNext it builds the chain up to a root CA it trusts and checks the certificate dates. All four pass, and the file, the CMS and the verdict go into the store.",
      check: {
        q: "A token is stolen from an office. The owner reports it and the CA revokes the certificate. The thief signs a contract the next day. What do these four checks say?",
        options: [
          "Rejected: the chain check sees that the certificate is revoked",
          "Accepted: the math, the chain and the dates are all still fine",
          "Rejected: the signature came from a different computer",
        ],
        answer: 1,
        why: "None of the four checks asks the CA anything. The key and the certificate are genuine, so the signature verifies and the contract is accepted; the next step shows the log and the fix.",
      },
      fields: {
        messageDigest: "Proves that this is the same file that was signed.",
        "public key": "Taken from the certificate. Only the matching private key could make this signature.",
        "Root CA": "The trust anchor configured on the server. A chain that ends elsewhere is rejected.",
        notAfter: "The certificate's expiry date.",
      },
    },
    revoked: {
      short: "Revoked",
      title: "A revoked certificate still passes",
      body: "The thief uses the stolen token, enters the PIN that was written on a sticky note, and signs a contract for a large delivery.\n\nThe server accepts it. The CA revoked the certificate yesterday, but the server never asked the CA about it.",
      watch: "A certificate is not valid just because its dates are. Revocation lives only at the CA.",
      fields: {
        ACCEPTED: "All four offline checks pass. Nothing here knows about revocation.",
        revoked: "The CA knows. The server never asked.",
      },
    },
    ocsp: {
      short: "OCSP",
      title: "Ask the CA: is this certificate still good?",
      body: "Before accepting a signature, the server sends an OCSP request to the responder named in the certificate. The answer is signed by the CA and says `good`, `revoked` or `unknown`.\n\nThe older option is a CRL: a signed list of all revoked serials that you download every few hours. OCSP asks about one certificate right now. The cost is a network call, so intake p95 grows; answers can be cached until `nextUpdate`.",
      check: {
        q: "In 2028 an auditor re-checks contract `ct_2041`. The seller's certificate expired in March 2027. What does the server say?",
        options: [
          "Valid: `signingTime` shows it was signed while the certificate was valid",
          "Valid: the OCSP answer from 2026 is cached forever",
          "Cannot tell: `signingTime` is only the signer's claim, and the certificate is expired",
        ],
        answer: 2,
        why: "`signingTime` is written by the user's own computer and proves nothing. The certificate is expired and the CA no longer reports its status, so the result is indeterminate.",
      },
      fields: {
        serialNumber: "Which certificate we ask about.",
        nonce: "A random value the response must repeat, so an old recorded answer cannot be replayed.",
        certStatus: "`revoked`: reject the signature.",
        revocationTime: "From this moment on, signatures with the key are not trusted.",
        nextUpdate: "Until when this answer may be reused from a cache.",
      },
    },
    expired: {
      short: "Expired",
      title: "Two years later the signature cannot be proven",
      body: "Contracts must stay provable for years, for audits and courts. In 2028 the seller's certificate is long expired, and the CA no longer keeps its status.\n\nThe only time in the CMS is `signingTime`, and the signer's own computer wrote it. Was the key valid when it signed? Nobody can prove it. 1200 old contracts are now indeterminate.",
      fields: {
        signingTime: "A claim, not a proof: anyone can set their clock back.",
        expired: "The certificate's validity period is over.",
        unknown: "The CA no longer answers for this certificate.",
        INDETERMINATE: "Neither valid nor invalid: there is not enough evidence.",
      },
    },
    timestamp: {
      short: "Timestamp",
      title: "A trusted timestamp fixes the signing time",
      body: "Right after signing, the server sends the hash of the **signature value** to a timestamp authority (RFC 3161). The TSA signs it together with its own clock time and returns a token.\n\nThe token goes into the signer's **unsigned attributes**: it is added after signing, so it does not break the signature. Now there is proof that this exact signature existed at 09:14:07.",
      check: {
        q: "In 2028 the certificate is expired. It was also revoked in January 2027, when the seller left. Does the 2026 signature still verify?",
        options: [
          "Yes: the revocation came after the proven signing time",
          "No: a revoked certificate invalidates every signature it ever made",
          "Only if the seller signs the contract again",
        ],
        answer: 0,
        why: "The timestamp proves the signature existed on 2026-11-18. The certificate was valid then and an OCSP answer from that moment is stored, so a later revocation does not change the verdict.",
      },
      fields: {
        messageImprint: "What is timestamped: the hash algorithm and the hash value.",
        hashedMessage: "The hash of the signature value, not of the file: it pins this very signature in time.",
        nonce: "Ties the reply to this request.",
        genTime: "The TSA's time. It comes from the TSA's clock, not from the user's.",
        unsignedAttrs: "Attributes added after signing. The signature does not cover them, so adding them is safe.",
      },
    },
    evidence: {
      short: "Evidence",
      title: "Store the evidence with the signature",
      body: "At signing time the server also stores the certificate chain and the OCSP answer it got right after the timestamp. In 2028 the check no longer needs the CA to be online.\n\nThe verdict is built from the proven time: the certificate was valid then, the status was `good`, and the revocation came later. The 1200 contracts verify again.",
      watch: "The TSA certificate expires too. Long-term archives add a new timestamp over the old evidence every few years.",
      fields: {
        "proven time": "The TSA time, not `signingTime`.",
        "stored OCSP": "Kept next to the CMS from the day of signing.",
        after: "Only a revocation before the proven time would make the signature invalid.",
        VALID: "The signature is provable without asking anyone.",
      },
    },
    countersign: {
      short: "Second",
      title: "The buyer signs the same contract",
      body: "The buyer opens the contract, the app hashes the same PDF and gets the same `messageDigest`. A second `signerInfo` with the buyer's certificate and its own timestamp is added to the same `SignedData`.\n\nThe server checks each signer separately, with the same four checks and the same evidence. In the strict CMS sense, a **countersignature** is different: it signs the first signer's signature value, not the document.",
      fields: {
        Authorization: "The buyer's session token. Hidden here.",
        signerInfos: "One entry per signer: here the seller and the buyer.",
        messageDigest: "Identical for both: they signed the same bytes.",
        timeStampToken: "Each signature gets its own timestamp.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for digital signatures on business documents.\n\n1) Sign a hash of the exact bytes, inside signed attributes. 2) The private key stays on the token; only the signature leaves it. 3) Verify the hash, the math, the chain, the dates and revocation (OCSP or CRL). 4) `signingTime` is a claim: get a TSA timestamp over the signature value. 5) Store the chain and the OCSP answer with the signature, so it stays provable after the certificate expires.",
    },
  },
};

export default text;
