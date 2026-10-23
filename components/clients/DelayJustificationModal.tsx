'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, ShieldAlert, X } from 'lucide-react';
import { recordDelayJustification } from '../../lib/supabase';
import { Borrower } from '../../lib/types';

interface DelayJustificationModalProps {
  borrower: Borrower | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DelayJustificationModal({
  borrower,
  isOpen,
  onClose,
  onSuccess,
}: DelayJustificationModalProps) {
  const [reason, setReason] = useState('');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [waivePenalty, setWaivePenalty] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !borrower) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Por favor, informe a justificativa detalhada do atraso.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await recordDelayJustification(
        borrower.id,
        'inst-audit-gen',
        reason.trim(),
        waivePenalty,
        operatorNotes.trim(),
        '00000000-0000-0000-0000-000000000001'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar justificativa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-modal rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-secondary to-transparent opacity-90" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Auditoria de Reputação & Compliance
            </span>
            <h2 className="font-heading text-xl font-bold text-white">
              Justificar Atraso do Cliente
            </h2>
            <p className="text-xs text-on-surface-variant">
              Cliente: <span className="text-white font-medium">{borrower.name}</span> (CPF: {borrower.cpf})
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Motivo / Justificativa Apresentada pelo Tomador
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: Falha no processamento de pagamento bancário TED/PIX pelo banco de origem, comprovada por extrato."
                className="w-full bg-white/[0.04] border border-white/15 focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl p-3 text-sm text-white placeholder:text-on-surface-variant/40 outline-none resize-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Parecer Técnico do Operador (Opcional)
              </label>
              <textarea
                rows={2}
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="Ex.: Documento bancário verificado e validado pela mesa de crédito."
                className="w-full bg-white/[0.04] border border-white/15 focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl p-3 text-sm text-white placeholder:text-on-surface-variant/40 outline-none resize-none transition-all"
              />
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
              <input
                type="checkbox"
                id="waive"
                checked={waivePenalty}
                onChange={(e) => setWaivePenalty(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/30 text-primary focus:ring-primary bg-surface-container"
              />
              <label htmlFor="waive" className="text-xs text-on-surface-variant cursor-pointer">
                <span className="font-semibold text-white block">
                  Abonar penalidade no Score de Bom Pagador
                </span>
                Ao marcar esta opção, o atraso é considerado justificado e o tomador recupera a elegibilidade ao status de Bom Pagador.
              </label>
            </div>
          </div>

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
              className="flex-1 py-3 px-4 rounded-xl bg-secondary-container hover:bg-secondary text-on-secondary font-semibold text-sm transition-all shadow-[0_0_20px_rgba(3,181,211,0.35)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Salvando Justificativa...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gravar Justificativa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
