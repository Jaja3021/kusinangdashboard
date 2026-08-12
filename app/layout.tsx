import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Kusinang Pamana — Business Dashboard",
  description: "Kitchen board, bookings, inventory and reporting for Kusinang Pamana.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable}>
      {/* The dashboard layout owns the shell; this stays a bare page frame. */}
      <body className="bg-gray-50 font-sans">{children}</body>
    </html>
  );
}
