"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { movieSchema } from "@/lib/movie";

export type UpdateMovieResult = { ok: true } | { ok: false; error: string };

export async function updateFavoriteMovie(formData: FormData): Promise<UpdateMovieResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Please sign in again." };
  const result = movieSchema.safeParse(formData.get("movie"));
  if (!result.success) return { ok: false, error: result.error.issues[0]?.message ?? "Please enter a movie title." };
  try {
    // The user ID is derived exclusively from the authenticated session.
    const update = await prisma.user.updateMany({ where: { id: session.user.id }, data: { favoriteMovie: result.data } });
    if (!update.count) return { ok: false, error: "Your account could not be found. Please sign in again." };
  } catch {
    console.error("[favorite-movie] update failed");
    return { ok: false, error: "Could not save your movie. Please try again." };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}
