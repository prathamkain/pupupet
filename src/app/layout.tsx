import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pupu — Community Care League",
  description: "Help your campus care for one shared on-chain companion.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
