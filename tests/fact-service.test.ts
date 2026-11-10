import { describe, expect, it, vi } from "vitest";
import { createFactService, FactUnavailableError, isFresh, type Fact, type FactStore, type Snapshot } from "@/lib/facts/service";

class MemoryStore implements FactStore {
  now = Date.parse("2026-01-01T00:00:00Z");
  facts = new Map<string, Fact>();
  leases = new Map<string, string>();
  key(user: string, movie: string) { return JSON.stringify([user, movie]); }
  put(user: string, movie: string, ageMs: number, content = "Saved fact") {
    this.facts.set(this.key(user, movie), { id: `${user}-${movie}`, content, createdAt: new Date(this.now - ageMs) });
  }
  async latest(user: string, movie: string): Promise<Snapshot | null> {
    const fact = this.facts.get(this.key(user, movie));
    return fact ? { fact, observedAt: new Date(this.now) } : null;
  }
  async claim(user: string, _movie: string, token: string) {
    if (this.leases.has(user)) return false;
    this.leases.set(user, token);
    return true;
  }
  async leaseActive(user: string) { return this.leases.has(user); }
  async saveIfOwner(user: string, movie: string, token: string, content: string) {
    if (this.leases.get(user) !== token) return null;
    this.put(user, movie, 0, content);
    this.leases.delete(user);
    return this.facts.get(this.key(user, movie))!;
  }
  async release(user: string, token: string) { if (this.leases.get(user) === token) this.leases.delete(user); }
}

describe("60-second cache window", () => {
  it("accepts a fact at 59,999 ms, but not at 60,000 ms or with a future timestamp", () => {
    const now = new Date("2026-01-01T00:01:00.000Z");
    const snapshot = (age: number): Snapshot => ({ fact: { id: "1", content: "fact", createdAt: new Date(now.getTime() - age) }, observedAt: now });
    expect(isFresh(snapshot(59_999))).toBe(true);
    expect(isFresh(snapshot(60_000))).toBe(false);
    expect(isFresh(snapshot(-1))).toBe(false);
  });

  it("reuses a fresh user/movie fact and generates a new one at the boundary", async () => {
    const store = new MemoryStore();
    store.put("alice", "Arrival", 59_999);
    const generate = vi.fn().mockResolvedValue("A new fact");
    const getFact = createFactService({ store, generate });
    expect((await getFact("alice", "Arrival")).source).toBe("cache");
    expect(generate).not.toHaveBeenCalled();
    store.now += 1;
    const result = await getFact("alice", "Arrival");
    expect(result).toMatchObject({ source: "generated", fact: { content: "A new fact" } });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("rechecks after claiming to avoid duplicate work after a cache-read race", async () => {
    const store = new MemoryStore();
    const claim = store.claim.bind(store);
    vi.spyOn(store, "claim").mockImplementation(async (...args) => {
      const acquired = await claim(...args);
      store.put("alice", "Arrival", 0, "Just saved by another request");
      return acquired;
    });
    const generate = vi.fn();
    const result = await createFactService({ store, generate })("alice", "Arrival");
    expect(result).toMatchObject({ source: "cache", fact: { content: "Just saved by another request" } });
    expect(generate).not.toHaveBeenCalled();
    expect(store.leases.size).toBe(0);
  });
});

describe("concurrency and failure", () => {
  it("coalesces concurrent requests and saves only one generated fact", async () => {
    const store = new MemoryStore();
    let finish!: (fact: string) => void;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    const generate = vi.fn(() => { started(); return new Promise<string>((resolve) => { finish = resolve; }); });
    const getFact = createFactService({ store, generate, sleep: () => new Promise((resolve) => setTimeout(resolve, 1)), pollAttempts: 100 });
    const first = getFact("alice", "Arrival");
    await entered;
    const second = getFact("alice", "Arrival");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(generate).toHaveBeenCalledTimes(1);
    finish("A shared fact");
    const [a, b] = await Promise.all([first, second]);
    expect(a.fact.content).toBe("A shared fact");
    expect(b.fact.content).toBe("A shared fact");
    expect(new Set([a.source, b.source])).toEqual(new Set(["generated", "cache"]));
    expect(store.facts.size).toBe(1);
  });

  it("starts the new movie's fact after the previous movie releases its lease", async () => {
    const store = new MemoryStore();
    store.leases.set("alice", "old-movie-worker");
    const generate = vi.fn().mockResolvedValue("A fact about the new movie");
    const getFact = createFactService({ store, generate, sleep: async () => { store.leases.delete("alice"); }, pollAttempts: 2 });
    const result = await getFact("alice", "The Matrix");
    expect(result).toMatchObject({ source: "generated", fact: { content: "A fact about the new movie" } });
    expect(generate).toHaveBeenCalledOnce();
  });

  it("returns the last saved fact when the model fails, otherwise a friendly error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store = new MemoryStore();
    const getFact = createFactService({ store, generate: async () => { throw new Error("private provider error"); } });
    store.put("alice", "Arrival", 61_000, "Older fact");
    expect(await getFact("alice", "Arrival")).toMatchObject({ source: "stale", fact: { content: "Older fact" } });
    await expect(getFact("bob", "Arrival")).rejects.toBeInstanceOf(FactUnavailableError);
    expect(store.leases.size).toBe(0);
  });

  it("does not let an expired/replaced lease publish or clear a successor's lease", async () => {
    const store = new MemoryStore();
    const getFact = createFactService({ store, newToken: () => "first", generate: async () => {
      store.leases.set("alice", "successor");
      return "Late result";
    } });
    await expect(getFact("alice", "Arrival")).rejects.toBeInstanceOf(FactUnavailableError);
    expect(store.facts.size).toBe(0);
    expect(store.leases.get("alice")).toBe("successor");
  });

  it("never uses another user's cached fact, even for the same movie", async () => {
    const store = new MemoryStore();
    store.put("victim", "Arrival", 0, "Victim-only fact");
    const generate = vi.fn().mockResolvedValue("Alice's own fact");
    const result = await createFactService({ store, generate })("alice", "Arrival");
    expect(result.fact.content).toBe("Alice's own fact");
    expect(result.fact.content).not.toBe("Victim-only fact");
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
