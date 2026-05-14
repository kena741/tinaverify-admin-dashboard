import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../../components/providers";
import { ReduxProvider } from "../store/ReduxProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zuludine - Frictionless Payments & Digital Menus for Restaurants",
  description: "Customers tap NFC or scan QR, pay instantly via Telebirr, and your staff gets notified in real-time. No app required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <ReduxProvider>
          <Providers>{children}</Providers>
        </ReduxProvider>
      </body>
    </html>
  );
}
