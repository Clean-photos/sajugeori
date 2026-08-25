import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

class InvalidCredentials extends CredentialsSignin {
  code = "invalid_credentials";
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
    /**
     * 소셜 로그인(카카오·구글) 사용자를 users 테이블에 만들어 주고, 세션의
     * user.id를 "우리 DB의 UUID"로 고정한다.
     *
     * 어댑터 없이 JWT 전략만 쓰고 있어서, 이 처리가 없으면 token.sub이 공급자가
     * 준 식별자(카카오 회원번호 등)로 남는다. 그 값으로는 users 행을 찾을 수 없고
     * UUID 컬럼에 넣을 수도 없어서 사주 등록·결제·리포트가 전부 실패한다
     * (실측: 소셜 가입 유저 0명, 전원 이메일 가입).
     */
    async jwt({ token, user, account }) {
      if (account && account.provider !== "credentials") {
        const provider = account.provider;
        const sub = account.providerAccountId;
        try {
          // 이미 있으면 그 행을, 없으면 새로 만들어 우리 UUID를 받는다.
          // users에 UNIQUE (oauth_provider, oauth_sub)가 걸려 있어 중복 생성되지 않는다.
          const { data: existing } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("oauth_provider", provider)
            .eq("oauth_sub", sub)
            .maybeSingle();

          if (existing?.id) {
            token.uid = existing.id;
          } else {
            const { data: created, error } = await supabaseAdmin
              .from("users")
              .insert({
                oauth_provider: provider,
                oauth_sub: sub,
                email: user?.email ?? null,
                display_name: user?.name ?? null,
              })
              .select("id")
              .single();
            if (error) console.error("oauth user create error:", error);
            if (created?.id) token.uid = created.id;
          }
        } catch (e) {
          console.error("oauth user upsert error:", e);
        }
      } else if (user?.id) {
        // Credentials 로그인은 authorize가 이미 우리 UUID를 반환한다.
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      const uid = typeof token.uid === "string" ? token.uid : null;
      if (uid) session.user.id = uid;
      else if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
