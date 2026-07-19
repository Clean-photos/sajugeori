import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "사주거리",
  description: "AI 역술가들이 모인 사주 거리",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/rss.xml" },
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "사주거리" },
  openGraph: {
    title: "사주거리",
    description: "AI 역술가들이 모인 사주 거리",
    url: SITE_URL,
    siteName: "사주거리",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "사주거리",
    description: "AI 역술가들이 모인 사주 거리",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F3D34",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/*
          AdSense는 next/script가 아니라 평범한 <script>로 넣는다.
          next/script는 전략과 무관하게 클라이언트에서 __next_s 큐 스크립트로 치환되어
          (1) <head> 안에서 하이드레이션 불일치를 일으키고
          (2) SSR HTML에 정적 <script src> 태그가 남지 않아 크롤러가 인지하지 못한다.
          심사에 필요한 건 정적 태그이므로 아래 형태를 유지할 것.
        */}
        {ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        {GA4_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');`}
            </Script>
          </>
        )}
      </head>
      <body>
        <div className="min-h-screen mx-auto max-w-[480px] relative">
          {children}
        </div>
      </body>
    </html>
  );
}
