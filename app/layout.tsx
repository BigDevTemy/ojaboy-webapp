import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { PwaInstallManager } from "@/components/PwaInstallManager";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OjaboY | AI Market Price Intelligence",
  description:
    "Ask OjaboY about Nigerian market prices, compare markets, and shop smarter.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ojaboy",
  },
};

export const viewport: Viewport = {
  themeColor: "#f10606",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaInstallManager />
      </body>
    </html>
  );
}
