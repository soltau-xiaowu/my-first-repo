import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Little Spark · 灵感，从一次对话开始",
  description: "带上你的好奇心，与 AI 一起把想法往前推进。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
