import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono, Work_Sans } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-archivo' });
const workSans = Work_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-worksans' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Voluntarios del bar · Amistades Belgas de Levante',
  description: 'Quién atiende el bar del club los jueves.',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Voluntarios', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#8c1c1c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${archivo.variable} ${workSans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
