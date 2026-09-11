import NextAuth, { DefaultSession } from "next-auth";

type VfRole = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "AREA_MANAGER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: VfRole;
      branchId?: string | null;
      areaId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: VfRole;
    branchId?: string | null;
    areaId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: VfRole;
    branchId?: string | null;
    areaId?: string | null;
  }
}
