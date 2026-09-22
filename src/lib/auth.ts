import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

const credentialsSchema = z.object({
  identifier: z.string().trim().min(10),
  password: z.string().min(8),
  profileId: z.string().optional(),
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

        const { identifier, password, profileId } = parsed.data;

        const phone = normalizePhone(identifier);
        let candidates = phone
          ? await prisma.user.findMany({
              where: { phone },
              select: { id: true, email: true, phone: true, name: true, role: true, avatarUrl: true, passwordHash: true },
            })
          : [];

        // Legacy fallback: pre-phone accounts that still sign in with email.
        if (candidates.length === 0 && identifier.includes("@")) {
          const emailUser = await prisma.user.findUnique({
            where: { email: identifier.toLowerCase() },
            select: { id: true, email: true, phone: true, name: true, role: true, avatarUrl: true, passwordHash: true },
          });
          if (emailUser) candidates = [emailUser];
        }

        if (candidates.length === 0) {
          return null;
        }

        let matched: typeof candidates;
        if (profileId) {
          const target = candidates.find((candidate) => candidate.id === profileId);
          if (!target?.passwordHash) {
            return null;
          }
          matched = (await compare(password, target.passwordHash)) ? [target] : [];
        } else {
          const selected: typeof candidates = [];
          for (const candidate of candidates) {
            if (candidate.passwordHash && (await compare(password, candidate.passwordHash))) {
              selected.push(candidate);
            }
          }
          matched = selected;
        }

        if (matched.length !== 1) {
          return null;
        }

        const user = matched[0];

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