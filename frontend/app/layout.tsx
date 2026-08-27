import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mind-Anchor | 치매 예방 특화 고령자 인지 건강 돌봄 솔루션",
  description: "고령자 치매 예방 및 인지 건강 케어 - Vapi AI 기반 실시간 안부 대화 & 신경인지 반응 지연 모니터링 솔루션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-background text-slate-100 selection:bg-indigo-500 selection:text-white">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
