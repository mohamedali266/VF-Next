import NextAuth, { DefaultSession } from "next-auth";

type VfRole = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: VfRole;
      branchId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: VfRole;
    branchId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: VfRole;
    branchId?: string | null;
  }
}
