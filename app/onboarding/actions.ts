"use server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { movieSchema } from "@/lib/movie";

export type MovieFormState = { error: string };
export async function saveFavoriteMovie(_previous: MovieFormState, formData: FormData): Promise<MovieFormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const result = movieSchema.safeParse(formData.get("movie"));
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Please enter a movie title." };
  // An already-onboarded user cannot overwrite their title through this action.
  const update = await prisma.user.updateMany({
    where: { id: session.user.id, favoriteMovie: null },
    data: { favoriteMovie: result.data },
  });
  if (!update.count) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (!user) redirect("/");
  }
  redirect("/dashboard");
}
