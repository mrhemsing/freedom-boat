import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Freedom Boat – Port Moody',
  description: 'Hyper-local boating conditions for Port Moody + North Saanich.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>{children}</body>
    </html>
  );
}
