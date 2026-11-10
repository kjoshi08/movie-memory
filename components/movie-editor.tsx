"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { updateFavoriteMovie } from "@/app/dashboard/actions";

export function MovieEditor({ movie }: { movie: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(movie);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function cancel() {
    setValue(movie);
    setError("");
    setEditing(false);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        const result = await updateFavoriteMovie(formData);
        if (!result.ok) { setError(result.error); return; }
        setEditing(false);
        router.refresh();
      } catch {
        setError("Could not save your movie. Please try again.");
      }
    });
  }

  if (!editing) return <button type="button" className="cinema-edit-button" onClick={() => { setValue(movie); setError(""); setEditing(true); }}><Pencil size={14} aria-hidden="true" /> Change movie</button>;
  return (
    <form onSubmit={submit} className="cinema-editor">
      <label htmlFor="edit-movie">Change your favorite movie</label>
      <div className="cinema-editor-row">
        <input id="edit-movie" name="movie" type="text" autoFocus maxLength={120} required value={value} onChange={(event) => setValue(event.target.value)} aria-invalid={!!error} aria-describedby={error ? "edit-movie-error" : undefined} placeholder="Enter a movie title" />
        <button type="submit" disabled={pending} className="cinema-edit-save">{pending ? "Saving…" : "Save"}</button>
        <button type="button" disabled={pending} onClick={cancel} className="cinema-edit-cancel"><X size={14} aria-hidden="true" /> Cancel</button>
      </div>
      {error && <p id="edit-movie-error" role="alert" className="cinema-edit-error">{error}</p>}
    </form>
  );
}
