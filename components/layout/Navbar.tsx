'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Landmark, ShieldCheck, User } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/emprestimos', label: 'Gestão de Empréstimos' },
    { href: '/clientes', label: 'Clientes & Reputação' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/75 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-white/10 flex items-center justify-center text-primary shadow-[0_0_16px_rgba(16,185,129,0.3)] transition-transform group-hover:scale-105">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold tracking-tight text-white leading-none">
              Capital Control
            </span>
            <span className="font-mono text-[10px] text-outline uppercase tracking-widest mt-1">
              Sovereign ERP v4.8
            </span>
          </div>
        </Link>

        {/* Center Pill Navigation */}
        <nav className="hidden md:flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                    : 'text-on-surface-variant hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Info: Security Badge & Operator */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-on-surface-variant font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Ambiente Seguro SSL</span>
          </div>

          <div className="flex items-center gap-3 pl-3 border-l border-white/10">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-white leading-tight">
                Operador Chefe
              </span>
              <span className="font-mono text-[11px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Online
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-surface-container-high border border-white/15 flex items-center justify-center text-primary shadow-sm">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
