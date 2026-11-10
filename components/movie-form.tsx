"use client";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { saveFavoriteMovie } from "@/app/onboarding/actions";

export function MovieForm() {
  const [state, action, pending] = useActionState(saveFavoriteMovie, { error: "" });
  return (
    <form action={action} className="mt-9">
      <label htmlFor="movie" className="mb-3 block text-[12px] font-semibold text-[#dedbd7]">Favorite movie</label>
      <input id="movie" name="movie" type="text" maxLength={120} required autoComplete="off" placeholder="e.g. The Grand Budapest Hotel" aria-describedby={state.error ? "movie-help movie-error" : "movie-help"} aria-invalid={!!state.error} className="h-14 w-full rounded-lg border border-white/15 bg-[#0c0e13] px-4 text-[14px] text-white placeholder:text-[#696a75]" />
      <p id="movie-help" className="mt-3 text-[11px] leading-5 text-[#92939d]">The movie you could watch over and over again.</p>
      {state.error && <p id="movie-error" role="alert" className="mt-2 text-[12px] text-[#ffc4b7]">{state.error}</p>}
      <button disabled={pending} type="submit" className="button-primary mt-7 w-full sm:w-auto">{pending ? "Saving..." : "Continue to your dashboard"} <ArrowRight size={16} aria-hidden="true" /></button>
    </form>
  );
}
