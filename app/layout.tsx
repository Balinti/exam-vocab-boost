import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VocabBoost - TOEFL/IELTS Context + Usage Trainer',
  description: 'Master test-safe vocabulary usage with adaptive drills. Improve collocations, prepositions, register, and grammar frames for TOEFL and IELTS.',
  keywords: ['TOEFL', 'IELTS', 'vocabulary', 'collocations', 'English test prep', 'academic English'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
