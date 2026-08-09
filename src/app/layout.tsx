import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { StoreHydration } from "@/components/StoreHydration";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TeachDesk — Teacher's Digital Office",
  description: "Manage curriculum, lessons, grades, students, and AI teaching tools in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-ink">
        <StoreHydration />
        {children}
      </body>
    </html>
  );
}
