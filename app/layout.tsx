import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dispelix Demo",
  description: "2560x720 dual-screen demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
