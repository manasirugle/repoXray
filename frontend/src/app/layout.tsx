import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import GradientCursorEffect from "../components/GradientCursorEffect";
import { DemoWidget } from "../components/demo";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepoXray | AI Repository Intelligence Platform",
  description: "High-performance, deep code reasoning repository analyzer, static vulnerability finder, and semantic architecture Q&A assistant powered by Gemini 3.5.",
  keywords: ["AI Code Review", "Static Analysis", "Code Vulnerabilities", "Gemini AI", "FastAPI RAG", "Repository Explorer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <GradientCursorEffect />
        <DemoWidget />
        {children}
      </body>
    </html>
  );
}
