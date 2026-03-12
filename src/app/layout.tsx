import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TempoSync",
  description: "Sync video playback speed to live music tempo",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const defaultTheme = themeCookie === "light" ? "light" : "dark";

  return (
    <html lang="en" className={defaultTheme}>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers defaultTheme={defaultTheme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
