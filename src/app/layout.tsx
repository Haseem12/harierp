
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from './layout/AppLayout';

const inter = Inter({
  variable: '--font-geist-sans', // Keep variable name for CSS compatibility
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Axis ERP',
  description: 'Management software for Hari Industries Limited',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body 
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
