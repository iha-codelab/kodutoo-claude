import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DigiAbi – DigiStarti koolitusnõustaja",
  description: "DigiAbi on DigiStarti koolituste demo-vestlusrobot, mis aitab leida sobiva digioskuste koolituse.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body className="antialiased">{children}</body>
    </html>
  );
}
