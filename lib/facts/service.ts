import { randomUUID } from "node:crypto";

export const CACHE_WINDOW_MS = 60_000;
export const LEASE_SECONDS = 30;
export const POLL_INTERVAL_MS = 250;
export const MAX_POLL_ATTEMPTS = 40;

export type Fact = { id: string; content: string; createdAt: Date };
export type Snapshot = { fact: Fact; observedAt: Date };
export type FactResult = { fact: Fact; source: "generated" | "cache" | "stale" };

export interface FactStore {
  latest(userId: string, movie: string): Promise<Snapshot | null>;
  claim(userId: string, movie: string, token: string): Promise<boolean>;
  leaseActive(userId: string): Promise<boolean>;
  saveIfOwner(userId: string, movie: string, token: string, content: string): Promise<Fact | null>;
  release(userId: string, token: string): Promise<void>;
}

export class FactUnavailableError extends Error {
  constructor() {
    super("A movie fact is temporarily unavailable. Please try again.");
    this.name = "FactUnavailableError";
  }
}

/** Use the database's observed time, not potentially skewed app-server clocks. */
export function isFresh(snapshot: Snapshot | null): boolean {
  if (!snapshot) return false;
  const age = snapshot.observedAt.getTime() - snapshot.fact.createdAt.getTime();
  return age >= 0 && age < CACHE_WINDOW_MS;
}

export function createFactService({
  store,
  generate,
  sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  newToken = randomUUID,
  pollAttempts = MAX_POLL_ATTEMPTS,
}: {
  store: FactStore;
  generate: (movie: string) => Promise<string>;
  sleep?: (ms: number) => Promise<void>;
  newToken?: () => string;
  pollAttempts?: number;
}) {
  return async function getFact(userId: string, movie: string): Promise<FactResult> {
    let latest = await store.latest(userId, movie);
    if (latest && isFresh(latest)) return { fact: latest.fact, source: "cache" };

    const token = newToken();
    let claimed = await store.claim(userId, movie, token);
    if (!claimed) {
      // Wait for the current owner, including one finishing a previous movie.
      // If it releases without producing this movie's fact, try to claim the lease.
      for (let attempt = 0; attempt < pollAttempts; attempt++) {
        await sleep(POLL_INTERVAL_MS);
        latest = await store.latest(userId, movie);
        if (latest && isFresh(latest)) return { fact: latest.fact, source: "cache" };
        if (!(await store.leaseActive(userId))) {
          claimed = await store.claim(userId, movie, token);
          if (claimed) break;
        }
      }
      if (!claimed) {
        if (latest) return { fact: latest.fact, source: "stale" };
        throw new FactUnavailableError();
      }
    }

    try {
      // A concurrent request might have finished after our initial cache read.
      latest = await store.latest(userId, movie);
      if (latest && isFresh(latest)) return { fact: latest.fact, source: "cache" };

      let content: string;
      try {
        content = (await generate(movie)).trim();
        if (!content || content.length > 1000) throw new Error("Invalid model output");
      } catch {
        // Do not log prompts, OAuth tokens, API errors, or personal data.
        console.error("[movie-fact] generation failed");
        const fallback = await store.latest(userId, movie);
        if (fallback) return { fact: fallback.fact, source: "stale" };
        throw new FactUnavailableError();
      }
      const saved = await store.saveIfOwner(userId, movie, token, content);
      if (saved) return { fact: saved, source: "generated" };
      // A slow/paused owner cannot publish after its lease expires or is replaced.
      const fallback = await store.latest(userId, movie);
      if (fallback) return { fact: fallback.fact, source: isFresh(fallback) ? "cache" : "stale" };
      throw new FactUnavailableError();
    } finally {
      try {
        await store.release(userId, token);
      } catch {
        // The lease expires automatically; never expose database errors to clients.
        console.error("[movie-fact] lease release failed");
      }
    }
  };
}
