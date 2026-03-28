import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Deposit Guard — Platform (Pre-Alpha v0.0.8)",
  description: "Document your rental property condition and protect your deposit",
  icons: {
    icon: "/dg-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} antialiased min-h-screen bg-[#F8F8F8]`}
        suppressHydrationWarning={true}
      >
        <div className="min-h-screen w-full lg:max-w-[1080px] lg:mx-auto bg-[#F8F8F8]">
          {children}
        </div>
      </body>
    </html>
  );
}
