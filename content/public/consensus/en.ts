import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Consensus and leader election",
  summary:
    "Two copies of a nightly payout job must agree which one runs it. Pinging each other fails, one lock server is a single point of failure. How a five-node cluster elects a leader, keeps a replicated log and avoids split brain by counting to a majority.",
  learn: [
    "Why two nodes cannot safely decide who is leader on their own",
    "How a Raft-style cluster replicates a log and commits on a majority",
    "What terms and votes do when the leader dies or is cut off",
    "Why a lock still needs a fencing token, and where to keep it (etcd, ZooKeeper)",
  ],
  nodes: {
    w1: "Payout worker 1",
    w2: "Payout worker 2",
    ledger: "Payouts DB",
    n1: "Node 1",
    n2: "Node 2",
    n3: "Node 3",
    n4: "Node 4",
    n5: "Node 5",
  },
  metrics: {
    double: "Paid twice",
    outage: "No lock available",
    commit: "Lock write time",
  },
  steps: {
    "two-leaders": {
      short: "Two leaders",
      title: "Two workers, both think they are in charge",
      body: "The nightly payout job runs on two servers for safety. They ping each other: whoever stops hearing the other takes over.\n\nOne night the network between them hiccups for a few seconds. Each decides the other is dead and both run the payouts. 312 merchants are paid twice.",
      watch: "A missing reply never tells you whether the other side is dead or just unreachable.",
      fields: {
        run: "The night being paid. Both workers wrote the same night.",
        "INSERT 0 312": "312 payout rows from worker 2, on top of the 312 from worker 1.",
      },
    },
    "lock-server": {
      short: "Lock server",
      title: "Ask a third party: one lock server",
      body: "Now a separate lock server decides. Before running, a worker asks for the `payouts` lock. Only one gets it; the other is told who holds it.\n\nA lock has a lifetime: if the holder dies, the lock expires and the other worker can take it. Double payouts stop.",
      fields: {
        ttl_s: "The lock expires 15 s after the last renewal. The holder renews it while it works.",
        granted: "No: someone else holds the lock.",
        holder: "Worker 1 has it. Worker 2 waits and asks again later.",
      },
    },
    "single-dies": {
      short: "Server dies",
      title: "The lock server is the new single point of failure",
      body: "The lock server's disk fails. Neither worker can get the lock, so neither runs, which is correct, but the payouts do not happen.\n\nIt takes 30 minutes to rebuild the server. And if it comes back with an empty disk, it has forgotten who held the lock.",
      fields: {
        ECONNREFUSED: "Nothing listens on the lock port any more.",
        skipped: "The safe choice: no lock, no payouts. Safe, but nobody gets paid.",
      },
    },
    cluster: {
      short: "Cluster",
      title: "Five nodes, one leader, one replicated log",
      body: "The lock service now runs on five nodes. One of them is the leader; it receives every change, appends it to its log and sends the new entries to the others.\n\nThe followers write the entries to disk and reply. The log is the same on every node, in the same order, so every node can answer with the same state.",
      fields: {
        term: "The election period. Each new leader starts a higher term; an old term means an old leader.",
        leader: "Who sends this. Followers redirect clients to it.",
        prev_index: "The entry just before the new ones. The follower accepts only if it has that entry too: logs stay identical.",
        entries: "The new change: entry 42 says the `payouts` lock belongs to w1.",
        commit: "The last entry known to be safe. Followers apply entries up to here.",
        success: "Node 2 has written entry 42 to disk.",
      },
    },
    majority: {
      short: "Majority",
      title: "A write is safe once a majority has it",
      body: "Worker 1 asks for the lock. The leader answers \"granted\" only after 3 of 5 nodes have stored entry 42: itself and two followers.\n\nAny future majority of 3 must include at least one of those nodes. So no later leader can exist without this entry. Two nodes can die and nothing committed is lost.",
      fields: {
        index: "The position of this lock in the log.",
        acks: "3 of 5 stored it: a majority, so it is committed.",
        fence: "A number that only grows. Keep it: the payouts DB will check it later.",
      },
    },
    partition: {
      short: "Partition",
      title: "The leader is cut off with one follower",
      body: "A switch fails. Node 1 (still the leader) and node 5 are on one side, nodes 2, 3 and 4 on the other.\n\nNode 1 accepts worker 1's request and writes entry 43, but only 2 of 5 nodes store it. It never reaches a majority, so it is never committed, and the client gets an error instead of a lock.",
      watch: "A leader on the minority side can still accept requests. It just cannot commit them.",
      fields: {
        error: "`not_committed`: the entry is in the log of two nodes, but that is not enough.",
        acks: "Node 1 and node 5: two out of five.",
        needed: "A majority of five. The minority side can never get there.",
      },
    },
    election: {
      short: "Election",
      title: "The majority side elects a new leader",
      body: "Nodes 2, 3 and 4 stop hearing from the leader. After a random timeout of a few hundred ms node 2 goes first: it starts term 2 and asks for votes.\n\nEach node gives one vote per term, and only to a candidate whose log is at least as complete as its own. Node 2 gets 3 votes and leads. The lock was unavailable for 0.4 s.",
      fields: {
        term: "Term 2: a new period. Anyone still in term 1 is now out of date.",
        candidate: "Node 2 votes for itself and asks the others.",
        last_index: "Node 2 has every committed entry up to 42, so it may lead.",
        vote_granted: "Node 3's one vote for term 2. With node 4's vote and its own, node 2 has 3 of 5.",
      },
    },
    heal: {
      short: "Heal",
      title: "The old leader comes back and steps down",
      body: "The switch is replaced. Node 1 still thinks it leads term 1, then receives a message from node 2 with term 2.\n\nA higher term always wins: node 1 becomes a follower, throws away its uncommitted entry 43 and copies node 2's log. There were never two leaders able to commit at once: split brain is avoided by counting.",
      fields: {
        "stepping down": "A node that sees a higher term stops leading immediately.",
        truncating: "Entry 43 never reached a majority, so it is removed. Nobody was told it succeeded.",
        "not committed": "That is why removing it is safe: the client got an error for it.",
      },
    },
    fencing: {
      short: "Fencing",
      title: "A paused worker wakes up with an old lock",
      body: "Worker 1 freezes for 20 s in a long garbage-collection pause. Its lock expires and worker 2 gets the lock at index 51. Then worker 1 wakes up, still believing it holds lock 42.\n\nThe payouts DB stores the highest fence it has seen and rejects anything older. Worker 1's write changes nothing, and it learns it lost the lock.",
      watch: "The cluster can be right and a client can still act on an expired lock. The resource must check the fence.",
      fields: {
        "fence < 42": "Only a run with a newer fence may take over. The table already holds fence 51.",
        "UPDATE 0": "Nothing written. Worker 1's late payout run is blocked.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Agreeing on a leader needs a majority, not a ping.\n\n1) Run 3 or 5 nodes: they survive 1 or 2 failures. 2) A change is committed only when a majority stored it. 3) Terms and votes give at most one leader per term; a minority can never commit. 4) Locks carry a fencing token that the protected resource checks. Do not build this yourself: keep locks, leaders and config in etcd, ZooKeeper or Consul.",
    },
  },
};

export default text;
