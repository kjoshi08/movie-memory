import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/facts", () => ({ getMovieFact: vi.fn() }));

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getMovieFact } from "@/lib/facts";
import { POST } from "@/app/api/fact/route";

function request(origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/fact?userId=victim&movie=Secret", {
    method: "POST", headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "victim", movie: "Secret" }),
  });
}

describe("fact endpoint authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); delete process.env.AUTH_URL; });
  it("requires a signed-in session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("ignores another user's ID and movie in the request", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "alice" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ favoriteMovie: "Arrival" } as never);
    vi.mocked(getMovieFact).mockResolvedValueOnce({ fact: { id: "a", content: "Alice's fact", createdAt: new Date("2026-01-01") }, source: "cache" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "alice" }, select: { favoriteMovie: true } });
    expect(getMovieFact).toHaveBeenCalledWith("alice", "Arrival");
    expect(await response.json()).toMatchObject({ fact: "Alice's fact" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("rejects cross-origin generation before touching the session or database", async () => {
    const response = await POST(request("https://attacker.example"));
    expect(response.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
