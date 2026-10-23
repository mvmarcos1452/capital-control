'use client';

import { CheckCircle2, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { LoanInstallment } from '../../lib/types';

interface InstallmentsTableProps {
  installments: LoanInstallment[];
  onOpenPayment: (installment: LoanInstallment) => void;
  onOpenRollover: (installment: LoanInstallment) => void;
}

export function InstallmentsTable({
  installments,
  onOpenPayment,
  onOpenRollover,
}: InstallmentsTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.04] border-b border-white/10 font-mono text-[11px] text-outline uppercase tracking-wider">
          <tr>
            <th className="py-3.5 px-4">Parcela</th>
            <th className="py-3.5 px-4">Vencimento</th>
            <th className="py-3.5 px-4 text-right">Principal</th>
            <th className="py-3.5 px-4 text-right">Juros</th>
            <th className="py-3.5 px-4 text-right">Multa/Mora</th>
            <th className="py-3.5 px-4 text-right">Total Parcela</th>
            <th className="py-3.5 px-4 text-right">Pago</th>
            <th className="py-3.5 px-4 text-right">Saldo Restante</th>
            <th className="py-3.5 px-4 text-center">Status</th>
            <th className="py-3.5 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05] font-mono text-xs">
          {installments.map((inst) => {
            const isPaid = inst.status === 'PAID';
            const isRolled = inst.status === 'ROLLED';
            const isPartial = inst.status === 'PARTIALLY_PAID';

            return (
              <tr
                key={inst.id}
                className="hover:bg-white/[0.03] transition-colors group"
              >
                <td className="py-3.5 px-4 font-semibold text-white">
                  #{inst.installment_number}
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant">
                  <span>{inst.due_date}</span>
                  {inst.due_date !== inst.original_due_date && (
                    <span className="block text-[10px] text-primary">
                      Ajustado (Feriado)
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right text-white">
                  R$ {inst.principal_due.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right text-white">
                  R$ {inst.interest_due.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right text-error font-medium">
                  {inst.remaining_penalty > 0
                    ? `R$ ${inst.remaining_penalty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '-'}
                </td>
                <td className="py-3.5 px-4 text-right font-semibold text-white">
                  R$ {inst.total_due.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right text-primary font-medium">
                  {inst.paid_amount > 0
                    ? `R$ ${inst.paid_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '-'}
                </td>
                <td className="py-3.5 px-4 text-right font-semibold text-secondary">
                  R$ {inst.remaining_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {isPaid && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-primary/10 text-primary border border-primary/20">
                      <CheckCircle2 className="w-3 h-3" /> Liquidado
                    </span>
                  )}
                  {isRolled && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-tertiary/10 text-tertiary border border-tertiary/20">
                      <RefreshCw className="w-3 h-3" /> Rolado
                    </span>
                  )}
                  {isPartial && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-secondary/10 text-secondary border border-secondary/20">
                      <Clock className="w-3 h-3" /> Parcial
                    </span>
                  )}
                  {!isPaid && !isRolled && !isPartial && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-white/5 text-on-surface-variant border border-white/10">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  {!isPaid && (
                    <div className="flex items-center justify-end gap-1.5 font-sans">
                      <button
                        onClick={() => onOpenPayment(inst)}
                        className="py-1 px-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold transition-all shadow-sm flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pagar</span>
                      </button>
                      <button
                        onClick={() => onOpenRollover(inst)}
                        title="Liquidar apenas juros e rolar principal"
                        className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white text-xs border border-white/10 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
