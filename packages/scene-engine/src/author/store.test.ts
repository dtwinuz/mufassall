import { describe, expect, it } from "vitest";
import { AUTHOR_STORE_KEY, type Draft, newDraft } from "./model";
import {
  SYSTEMS_KEY,
  type StorageLike,
  createSystem,
  deleteSystem,
  duplicateSystem,
  listSystems,
  loadSystem,
  migrateLegacyDraft,
  newSystemId,
  parseIndex,
  renameSystem,
  saveSystem,
  slugify,
  systemKey,
} from "./store";

class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  /** total characters allowed across keys and values; beyond it `setItem` throws like a browser */
  constructor(public limit = Infinity) {}
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    let used = 0;
    for (const [kk, vv] of this.map) if (kk !== k) used += kk.length + vv.length;
    if (used + k.length + v.length > this.limit) {
      const e = new Error("full");
      e.name = "QuotaExceededError";
      throw e;
    }
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

function titled(t: string): Draft {
  const d = newDraft();
  d.title.en = t;
  return d;
}

function clock(start = 1000) {
  let t = start;
  return () => (t += 10);
}

describe("store", () => {
  it("creates, lists newest first, loads back through sanitizeDraft", () => {
    const storage = new FakeStorage();
    const now = clock();
    const a = createSystem(titled("Payments"), "blank", { storage, now });
    const b = createSystem(titled("Orders"), "bpmn", { storage, now });
    expect(a.ok && b.ok).toBe(true);
    const list = listSystems({ storage });
    expect(list.map((m) => m.title)).toEqual(["Orders", "Payments"]);
    expect(list[0]!.source).toBe("bpmn");
    if (!a.ok) throw new Error();
    expect(loadSystem(a.value.id, { storage })?.title.en).toBe("Payments");
    // saving moves it to the top
    saveSystem(a.value.id, titled("Payments v2"), {}, { storage, now });
    expect(listSystems({ storage })[0]!.id).toBe(a.value.id);
    // the title stays what the system was called; only an untitled system takes the draft title
    expect(listSystems({ storage })[0]!.title).toBe("Payments");
  });

  it("an untitled system takes the draft title once the author types one", () => {
    const storage = new FakeStorage();
    const r = createSystem(newDraft(), "blank", { storage });
    if (!r.ok) throw new Error();
    expect(r.value.title).toBe("");
    expect(r.value.id).toMatch(/^my-lesson-[a-z0-9]+$/);
    saveSystem(r.value.id, titled("Checkout"), {}, { storage });
    expect(listSystems({ storage })[0]!.title).toBe("Checkout");
  });

  it("ids are slug + suffix, valid and never collide", () => {
    expect(slugify("Kassa: to'lov tizimi!")).toBe("kassa-tolov-tizimi");
    expect(slugify("Касса")).toBe("system");
    expect(slugify("")).toBe("system");
    const storage = new FakeStorage();
    const ids = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const r = createSystem(titled("Same title"), "blank", { storage });
      if (!r.ok) throw new Error();
      expect(r.value.id).toMatch(/^[a-z0-9-]{1,40}$/);
      ids.add(r.value.id);
    }
    expect(ids.size).toBe(60);
    // a stuck random source still yields unique ids
    const taken = new Set(["x-aaaaa"]);
    const id = newSystemId("x", taken, null, () => "aaaaa");
    expect(id).not.toBe("x-aaaaa");
    expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
    // a long title is cut to the 40 character limit
    expect(newSystemId("a".repeat(80), new Set(), null, () => "zz").length).toBeLessThanOrEqual(40);
  });

  it("duplicate, rename, delete", () => {
    const storage = new FakeStorage();
    const r = createSystem(titled("Billing"), "lesson", { storage });
    if (!r.ok) throw new Error();
    const d = duplicateSystem(r.value.id, { storage, suffix: " (copy)" });
    if (!d.ok) throw new Error();
    expect(d.value.id).not.toBe(r.value.id);
    expect(d.value.title).toBe("Billing (copy)");
    expect(d.value.source).toBe("lesson");
    expect(loadSystem(d.value.id, { storage })?.steps.length).toBe(2);
    expect(renameSystem(d.value.id, "  Billing B  ", { storage }).ok).toBe(true);
    expect(listSystems({ storage }).find((m) => m.id === d.value.id)?.title).toBe("Billing B");
    expect(deleteSystem(r.value.id, { storage }).ok).toBe(true);
    expect(storage.getItem(systemKey(r.value.id))).toBeNull();
    expect(listSystems({ storage }).map((m) => m.id)).toEqual([d.value.id]);
    expect(duplicateSystem("nope", { storage })).toEqual({ ok: false, error: "missing" });
    expect(renameSystem("nope", "x", { storage })).toEqual({ ok: false, error: "missing" });
  });

  it("migrates the old single draft and removes the old key only after the copy", () => {
    const storage = new FakeStorage();
    storage.setItem(AUTHOR_STORE_KEY, JSON.stringify(titled("Old draft")));
    const m = migrateLegacyDraft({ storage });
    expect(m?.title).toBe("Old draft");
    expect(storage.getItem(AUTHOR_STORE_KEY)).toBeNull();
    expect(loadSystem(m!.id, { storage })?.title.en).toBe("Old draft");
    // second load: nothing to do
    expect(migrateLegacyDraft({ storage })).toBeNull();
    expect(listSystems({ storage })).toHaveLength(1);
  });

  it("saving a shared link carries the legacy draft in exactly once", () => {
    // what the viewer does on "Save to my systems": migrate, then create with source "link"
    const storage = new FakeStorage();
    storage.setItem(AUTHOR_STORE_KEY, JSON.stringify(titled("Eski")));
    const saveLink = (d: Draft) => {
      migrateLegacyDraft({ storage });
      return createSystem(d, "link", { storage });
    };
    const a = saveLink(titled("Shared A"));
    const b = saveLink(titled("Shared B"));
    if (!a.ok || !b.ok) throw new Error();
    expect(a.value.source).toBe("link");
    expect(storage.getItem(AUTHOR_STORE_KEY)).toBeNull();
    const list = listSystems({ storage });
    expect(list).toHaveLength(3);
    expect(list.filter((m) => m.title === "Eski")).toHaveLength(1);
    expect(list.filter((m) => m.source === "link").map((m) => m.title).sort()).toEqual(["Shared A", "Shared B"]);
    expect(parseIndex(storage.getItem(SYSTEMS_KEY))?.find((m) => m.id === b.value.id)?.source).toBe("link");
  });

  it("keeps the old key when the copy cannot be written", () => {
    const old = JSON.stringify(titled("Old draft"));
    const storage = new FakeStorage(AUTHOR_STORE_KEY.length + old.length + 10);
    storage.setItem(AUTHOR_STORE_KEY, old);
    expect(migrateLegacyDraft({ storage })).toBeNull();
    expect(storage.getItem(AUTHOR_STORE_KEY)).toBe(old);
    expect(listSystems({ storage })).toEqual([]);
  });

  it("drops a blank starter draft and leaves junk alone", () => {
    const storage = new FakeStorage();
    storage.setItem(AUTHOR_STORE_KEY, JSON.stringify(newDraft()));
    expect(migrateLegacyDraft({ storage })).toBeNull();
    expect(storage.getItem(AUTHOR_STORE_KEY)).toBeNull();
    storage.setItem(AUTHOR_STORE_KEY, "{not json");
    expect(migrateLegacyDraft({ storage })).toBeNull();
    expect(storage.getItem(AUTHOR_STORE_KEY)).toBe("{not json");
  });

  it("reports a full storage as quota and rolls back a half-written create", () => {
    const storage = new FakeStorage(6000);
    const first = createSystem(titled("Fits"), "blank", { storage });
    expect(first.ok).toBe(true);
    const big = titled("Too big");
    big.summary.en = "x".repeat(8000);
    const r = createSystem(big, "blank", { storage });
    expect(r).toEqual({ ok: false, error: "quota" });
    expect(listSystems({ storage })).toHaveLength(1);
    // a save that does not fit keeps the stored copy as it was
    if (!first.ok) throw new Error();
    expect(saveSystem(first.value.id, big, {}, { storage })).toEqual({ ok: false, error: "quota" });
    expect(loadSystem(first.value.id, { storage })?.title.en).toBe("Fits");
  });

  it("no storage at all is reported, never thrown", () => {
    expect(listSystems({ storage: null })).toEqual([]);
    expect(createSystem(newDraft(), "blank", { storage: null })).toEqual({ ok: false, error: "blocked" });
    const throwing: StorageLike = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
    };
    expect(listSystems({ storage: throwing })).toEqual([]);
    expect(createSystem(newDraft(), "blank", { storage: throwing })).toEqual({ ok: false, error: "blocked" });
    expect(migrateLegacyDraft({ storage: throwing })).toBeNull();
  });

  it("ignores a corrupted index entry by entry, and rebuilds a broken index from the drafts", () => {
    expect(parseIndex("{oops")).toBeNull();
    expect(parseIndex(null)).toEqual([]);
    const items = parseIndex(
      JSON.stringify({
        v: 1,
        items: [
          { id: "ok-1", title: "A", updated: 5, source: "mermaid" },
          { id: "ok-1", title: "dup", updated: 9 },
          { id: "Bad ID", title: "B", updated: 1 },
          { id: "no-time", title: "C" },
          { id: "ok-2", title: 42, updated: 7, source: "evil" },
          null,
          "str",
        ],
      }),
    );
    expect(items).toEqual([
      { id: "ok-2", title: "", updated: 7 },
      { id: "ok-1", title: "A", updated: 5, source: "mermaid" },
    ]);

    const storage = new FakeStorage();
    const r = createSystem(titled("Survivor"), "blank", { storage });
    if (!r.ok) throw new Error();
    storage.setItem(systemKey("junk-1"), "{broken");
    storage.setItem(SYSTEMS_KEY, "]]garbage");
    expect(listSystems({ storage }).map((m) => [m.id, m.title])).toEqual([[r.value.id, "Survivor"]]);
    // a corrupted draft loads as nothing, it does not throw
    expect(loadSystem("junk-1", { storage })).toBeNull();
    expect(loadSystem("../etc", { storage })).toBeNull();
  });
});
