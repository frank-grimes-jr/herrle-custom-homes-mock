import type { Metadata } from "next";
import { Gilda_Display, PT_Serif } from "next/font/google";
import "./globals.css";

// Herrle's brand fonts (from herrlecustomhomes.com).
const display = Gilda_Display({
  variable: "--font-gilda",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const body = PT_Serif({
  variable: "--font-pt",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Herrle Custom Homes — Company Health",
  description: "A single pane of glass on the health of the company. Built with intention.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
