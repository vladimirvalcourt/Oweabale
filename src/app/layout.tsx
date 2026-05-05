import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

function getMetadataBase() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://www.oweable.com");
  } catch {
    return new URL("https://www.oweable.com");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Oweable — Take control of your financial obligations",
  description: "Put bills, debt, subscriptions, tolls, and tickets into one ordered list so the next payment is not a guess.",
  openGraph: {
    images: ['/og-image.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-(--color-surface) text-(--color-content)">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
