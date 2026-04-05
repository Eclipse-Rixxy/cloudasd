import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'CloudSINT — Open Source Intelligence Platform',
  description: 'Professional OSINT platform. Email, phone, username, IP, domain, Discord reconnaissance. Made by S.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
