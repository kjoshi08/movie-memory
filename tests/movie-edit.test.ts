import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { updateMany: vi.fn() } } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { updateFavoriteMovie } from "@/app/dashboard/actions";

function form(movie: string, requestedId = "victim") {
  const data = new FormData();
  data.set("movie", movie);
  data.set("userId", requestedId);
  return data;
}

describe("change favorite movie", () => {
  beforeEach(() => vi.clearAllMocks());
  it("requires a session and rejects a blank title", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    expect(await updateFavoriteMovie(form("Arrival"))).toMatchObject({ ok: false });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "alice" } } as never);
    expect(await updateFavoriteMovie(form("   "))).toMatchObject({ ok: false });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
  it("trims the title and updates only the authenticated user", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "alice" } } as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 });
    expect(await updateFavoriteMovie(form("  Arrival  "))).toEqual({ ok: true });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "alice" }, data: { favoriteMovie: "Arrival" } });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
