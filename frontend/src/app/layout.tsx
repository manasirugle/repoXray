import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
