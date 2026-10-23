'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, DollarSign, RefreshCw, X } from 'lucide-react';
import { executeLoanPayment } from '../../lib/supabase';
import { LoanInstallment, PaymentReceipt } from '../../lib/types';

interface PaymentModalProps {
  installment: LoanInstallment | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (receipt: PaymentReceipt) => void;
}

export function PaymentModal({
  installment,
  isOpen,
  onClose,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [tab, setTab] = useState<'PARTIAL' | 'ROLLOVER' | 'EARLY_PAYOFF'>('PARTIAL');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !installment) return null;

  const totalDue = installment.remaining_balance;
  const rolloverAmount = installment.remaining_penalty + installment.remaining_interest;

  // Pré-visualização da cascata de alocação em tempo real
  const inputVal = parseFloat(amount.replace(',', '.')) || 0;
  const previewPenalty = Math.min(inputVal, installment.remaining_penalty);
  const afterPenalty = Math.max(0, inputVal - previewPenalty);
  const previewInterest = Math.min(afterPenalty, installment.remaining_interest);
  const afterInterest = Math.max(0, afterPenalty - previewInterest);
  const previewPrincipal = Math.min(afterInterest, installment.remaining_principal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payAmount = tab === 'ROLLOVER' ? rolloverAmount : parseFloat(amount.replace(',', '.'));

      if (isNaN(payAmount) || payAmount <= 0) {
        throw new Error('Informe um valor de pagamento válido.');
      }

      const res = await executeLoanPayment({
        installmentId: installment.id,
        amountPaid: payAmount,
        paymentType: tab,
        paymentMethod,
      });

      if (!res.success || !res.receipt) {
        throw new Error(res.message || 'Erro ao processar pagamento.');
      }

      onClose();
      onPaymentSuccess(res.receipt);
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro no processamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-modal rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-90" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-outline uppercase tracking-wider">
              Baixa de Parcela #{installment.installment_number}
            </span>
            <h2 className="font-heading text-xl font-bold text-white">
              Liquidação Financeira
            </h2>
            <p className="text-xs text-on-surface-variant">
              Vencimento original: {installment.due_date} | Saldo em aberto: R$ {installment.remaining_balance.toFixed(2)}
            </p>
          </div>

          {/* Abas de Modalidade de Pagamento */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container-lowest/80 rounded-xl border border-white/10 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setTab('PARTIAL');
                setAmount(installment.remaining_balance.toFixed(2));
              }}
              className={`py-2 px-3 rounded-lg transition-all text-center ${
                tab === 'PARTIAL'
                  ? 'bg-surface-container-high text-white shadow-sm border border-white/10'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Amortização / Total
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('ROLLOVER');
                setAmount(rolloverAmount.toFixed(2));
              }}
              className={`py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                tab === 'ROLLOVER'
                  ? 'bg-surface-container-high text-secondary shadow-sm border border-secondary/20'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rolagem (Só Juros)</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Campos de Entrada */}
          <div className="flex flex-col gap-4">
            {tab === 'ROLLOVER' ? (
              <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 text-xs text-secondary flex flex-col gap-1">
                <span className="font-semibold text-sm">Rolagem de Dívida Selecionada</span>
                <span>O valor de R$ {rolloverAmount.toFixed(2)} liquidará exclusivamente os juros e encargos. O saldo principal de R$ {installment.remaining_principal.toFixed(2)} permanecerá intacto e avançará para o próximo ciclo.</span>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-on-surface-variant font-medium mb-1.5">
                  Valor a Pagar (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-outline font-mono">
                    R$
                  </span>
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/[0.04] border border-white/15 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 pl-10 pr-4 text-white font-mono text-base placeholder:text-on-surface-variant/40 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setAmount(installment.remaining_balance.toFixed(2))}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-primary border border-white/10"
                  >
                    Valor Total (R$ {installment.remaining_balance.toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount((installment.remaining_balance / 2).toFixed(2))}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-on-surface-variant border border-white/10"
                  >
                    50% (R$ {(installment.remaining_balance / 2).toFixed(2)})
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-on-surface-variant font-medium mb-1.5">
                Meio de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-surface-container border border-white/15 focus:border-primary rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
              >
                <option value="PIX">PIX Instantâneo</option>
                <option value="DINHEIRO">Dinheiro em Espécie (Caixa)</option>
                <option value="TRANSFERENCIA">Transferência Bancária (TED/DOC)</option>
                <option value="CARTAO">Cartão / Débito</option>
              </select>
            </div>
          </div>

          {/* Visualização da Dedução em Cascata */}
          {tab === 'PARTIAL' && inputVal > 0 && (
            <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl flex flex-col gap-2 text-xs">
              <span className="font-mono text-[11px] text-outline uppercase tracking-wider mb-1">
                Prévia da Alocação (Ordem Obrigatória)
              </span>
              <div className="flex justify-between text-on-surface-variant">
                <span>1. Abatimento de Multa/Mora:</span>
                <span className="font-mono text-white">R$ {previewPenalty.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>2. Abatimento de Juros:</span>
                <span className="font-mono text-white">R$ {previewInterest.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>3. Amortização de Principal:</span>
                <span className="font-mono text-white">R$ {previewPrincipal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Gravando Transação...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Baixa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
