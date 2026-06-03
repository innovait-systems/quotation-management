import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import TenantThemeInjector from "../components/TenantThemeInjector";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Innovait Q2I | SaaS Operations Platform",
  description: "Enterprise operations metadata engine for managing quotations, POs, invoices, and automated workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <TenantThemeInjector />
        {children}
      </body>
    </html>
  );
}
