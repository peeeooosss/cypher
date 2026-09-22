import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

const credentialsSchema = z.object({
  identifier: z.string().trim().min(10),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Phone number and password",
      credentials: {
        identifier: { label: "Phone number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { identifier, password } = parsed.data;

        const phone = normalizePhone(identifier);
        let user = phone
          ? await prisma.user.findUnique({ where: { phone } })
          : null;

        // Legacy fallback: pre-phone accounts that still sign in with email.
        if (!user && identifier.includes("@")) {
          user = await prisma.user.findUnique({
            where: { email: identifier.toLowerCase() },
          });
        }

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl;
        token.phone = user.phone;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id;
        }

        if (token.role) {
          session.user.role = token.role;
        }

        if (token.avatarUrl) {
          session.user.avatarUrl = token.avatarUrl;
        }

        if (token.phone) {
          session.user.phone = token.phone;
        }
      }

      return session;
    },
  },
};