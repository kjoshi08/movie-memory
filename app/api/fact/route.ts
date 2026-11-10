import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getMovieFact } from "@/lib/facts";
import { FactUnavailableError } from "@/lib/facts/service";
import { isSameOrigin } from "@/lib/auth/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Please sign in to continue." }, { status: 401, headers });

  try {
    // We deliberately accept no user ID or movie from the caller.
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { favoriteMovie: true } });
    if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401, headers });
    if (!user.favoriteMovie) return Response.json({ error: "Please choose a movie first." }, { status: 409, headers });
    const result = await getMovieFact(session.user.id, user.favoriteMovie);
    return Response.json({ fact: result.fact.content, createdAt: result.fact.createdAt.toISOString(), source: result.source }, { headers });
  } catch (error) {
    if (error instanceof FactUnavailableError) {
      return Response.json({ error: error.message }, { status: 503, headers });
    }
    console.error("[movie-fact] request failed");
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500, headers });
  }
}
