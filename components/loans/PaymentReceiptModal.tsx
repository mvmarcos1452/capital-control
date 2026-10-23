'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Printer,
  QrCode,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PaymentReceipt } from '../../lib/types';

interface PaymentReceiptModalProps {
  receipt: PaymentReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentReceiptModal({
  receipt,
  isOpen,
  onClose,
}: PaymentReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !receipt) return null;

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/recibo/${receipt.hash}`
    : `/recibo/${receipt.hash}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const shareText = encodeURIComponent(
    `🧾 *COMPROVANTE DE PAGAMENTO - CAPITAL CONTROL*\n` +
      `Código: ${receipt.receipt_code}\n` +
      `Cliente: ${receipt.borrower_name}\n` +
      `Valor Pago: R$ ${receipt.amount_paid.toFixed(2)}\n` +
      `Saldo Devedor Restante: R$ ${receipt.remaining_balance.toFixed(2)}\n\n` +
      `Visualizar recibo oficial completo:\n${publicUrl}`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl glass-modal rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
        {/* Barra superior de segurança luminosa do Stitch */}
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-90" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 flex flex-col gap-6" id="printable-receipt">
          {/* Cabeçalho do Recibo */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-white/10 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-lg font-bold text-white leading-tight">
                  Capital Control
                </span>
                <span className="font-mono text-xs text-outline uppercase tracking-wider">
                  Comprovante Autenticado de Pagamento
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                {receipt.receipt_code}
              </span>
              <span className="font-mono text-[11px] text-on-surface-variant mt-1">
                {new Date(receipt.issued_at).toLocaleDateString('pt-BR')} às{' '}
                {new Date(receipt.issued_at).toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Dados do Cliente e Operação */}
          <div className="grid grid-cols-2 gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10 text-sm">
            <div>
              <span className="text-xs text-on-surface-variant block">Tomador / Cliente</span>
              <span className="font-medium text-white block mt-0.5">{receipt.borrower_name}</span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant block">CPF Mascarado</span>
              <span className="font-mono text-white block mt-0.5">{receipt.borrower_cpf_masked}</span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant block">Parcela</span>
              <span className="font-mono text-white block mt-0.5">
                {receipt.installment_number} de {receipt.total_installments}
              </span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant block">Forma de Liquidação</span>
              <span className="font-medium text-secondary block mt-0.5">{receipt.payment_method}</span>
            </div>
          </div>

          {/* Destaque do Valor Pago */}
          <div className="text-center py-4 bg-primary/5 rounded-2xl border border-primary/20">
            <span className="font-mono text-xs text-outline uppercase tracking-widest block">
              Valor Liquidado
            </span>
            <span className="font-mono text-3xl sm:text-4xl font-bold text-primary block mt-1">
              R$ {receipt.amount_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="font-mono text-xs text-on-surface-variant mt-1 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Transação ACID Registrada
            </span>
          </div>

          {/* Discriminativo em Cascata: Multa -> Juros -> Principal */}
          <div className="flex flex-col gap-2.5 text-sm bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
            <span className="font-mono text-xs text-outline uppercase tracking-wider mb-1">
              Detalhamento de Dedução (Ordem Estrita)
            </span>
            <div className="flex justify-between items-center text-on-surface-variant">
              <span>1. Multa e Encargos de Mora</span>
              <span className="font-mono text-white">
                R$ {receipt.penalty_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-on-surface-variant">
              <span>2. Juros Contratuais Pagos</span>
              <span className="font-mono text-white">
                R$ {receipt.interest_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-on-surface-variant">
              <span>3. Saldo Principal Amortizado</span>
              <span className="font-mono text-white">
                R$ {receipt.principal_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between items-center font-semibold text-white">
              <span>Saldo Devedor Restante</span>
              <span className="font-mono text-secondary">
                R$ {receipt.remaining_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Ações e Compartilhamento */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10"
            >
              <Printer className="w-4 h-4 text-on-surface-variant" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10"
            >
              <Copy className="w-4 h-4 text-secondary" />
              <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)]"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
