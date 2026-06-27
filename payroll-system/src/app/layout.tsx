import type { Metadata } from "next";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة الرواتب",
  description: "نظام متكامل لحساب مرتبات الموظفين",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
