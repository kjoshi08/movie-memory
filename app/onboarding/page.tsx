import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MovieForm } from "@/components/movie-form";

export default async function Onboarding() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { favoriteMovie: true } });
  if (!user) redirect("/");
  if (user.favoriteMovie) redirect("/dashboard");
  return (
    <main id="main" className="site-shell flex min-h-[660px] items-center justify-center py-16">
      <div className="w-full max-w-[560px]">
        <p className="eyebrow mb-5">YOUR STORY STARTS HERE &nbsp; / &nbsp; 01</p>
        <div className="panel relative overflow-hidden p-7 sm:p-10">
          <div className="absolute top-0 right-0 h-36 w-36 rounded-full bg-[#bd7057]/10 blur-3xl" />
          <div className="relative"><span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#ef9e80]/25 bg-[#ef9e80]/10 text-[#efa083]"><Ticket size={19} aria-hidden="true" /></span>
            <h1 className="serif mt-7 text-[clamp(2.5rem,6vw,3.4rem)] leading-[1.05] tracking-[-.035em]">First things first.<br /><i className="text-[#efa083]">What’s your favorite?</i></h1>
            <p className="muted mt-5 max-w-[390px] text-[14px] leading-7">Tell us the film that stayed with you. We’ll find a little something interesting about it.</p>
            <MovieForm />
          </div>
        </div>
      </div>
    </main>
  );
}
