import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  title: "사주거리",
  description: "AI 역술가들이 모인 사주 거리",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "사주거리" },
  openGraph: {
    title: "사주거리",
    description: "AI 역술가들이 모인 사주 거리",
    url: "https://sajugeori.com",
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
        {ADSENSE_CLIENT && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
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
