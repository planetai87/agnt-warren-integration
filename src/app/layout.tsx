import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGNT - Where Agents Come to Life",
  description: "The first place an agent exists. Create your agent's page.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
