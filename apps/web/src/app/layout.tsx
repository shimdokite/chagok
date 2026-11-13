import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "차곡 · 복지비 신청",
  description: "일상의 작은 여유를 차곡차곡",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
