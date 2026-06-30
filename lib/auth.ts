import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Credentials from "next-auth/providers/credentials";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/db/client";

class InvalidCredentials extends CredentialsSignin {
  code = "invalid_credentials";
}

function hashPassword(password: string): string {
  const salt = process.env.AUTH_SECRET!.slice(0, 16);
  return createHash("sha256").update(salt + password).digest("hex");
}

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID!,
      clientSecret: process.env.AUTH_KAKAO_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id, email, display_name, password_hash")
          .eq("email", credentials.email)
          .eq("oauth_provider", "email")
          .single();

        if (!user) throw new InvalidCredentials();

        const hash = hashPassword(credentials.password as string);
        if (hash !== user.password_hash) throw new InvalidCredentials();

        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
