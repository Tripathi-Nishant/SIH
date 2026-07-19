import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "SIH Team Finder | KIET Group of Institutions",
  description: "Official student matchmaking platform for forming balanced, skill-verified teams for Smart India Hackathon (SIH) at KIET.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#060a17] text-gray-100">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
