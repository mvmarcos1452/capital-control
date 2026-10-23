'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSignature,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { Borrower } from '../../lib/types';
import { DelayJustificationModal } from './DelayJustificationModal';

interface ClientsManagerProps {
  initialBorrowers: Borrower[];
}

export function ClientsManager({ initialBorrowers }: ClientsManagerProps) {
  const [borrowers, setBorrowers] = useState<Borrower[]>(initialBorrowers);
  const [search, setSearch] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [isJustificationOpen, setIsJustificationOpen] = useState(false);

  const filtered = borrowers.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.cpf.includes(search) ||
      b.phone.includes(search)
  );

  const handleOpenJustification = (b: Borrower) => {
    setSelectedBorrower(b);
    setIsJustificationOpen(true);
  };

  const handleJustificationSuccess = () => {
    // Atualiza status localmente
    setBorrowers((prev) =>
      prev.map((b) => {
        if (b.id === selectedBorrower?.id) {
          return {
            ...b,
            reputation_score: Math.min(100, b.reputation_score + 15),
            reputation_status: 'GOOD_PAYER',
          };
        }
        return b;
      })
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full bg-white/[0.04] border border-white/10 focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-on-surface-variant/40 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-on-surface-variant px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10">
            <span>Tolerância de Vencimento:</span>
            <span className="text-primary font-semibold">0 Dias (Estrito)</span>
          </div>
        </div>
      </div>

      {/* Grid de Cartões de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((b) => {
          const isGood = b.reputation_status === 'GOOD_PAYER';
          const isAttention = b.reputation_status === 'ATTENTION';

          return (
            <div
              key={b.id}
              className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between border border-white/10 transition-all duration-300"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-col">
                    <h3 className="font-heading text-lg font-bold text-white leading-tight">
                      {b.name}
                    </h3>
                    <span className="font-mono text-xs text-outline mt-0.5">
                      CPF: {b.cpf}
                    </span>
                  </div>

                  {isGood && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <UserCheck className="w-3.5 h-3.5" /> Bom Pagador
                    </span>
                  )}
                  {isAttention && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" /> Atenção
                    </span>
                  )}
                  {!isGood && !isAttention && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20 shrink-0">
                      <ShieldAlert className="w-3.5 h-3.5" /> Inadimplente
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2 my-4 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-outline" />
                    <span>+{b.phone}</span>
                  </div>
                  {b.address && (
                    <p className="line-clamp-1 text-[11px] text-outline">
                      {b.address}
                    </p>
                  )}
                  {b.notes && (
                    <p className="line-clamp-2 text-[11px] italic text-on-surface-variant/80 bg-white/[0.02] p-2 rounded-lg border border-white/5 mt-1">
                      &quot;{b.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Score Bar */}
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <div className="flex justify-between items-center font-mono text-xs mb-1.5">
                    <span className="text-outline">Score de Pagador</span>
                    <span
                      className={`font-semibold ${
                        isGood
                          ? 'text-primary'
                          : isAttention
                          ? 'text-secondary'
                          : 'text-error'
                      }`}
                    >
                      {b.reputation_score} / 100 pts
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isGood
                          ? 'bg-primary'
                          : isAttention
                          ? 'bg-secondary'
                          : 'bg-error'
                      }`}
                      style={{ width: `${b.reputation_score}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Ação: Justificar Atraso do Cliente */}
              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-end">
                <button
                  onClick={() => handleOpenJustification(b)}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white hover:text-secondary text-xs font-semibold border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <FileSignature className="w-3.5 h-3.5 text-secondary" />
                  <span>Justificar Atraso / Abonar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <DelayJustificationModal
        borrower={selectedBorrower}
        isOpen={isJustificationOpen}
        onClose={() => setIsJustificationOpen(false)}
        onSuccess={handleJustificationSuccess}
      />
    </div>
  );
}
