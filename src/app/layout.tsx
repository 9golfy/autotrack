import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "AutoTrack",
  description: "Investor demo for LINE messaging synced into Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`h-full antialiased ${sarabun.variable}`} suppressHydrationWarning>
      <body className={`min-h-full flex flex-col ${sarabun.className}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
