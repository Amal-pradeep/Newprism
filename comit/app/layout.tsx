import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMIT — Prism of Stories",
  description: "The AI Business Operating System by Prism of Stories."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}