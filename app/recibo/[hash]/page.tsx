import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Landmark, Printer, ShieldCheck } from 'lucide-react';
import { getReceiptByHash } from '../../../lib/supabase';

interface PageProps {
  params: Promise<{ hash: string }>;
}

export default async function PublicReceiptPage({ params }: PageProps) {
  const { hash } = await params;
  const receipt = await getReceiptByHash(hash);

  if (!receipt) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface flex flex-col justify-between p-4 sm:p-6 md:p-12 relative overflow-hidden">
      {/* Dynamic Atmospheric Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-primary/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[380px] h-[380px] bg-primary-container/10 blur-[110px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-[620px] mx-auto w-full mb-6 flex items-center justify-between text-on-surface-variant">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-white/10 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <Landmark className="w-4 h-4 text-primary" />
          </div>
          <span className="font-heading font-bold text-white text-base">Capital Control</span>
        </Link>
        <div className="flex items-center gap-1.5 font-mono text-xs text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          <ShieldCheck className="w-4 h-4" />
          <span>Certificado Digital TLS 1.3</span>
        </div>
      </header>

      {/* Main Certificate Card (Fiel a Image 13.html do Stitch) */}
      <section className="max-w-[620px] mx-auto w-full relative z-10">
        <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/15 shadow-[0_24px_70px_rgba(0,0,0,0.7),0_0_40px_rgba(16,185,129,0.08)] overflow-hidden">
          {/* Top Decorative Perimeter Edge (Security Strip) */}
          <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-90" />

          <div className="p-6 sm:p-10 flex flex-col gap-6">
            {/* Header: Entity & Security Seal */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-white/10 flex items-center justify-center text-primary shadow-[0_0_16px_rgba(16,185,129,0.25)]">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-heading text-lg font-bold text-white leading-tight">
                      Comprovante Oficial de Liquidação
                    </span>
                    <span className="font-mono text-xs text-outline uppercase tracking-widest mt-0.5">
                      Registro Imutável em Tesouraria
                    </span>
                  </div>
                </div>

                <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  {receipt.receipt_code}
                </span>
              </div>
            </div>

            {/* Valor Liquidado */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-outline block">
                Valor Total Liquidado
              </span>
              <span className="font-mono text-4xl sm:text-5xl font-bold text-primary block mt-2">
                R$ {receipt.amount_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div className="inline-flex items-center gap-1.5 mt-2 font-mono text-xs text-primary bg-primary/10 px-3 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Transação Auditada e Reconhecida</span>
              </div>
            </div>

            {/* Informações da Operação */}
            <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/10 p-5 rounded-2xl text-sm">
              <div>
                <span className="text-xs text-on-surface-variant block">Tomador / Favorecido</span>
                <span className="font-medium text-white block mt-1">{receipt.borrower_name}</span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant block">CPF Mascarado</span>
                <span className="font-mono text-white block mt-1">{receipt.borrower_cpf_masked}</span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant block">Parcela</span>
                <span className="font-mono text-white block mt-1">
                  #{receipt.installment_number} de {receipt.total_installments}
                </span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant block">Meio de Pagamento</span>
                <span className="font-medium text-secondary block mt-1">{receipt.payment_method}</span>
              </div>
            </div>

            {/* Cascata Discriminada */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl flex flex-col gap-2.5 text-sm">
              <span className="font-mono text-xs text-outline uppercase tracking-wider mb-1">
                Detalhamento da Dedução Financeira
              </span>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>1. Encargos e Multa de Mora</span>
                <span className="font-mono text-white">
                  R$ {receipt.penalty_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>2. Juros Contratuais da Parcela</span>
                <span className="font-mono text-white">
                  R$ {receipt.interest_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>3. Capital Principal Amortizado</span>
                <span className="font-mono text-white">
                  R$ {receipt.principal_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-center font-semibold text-white">
                <span>Saldo Devedor Restante da Operação</span>
                <span className="font-mono text-secondary">
                  R$ {receipt.remaining_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Footer do Recibo */}
            <div className="pt-2 flex items-center justify-between font-mono text-xs text-outline border-t border-white/10">
              <span>Autenticação: {receipt.hash.slice(0, 16)}...</span>
              <span>{new Date(receipt.issued_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé institucional */}
      <footer className="max-w-[620px] mx-auto w-full mt-6 text-center font-mono text-xs text-on-surface-variant">
        Documento gerado pelo sistema Capital Control Sovereign ERP. Acesso público de auditoria sem autenticação.
      </footer>
    </main>
  );
}
