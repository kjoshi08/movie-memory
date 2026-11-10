import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { postgresFactStore } from "@/lib/facts/store";
import { createFactService } from "@/lib/facts/service";

// Run against a disposable DB that has had `prisma migrate deploy` applied.
const enabled = Boolean(process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_URL === process.env.DATABASE_URL);
const suffix = randomUUID();
const alice = `test-alice-${suffix}`;
const bob = `test-bob-${suffix}`;
const charlie = `test-charlie-${suffix}`;

describe.skipIf(!enabled)("PostgreSQL integration", () => {
  beforeAll(async () => {
    await prisma.user.createMany({ data: [{ id: alice, favoriteMovie: "Arrival" }, { id: bob, favoriteMovie: "Arrival" }, { id: charlie, favoriteMovie: "Arrival" }] });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [alice, bob, charlie] } } });
    await prisma.$disconnect();
  });
  it("coalesces parallel requests in PostgreSQL and keeps users isolated", async () => {
    let calls = 0;
    const getFact = createFactService({ store: postgresFactStore, generate: async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 250)); return "A fact for this user"; }, sleep: () => new Promise((resolve) => setTimeout(resolve, 20)), pollAttempts: 80 });
    const results = await Promise.all(Array.from({ length: 8 }, () => getFact(alice, "Arrival")));
    expect(calls).toBe(1);
    expect(new Set(results.map((result) => result.fact.id)).size).toBe(1);
    expect(await prisma.movieFact.count({ where: { userId: alice } })).toBe(1);
    expect(await postgresFactStore.latest(bob, "Arrival")).toBeNull();
  });
  it("supports Auth.js users, Google accounts, and database sessions", async () => {
    const adapter = PrismaAdapter(prisma);
    const user = await adapter.createUser!({ id: `seed-${suffix}`, name: "Test user", email: `auth-${suffix}@example.com`, emailVerified: null });
    try {
      await adapter.linkAccount!({ userId: user.id, type: "oauth", provider: "google", providerAccountId: `google-${suffix}` });
      await adapter.createSession!({ userId: user.id, sessionToken: `token-${suffix}`, expires: new Date(Date.now() + 86_400_000) });
      const session = await adapter.getSessionAndUser!(`token-${suffix}`);
      expect(session?.user.id).toBe(user.id);
      expect((await adapter.getUserByAccount!({ provider: "google", providerAccountId: `google-${suffix}` }))?.id).toBe(user.id);
    } finally {
      await adapter.deleteUser!(user.id);
    }
  });
  it("does not save an old movie fact when the user changes movies during generation", async () => {
    let finishOld!: (value: string) => void;
    let oldStarted!: () => void;
    const started = new Promise<void>((resolve) => { oldStarted = resolve; });
    const getFact = createFactService({
      store: postgresFactStore,
      generate: async (movie) => {
        if (movie === "Arrival") { oldStarted(); return new Promise<string>((resolve) => { finishOld = resolve; }); }
        return "A fact about The Matrix";
      },
      sleep: () => new Promise((resolve) => setTimeout(resolve, 10)), pollAttempts: 100,
    });
    const oldRequest = getFact(charlie, "Arrival");
    const oldFailure = expect(oldRequest).rejects.toThrow();
    await started;
    await prisma.user.update({ where: { id: charlie }, data: { favoriteMovie: "The Matrix" } });
    const newRequest = getFact(charlie, "The Matrix");
    finishOld("An outdated Arrival fact");
    await oldFailure;
    expect((await newRequest).fact.content).toBe("A fact about The Matrix");
    expect(await postgresFactStore.latest(charlie, "Arrival")).toBeNull();
    expect((await postgresFactStore.latest(charlie, "The Matrix"))?.fact.content).toBe("A fact about The Matrix");
  });
  it("fences a former lease owner after another owner acquires the lease", async () => {
    expect(await postgresFactStore.claim(bob, "Arrival", "old")).toBe(true);
    await prisma.user.update({ where: { id: bob }, data: { factLeaseUntil: new Date(0) } });
    expect(await postgresFactStore.claim(bob, "Arrival", "new")).toBe(true);
    expect(await postgresFactStore.saveIfOwner(bob, "Arrival", "old", "wrong")).toBeNull();
    await postgresFactStore.release(bob, "old");
    expect((await prisma.user.findUnique({ where: { id: bob } }))?.factLeaseToken).toBe("new");
    expect((await postgresFactStore.saveIfOwner(bob, "Arrival", "new", "correct"))?.content).toBe("correct");
  });
});
