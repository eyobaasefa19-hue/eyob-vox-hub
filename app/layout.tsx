
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amharic Voice Corpus Hub",
  description:
    "የአማርኛ ድምፅ ማሰባሰቢያና ማረጋገጫ መድረክ።",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="am">
      <body className="amharic-text">
        {children}
      </body>
    </html>
  );
}
