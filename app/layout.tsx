import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Capital Control - Gestão de Empréstimos & Fluxo de Caixa',
  description: 'Controle algorítmico de amortizações, tesouraria e reputação financeira.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-surface font-body text-on-surface antialiased relative selection:bg-primary selection:text-on-primary">
        {/* Orbes atmosféricos luminosos característicos do Design Stitch */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-primary/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/3 -left-40 w-[420px] h-[420px] bg-secondary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-1/4 w-[480px] h-[280px] bg-primary-container/10 rounded-full blur-[130px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
