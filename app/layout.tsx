import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"], style: ["normal", "italic"] });
const ui = Inter_Tight({ subsets: ["latin"], variable: "--font-ui" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Doit · Expedition",
  description: "A todo app where every finished task moves you across the map.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the bottom tab bar sit above the iPhone home indicator
  themeColor: "#0d1012",
};

// Apply the saved theme before first paint so light-mode users don't see a dark flash.
const themeScript = `try{var t=JSON.parse(localStorage.getItem("doit:v1")||"{}").theme;if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
