import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [Google],
  pages: { signIn: "/" },
  trustHost: true,
  callbacks: {
    session({ session, user }) {
      // The identifier comes from the server-side database session, never the browser.
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
