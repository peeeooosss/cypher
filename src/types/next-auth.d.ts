import type { UserRole } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    avatarUrl?: string | null;
    phone?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      avatarUrl?: string | null;
      phone?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    avatarUrl?: string | null;
    phone?: string | null;
  }
}