import NextAuth, { type User as AuthUser } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as AuthUser).role;
        token.name = user.name;
        token.branchId = (user as AuthUser).branchId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as AuthUser["role"];
        session.user.name = token.name;
        session.user.branchId = token.branchId as string | null | undefined;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "VPN num or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { identifier, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: {
            isActive: true,
            OR: [
              { vpnNum: identifier },
              { username: identifier.toLowerCase() },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            password: true,
            branchId: true,
          },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
        };
      },
    }),
  ],
});
