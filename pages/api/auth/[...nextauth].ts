import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import db from "@/lib/db";
import jwt from "jsonwebtoken";

declare module "next-auth" {
  interface User {
    appToken?: string;
    appId?: string;
    appRole?: string;
    appName?: string;
  }
  interface Session {
    appToken?: string;
    appId?: string;
    appRole?: string;
    appName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appToken?: string;
    appId?: string;
    appRole?: string;
    appName?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
      ? [
          TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
            version: "2.0",
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email && account?.provider === "twitter") {
        user.email = `twitter_${account.providerAccountId}@oauth.local`;
      }
      if (!user.email) return false;

      try {
        let dbUser = await db.user.findUnique({ where: { email: user.email } });

        if (!dbUser) {
          dbUser = await db.user.create({
            data: {
              email: user.email,
              name: user.name ?? user.email.split("@")[0],
              password: "",
              role: "user",
              loginProvider: account?.provider === "google" ? "GOOGLE" : "TWITTER",
            },
          });
        }

        const appToken = jwt.sign(
          { id: dbUser.id, role: dbUser.role, name: dbUser.name },
          process.env.JWT_SECRET as string,
          { expiresIn: "1d" }
        );

        user.appToken = appToken;
        user.appId = dbUser.id;
        user.appRole = dbUser.role;
        user.appName = dbUser.name;

        return true;
      } catch (err) {
        console.error("OAuth signIn error:", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.appToken = user.appToken;
        token.appId = user.appId;
        token.appRole = user.appRole;
        token.appName = user.appName;
      }
      return token;
    },
    async session({ session, token }) {
      session.appToken = token.appToken;
      session.appId = token.appId;
      session.appRole = token.appRole;
      session.appName = token.appName;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
