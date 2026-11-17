import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Service discovery",
  summary:
    "An orders service calls inventory instances that start, stop and move. How a registry with heartbeats replaces hard-coded IPs, and the three ways to ask it: from the client, through DNS, or through a load balancer.",
  learn: [
    "Why hard-coded addresses break as soon as instances move",
    "How instances register and how heartbeats remove dead ones",
    "Client-side discovery vs server-side discovery",
    "DNS-based discovery and what its TTL costs",
  ],
  nodes: {
    orders: "Orders service",
    "inv-a": "Inventory A",
    "inv-b": "Inventory B",
    "inv-c": "Inventory C",
    "inv-d": "Inventory D",
    registry: "Service registry",
    lb: "Load balancer",
  },
  metrics: {
    errors: "Failed stock calls",
    drain: "Time to stop calling a dead instance",
    instances: "Live inventory instances",
  },
  steps: {
    hardcoded: {
      short: "Hard-coded",
      title: "Two IPs in a config file",
      body: "The orders service checks stock before every order. It knows inventory as two addresses in its config, `192.0.2.11` and `192.0.2.12`, and alternates between them.\n\nThis works as long as nothing moves. In a cloud or a container platform, that is not for long.",
      fields: {
        Host: "A raw IP and port. The caller knows exactly which machine it is talking to.",
        qty: "14 in stock. The order can go ahead.",
      },
    },
    moved: {
      short: "Moved",
      title: "An instance moved; the config did not",
      body: "The platform replaced instance B after a host failure. The new copy, C, started on `192.0.2.27`. Orders still sends half its calls to `.12`, where nothing listens.\n\nHalf the stock checks fail and C sits idle. Someone has to notice, edit the config and redeploy orders: half an hour.",
      watch: "Autoscaling, deploys and host failures all change addresses. Any address written by hand is already out of date.",
      fields: {
        Host: "The old address, still in the config.",
        ECONNREFUSED: "Nothing is listening on that port: the machine or the process is gone.",
        INVENTORY_HOSTS: "The list lives in config, so changing it means a deploy of a different service.",
      },
    },
    registry: {
      short: "Registry",
      title: "Instances register themselves",
      body: "A service registry is a small, highly available database of who is running where. Each inventory instance, on start, tells the registry its name, id and address.\n\nThe list now changes with reality, not with someone's config edit. Nobody types IPs any more.",
      fields: {
        Name: "The logical service. Callers ask for `inventory`, never for a machine.",
        ID: "This one instance. Several instances share one name.",
        Address: "Whatever IP the platform gave this instance today.",
        Port: "Ports can differ between instances too, so they are registered, not assumed.",
      },
    },
    "client-side": {
      short: "Client-side",
      title: "Client-side discovery",
      body: "Orders asks the registry for healthy `inventory` instances, caches the list for a few seconds and picks one per call itself, round-robin.\n\nThe platform adds instance D under load. D registers, orders sees it on the next refresh, and traffic spreads over three instances without any deploy.",
      watch: "Every caller needs the discovery and balancing logic. With five languages, that is five libraries to keep correct.",
      fields: {
        passing: "Only instances whose health check passes. Dead ones should never be in the answer.",
        Address: "Orders connects straight to these addresses. No extra hop in the middle.",
      },
    },
    crash: {
      short: "Crash",
      title: "A crashed instance stays on the list",
      body: "Instance A's host loses power. A had no chance to deregister, so the registry still lists it as healthy.\n\nOrders keeps sending a third of its calls to A and waits 2 seconds for each. A list that only changes when instances politely say goodbye is not enough.",
      fields: {
        timeout: "Two seconds per call, wasted on a machine that is gone.",
        passing: "The registry believes the last thing A told it. It has no way to know otherwise yet.",
      },
    },
    heartbeat: {
      short: "Heartbeat",
      title: "Heartbeats and health checks",
      body: "Each instance now reports \"I am alive\" every 5 seconds, with a 15-second TTL. If the TTL runs out, the registry marks the instance **critical** and drops it from the healthy list.\n\nA dead instance stops getting traffic within about 20 seconds, with nobody touching anything. The registry can also call each instance's `/health` itself, which catches a process that is alive but stuck.",
      fields: {
        pass: "The heartbeat: one tiny request that says this instance is still healthy.",
        TTL: "How long a heartbeat is valid. Three missed heartbeats and the instance is out.",
        critical: "Failing state. Critical instances are never returned to callers.",
      },
    },
    dns: {
      short: "DNS",
      title: "DNS-based discovery",
      body: "The registry can also answer DNS. Orders resolves `inventory.service.internal` and gets the IPs of healthy instances. Any language and any tool already speaks DNS, so no library is needed.\n\nThe cost is caching. The answer has a 5-second TTL, but some resolvers and runtimes keep it longer, so a dead instance may be called for longer than with a direct query.",
      watch: "Check how your runtime caches DNS. Some cache forever by default, which silently turns DNS discovery back into hard-coded IPs.",
      fields: {
        "ANSWER SECTION": "Only healthy instances: the registry builds this answer from its live list.",
        "IN A": "An address record. The `5` before it is the TTL in seconds: how long the caller may reuse it.",
      },
    },
    "server-side": {
      short: "Server-side",
      title: "Server-side discovery: let a load balancer ask",
      body: "Now orders calls one stable name, `inventory.internal`. A load balancer behind it watches the registry and sends each request to a healthy instance.\n\nCallers stay simple, in any language. The price is one more network hop and one more component that must itself be highly available.",
      fields: {
        Host: "A stable name. Orders never sees an instance address again.",
        "X-Upstream": "Which instance the load balancer picked. Useful in logs when one instance misbehaves.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Never write instance addresses by hand.\n\n1) Instances register their name and address in a registry on start. 2) Heartbeats with a TTL and active health checks remove dead instances automatically. 3) Client-side discovery: the caller asks the registry and balances itself, no extra hop. 4) Server-side discovery: a load balancer asks for you, simpler callers, one more hop. 5) DNS discovery works everywhere, but watch the TTL and caching.",
    },
  },
};

export default text;
