import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사주거리",
  description: "AI 역술가들이 모인 사주 거리",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "사주거리" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F3D34",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen mx-auto max-w-[480px] relative">
          {children}
        </div>
      </body>
    </html>
  );
}
