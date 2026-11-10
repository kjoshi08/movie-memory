"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; fact: string; stale: boolean };

async function fetchFact(signal?: AbortSignal): Promise<State | null> {
  try {
    const response = await fetch("/api/fact", { method: "POST", cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load a fact. Please try again.");
    if (typeof data.fact !== "string") throw new Error("Could not load a fact. Please try again.");
    return { status: "ready", fact: data.fact, stale: data.source === "stale" };
  } catch (error) {
    if (signal?.aborted) return null;
    return { status: "error", message: error instanceof Error ? error.message : "Could not load a fact. Please try again." };
  }
}

export function FactCard({ movie }: { movie: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  function refresh() {
    setState({ status: "loading" });
    void fetchFact().then((result) => { if (result) setState(result); });
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetchFact(controller.signal).then((result) => { if (result) setState(result); });
    return () => controller.abort();
  }, []);

  return (
    <section aria-labelledby="fact-heading" className="cinema-fact">
      <div className="cinema-fact-header"><div className="cinema-fact-eyebrow"><span className="cinema-fact-bulb-small" aria-hidden="true">💡</span> FUN FACTS</div><span className="cinema-fact-index" aria-hidden="true">THE EXTRA SCENE <ArrowUpRight size={14} /></span></div>
      <div className="cinema-fact-heading"><div><h2 id="fact-heading">Did you <em>know?</em></h2><p>A little something about <span>{movie}</span></p></div><div className="cinema-fact-spark" aria-hidden="true">💡</div></div>
      <div aria-live="polite" className="cinema-fact-body">
        {state.status === "loading" && <p className="cinema-fact-muted">Finding a little something about your movie…</p>}
        {state.status === "error" && <div><p className="cinema-fact-error">{state.message}</p><button type="button" className="cinema-retry" onClick={refresh}>Try again <span aria-hidden="true">↗</span></button></div>}
        {state.status === "ready" && <><span className="cinema-quote-mark" aria-hidden="true">“</span><p className="cinema-fact-copy">{state.fact}</p>{state.stale && <p className="cinema-stale">Showing your last saved fact while a new one is unavailable.</p>}</>}
      </div>
      <div className="cinema-fact-footer"><p>AI-generated facts can be inaccurate.<br />Refreshing within a minute may show the same fact.</p><button type="button" disabled={state.status === "loading"} onClick={refresh} className="cinema-refresh"><RefreshCw size={15} aria-hidden="true" /> <span>Refresh fact</span></button></div>
    </section>
  );
}
