import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowUpRight, Clapperboard, Film, LogOut, Sparkles, Ticket, UserRound } from "lucide-react";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { FactCard } from "@/components/fact-card";
import { MovieEditor } from "@/components/movie-editor";

function googlePhoto(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com")) ? url.toString() : null;
  } catch { return null; }
}

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, image: true, favoriteMovie: true } });
  if (!user) redirect("/");
  if (!user.favoriteMovie) redirect("/onboarding");
  const photo = googlePhoto(user.image);
  const name = user.name?.trim() || "Movie lover";

  return (
    <main id="main" className="site-shell cinema-dashboard">
      <div className="cinema-intro">
        <div>
          <div className="cinema-overline"><span className="cinema-dot" /> YOUR PERSONAL SCREENING ROOM</div>
          <h1 className="cinema-greeting">Welcome back, <em>{name}.</em></h1>
          <p className="cinema-subtitle">A little more to love about the movie you love.</p>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
          <button type="submit" className="cinema-signout"><LogOut size={15} aria-hidden="true" /> Sign out</button>
        </form>
      </div>

      <div className="cinema-grid">
        <div className="cinema-main">
          <section className="cinema-hero" aria-labelledby="movie-heading">
            <div className="cinema-hero-texture" aria-hidden="true" />
            <div className="cinema-hero-reel" aria-hidden="true"><div className="cinema-reel-inner"><Film size={34} strokeWidth={1.1} /></div></div>
            <div className="cinema-hero-content">
              <div className="cinema-feature-label"><span className="cinema-dot" /> NOW SHOWING <span className="cinema-label-divider" /> YOUR FAVORITE MOVIE</div>
              <div className="cinema-hero-spacer" aria-hidden="true" />
              <p className="cinema-hero-kicker"><Sparkles size={14} aria-hidden="true" /> THE ONE YOU KEEP COMING BACK TO</p>
              <h2 id="movie-heading" className="cinema-movie-title">{user.favoriteMovie}<span>.</span></h2>
              <p className="cinema-hero-description">Some stories stay with us long after the credits roll.</p>
              <MovieEditor movie={user.favoriteMovie} />
              <div className="cinema-hero-bottom"><span><Clapperboard size={15} aria-hidden="true" /> YOUR FEATURE PRESENTATION</span><span className="cinema-hero-bottom-right">MADE FOR MOVIE LOVERS <ArrowUpRight size={14} aria-hidden="true" /></span></div>
            </div>
          </section>
          <FactCard key={user.favoriteMovie} movie={user.favoriteMovie} />
        </div>

        <aside className="cinema-aside" aria-label="Your profile">
          <section className="cinema-profile">
            <div className="cinema-card-top"><span>THE MOVIE CLUB</span><span>✳</span></div>
            <div className="cinema-avatar-wrap">{photo ? <Image src={photo} alt="" width={64} height={64} unoptimized referrerPolicy="no-referrer" className="cinema-avatar" /> : <span className="cinema-avatar cinema-avatar-fallback"><UserRound size={25} aria-hidden="true" /></span>}<span className="cinema-avatar-spark" aria-hidden="true">✦</span></div>
            <p className="cinema-profile-label">YOUR PROFILE</p>
            <h2 className="cinema-profile-name">{name}</h2>
            <p className="cinema-profile-email">{user.email || "Email unavailable"}</p>
            <div className="cinema-profile-divider" />
            <div className="cinema-connected"><span className="cinema-green-dot" /> Signed in with Google</div>
          </section>
          <div className="cinema-ticket" aria-hidden="true">
            <Image src="/popcorn.png" alt="" width={150} height={150} className="cinema-popcorn" />
            <div className="cinema-ticket-upper"><Ticket size={19} strokeWidth={1.5} /><span>ADMIT ONE</span></div>
            <p>Made for<br /><em>movie people.</em></p>
            <div className="cinema-ticket-bottom"><span>GOOD STORIES LIVE ON</span><span>✦ ✦ ✦</span></div>
          </div>
        </aside>
      </div>
    </main>
  );
}
