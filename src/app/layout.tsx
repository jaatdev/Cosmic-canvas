import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Caveat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Cosmic Canvas | Digital Handwriting Studio",
  description: "A limitless digital canvas optimized for Veikk Pen Tablets. Pressure-sensitive drawing, perfect-freehand strokes, and immersive fullscreen mode.",
  keywords: ["drawing", "handwriting", "canvas", "pen tablet", "veikk", "digital art"],
  authors: [{ name: "Cosmic Canvas" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${playfair.variable} ${caveat.variable} ${jetbrains.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
