import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Focus Reader",
  description: "A self-hosted read-it-later app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
