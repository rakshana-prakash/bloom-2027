import './globals.css';
import SoundProvider from '../components/SoundProvider';
import { Fraunces, DM_Sans } from 'next/font/google';

const display = Fraunces({ subsets: ['latin'], variable: '--display', style: ['normal', 'italic'] });
const body = DM_Sans({ subsets: ['latin'], variable: '--body' });

export const metadata = {
  title: 'Bloom 2027',
  description: 'Plan your days. Nurture your mind. Collect your memories.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}><SoundProvider>{children}</SoundProvider></body>
    </html>
  );
}
