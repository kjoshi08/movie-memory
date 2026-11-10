import { redirect } from "next/navigation";
import { ArrowRight, Clapperboard, Sparkles } from "lucide-react";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { GoogleIcon } from "@/components/google-icon";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { favoriteMovie: true } });
    if (user) redirect(user.favoriteMovie ? "/dashboard" : "/onboarding");
  }

  return (
    <main id="main" className="site-shell">
      <section className="grid min-h-[640px] items-center gap-14 py-16 lg:grid-cols-[1fr_0.9fr] lg:gap-24 lg:py-20">
        <div className="max-w-[570px]">
          <p className="eyebrow mb-6 flex items-center gap-2"><Sparkles size={13} aria-hidden="true" /> FOR THE FILMS YOU NEVER FORGET</p>
          <h1 className="serif text-[clamp(3.5rem,6.5vw,5.8rem)] leading-[.99] tracking-[-.045em]">Your favorite movie has <span className="text-[#efa083] italic">more to tell.</span></h1>
          <p className="muted mt-7 max-w-[430px] text-[15px] leading-7">The stories don’t end when the credits roll. Pick a movie you love and discover a little something new about it.</p>
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }} className="mt-9">
            <button type="submit" className="button-primary"><GoogleIcon /> Sign in with Google <ArrowRight size={16} aria-hidden="true" /></button>
          </form>
          <p className="mt-4 text-[11px] text-[#878994]">One favorite film. A little movie magic.</p>
          <div className="mt-14 flex max-w-[430px] items-center gap-5 border-t border-white/10 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-[#e9a084]"><Clapperboard size={17} aria-hidden="true" /></div>
            <p className="text-[12px] leading-5 text-[#a9a9b2]"><strong className="font-semibold text-[#e7e4df]">A space just for you.</strong><br />Your favorite film and its facts, all in one place.</p>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[430px]" aria-hidden="true">
          <div className="ticket-dots absolute -top-5 -right-5 h-28 w-28 opacity-70" />
          <div className="panel relative overflow-hidden p-4 shadow-[0_30px_100px_rgba(0,0,0,.4)]">
            <div className="relative flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-[#e49b7f]/20 bg-[#2a1d21] px-7 py-7 sm:min-h-[470px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(223,133,99,.35),transparent_38%),linear-gradient(160deg,transparent_15%,rgba(5,7,13,.88)_100%)]" />
              <div className="relative flex items-center justify-between text-[9px] font-bold tracking-[.2em] text-[#efc3af]"><span>MOVIE MEMORY PRESENTS</span><span>01 / 01</span></div>
              <div className="relative flex flex-1 items-center justify-center">
                <div className="reel flex h-36 w-36 items-center justify-center rounded-full border border-[#f4b69d]/45 sm:h-44 sm:w-44"><div className="flex h-[74%] w-[74%] items-center justify-center rounded-full border border-[#f4b69d]/40"><span className="serif text-[62px] leading-none text-[#f3bd9f]">✦</span></div></div>
              </div>
              <div className="relative"><p className="mb-3 text-[9px] font-bold tracking-[.23em] text-[#e7ad94]">A LITTLE SOMETHING EXTRA</p><p className="serif text-[2.4rem] leading-[1.04] tracking-[-.03em] text-[#fff8ef]">For the love<br /><i>of the story.</i></p></div>
            </div>
            <div className="flex items-center justify-between px-2 pt-4 pb-1 text-[9px] font-bold tracking-[.17em] text-[#9e9da4]"><span>YOUR FAVORITE FILM</span><span className="text-[#e7a48a]">✦ &nbsp; YOUR NEXT FACT</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
