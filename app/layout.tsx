import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://proxync.dev"),
  title: "Proxync — Developer Tunneling Workspace Studio",
  description:
    "A local-first developer tunneling workspace studio. Cloudflare Quick Tunnels, traffic inspection, Postman-style requests, and Swagger docs in one private desktop app built with Rust.",
  keywords: [
    "proxync",
    "developer tunneling workspace studio",
    "tunneling",
    "cloudflare quick tunnel",
    "trycloudflare",
    "traffic inspector",
    "postman alternative",
    "swagger",
    "tauri",
    "rust",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://proxync.dev",
    siteName: "Proxync",
    title: "Proxync — Developer Tunneling Workspace Studio",
    description:
      "Cloudflare Quick Tunnels, traffic inspection, Postman-style requests, and Swagger docs in one private desktop app.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proxync — Developer Tunneling Workspace Studio",
    description:
      "Cloudflare Quick Tunnels, traffic inspection, Postman-style requests, and Swagger docs in one private desktop app.",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1326",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
