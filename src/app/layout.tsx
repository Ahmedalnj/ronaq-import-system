import type { Metadata } from "next";
import { AppToaster } from "@/components/providers/app-toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "رونق - نظام إدارة الاستيراد والمحاسبة",
  description: "نظام متكامل لإدارة رحلات استيراد السيارات والمحاسبة",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>✨</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
