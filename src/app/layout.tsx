import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// One family for the whole UI. Product surfaces don't need a display/body pair,
// and a display face in labels and data is what made this read as mismatched.
// All three legacy variables point here so no widget has to know that changed.
const sans = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LuckyOS — interactive demo",
  description:
    "A public, fully interactive demo of LuckyOS: a drag-to-arrange personal command center built with Next.js. Sample data, no live integrations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
