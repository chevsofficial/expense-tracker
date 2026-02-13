import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/theme/ThemeProvider";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spendary",
  description: "Spendary — simple personal finance tracking",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={lato.variable} suppressHydrationWarning>
      <body className="font-brand antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
