'use client';

import { useEffect, useState } from 'react';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileCheck,
  PlusCircle,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { InstallmentsTable } from '../../components/loans/InstallmentsTable';
import { LoanSimulatorForm } from '../../components/loans/LoanSimulatorForm';
import { PaymentModal } from '../../components/loans/PaymentModal';
import { PaymentReceiptModal } from '../../components/loans/PaymentReceiptModal';
import { calculateEarlyPayoffWithoutDiscount } from '../../lib/finance';
import { getBorrowers, getLoans } from '../../lib/supabase';
import { Borrower, Loan, LoanInstallment, PaymentReceipt } from '../../lib/types';

export default function EmprestimosPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [selectedInstallment, setSelectedInstallment] = useState<LoanInstallment | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<PaymentReceipt | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  useEffect(() => {
    async function loadData() {
      const bList = await getBorrowers();
      const lList = await getLoans();
      setBorrowers(bList);
      setLoans(lList);
      if (lList.length > 0) {
        setSelectedLoanId(lList[0].id);
      }
    }
    loadData();
  }, []);

  const selectedLoan = loans.find((l) => l.id === selectedLoanId) || loans[0];

  const handleOpenPayment = (inst: LoanInstallment) => {
    setSelectedInstallment(inst);
    setIsPaymentOpen(true);
  };

  const handleOpenRollover = (inst: LoanInstallment) => {
    setSelectedInstallment(inst);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (receipt: PaymentReceipt) => {
    setCurrentReceipt(receipt);
    setIsReceiptOpen(true);

    // Atualiza parcelas na tela
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id === selectedLoan?.id) {
          const updatedInsts = l.installments?.map((inst) => {
            if (inst.id === receipt.installment_id) {
              return {
                ...inst,
                paid_amount: inst.paid_amount + receipt.amount_paid,
                remaining_balance: receipt.remaining_balance,
                status: receipt.remaining_balance <= 0 ? ('PAID' as const) : ('PARTIALLY_PAID' as const),
              };
            }
            return inst;
          });
          return {
            ...l,
            installments: updatedInsts,
            total_paid: l.total_paid + receipt.amount_paid,
            remaining_balance: Math.max(0, l.remaining_balance - (receipt.interest_paid + receipt.principal_paid)),
          };
        }
        return l;
      })
    );
  };

  // Cálculo de Quitação Antecipada SEM Desconto
  const earlyPayoff = selectedLoan?.installments
    ? calculateEarlyPayoffWithoutDiscount(selectedLoan.installments)
    : null;

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full pt-28 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-mono text-xs text-outline uppercase tracking-wider">
              <span>Módulo de Empréstimos</span>
              <span className="text-primary">/</span>
              <span>Cronogramas & Liquidação</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Gestão de Contratos de Empréstimo
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              Controle de parcelas, regras de amortização estrita (Multa $\rightarrow$ Juros $\rightarrow$ Principal) e emissão de comprovativos oficiais.
            </p>
          </div>

          <button
            onClick={() => setShowSimulator((prev) => !prev)}
            className="py-2.5 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-2 self-start md:self-end"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showSimulator ? 'Ocultar Simulador' : 'Novo Contrato / Simulador'}</span>
          </button>
        </div>

        {/* Simulador Expansível */}
        {showSimulator && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <LoanSimulatorForm
              borrowers={borrowers}
              onContractCreated={() => setShowSimulator(false)}
            />
          </div>
        )}

        {/* Detalhes do Contrato Selecionado */}
        {selectedLoan && (
          <div className="flex flex-col gap-6">
            {/* Seletor de Contrato Ativo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-white/10 flex items-center justify-center text-primary">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant block">Contrato Selecionado</span>
                  <span className="font-heading text-lg font-bold text-white">
                    {selectedLoan.borrower?.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="bg-surface-container border border-white/15 focus:border-primary rounded-xl py-2 px-3 text-sm text-white outline-none"
                >
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.borrower?.name} - R$ {l.principal_amount.toFixed(2)} ({l.calculation_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Painel de Métricas do Contrato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <span className="font-mono text-xs text-outline uppercase block">Principal Contratado</span>
                <span className="font-mono text-2xl font-bold text-white block mt-1">
                  R$ {selectedLoan.principal_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-on-surface-variant mt-1 block">
                  Taxa: {selectedLoan.interest_rate}% a.m. ({selectedLoan.calculation_type})
                </span>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <span className="font-mono text-xs text-outline uppercase block">Total a Receber</span>
                <span className="font-mono text-2xl font-bold text-primary block mt-1">
                  R$ {selectedLoan.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-on-surface-variant mt-1 block">
                  Juros Totais: R$ {selectedLoan.total_interest.toFixed(2)}
                </span>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <span className="font-mono text-xs text-outline uppercase block">Total Já Liquidado</span>
                <span className="font-mono text-2xl font-bold text-white block mt-1">
                  R$ {selectedLoan.total_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-primary mt-1 block">
                  {Math.round((selectedLoan.total_paid / selectedLoan.total_amount) * 100)}% amortizado
                </span>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <span className="font-mono text-xs text-outline uppercase block">Saldo Devedor Atual</span>
                <span className="font-mono text-2xl font-bold text-secondary block mt-1">
                  R$ {selectedLoan.remaining_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-on-surface-variant mt-1 block">
                  Regra Feriados: {selectedLoan.holiday_rule}
                </span>
              </div>
            </div>

            {/* Alerta de Quitação Antecipada SEM Desconto */}
            {earlyPayoff && selectedLoan.status === 'ACTIVE' && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
                <div>
                  <span className="font-bold text-white block">
                    Regra Contratual: Quitação Antecipada SEM Desconto
                  </span>
                  <span className="text-on-surface-variant">
                    Principal Restante (R$ {earlyPayoff.remainingPrincipal.toFixed(2)}) + Juros Futuros (R$ {earlyPayoff.contractualFutureInterest.toFixed(2)})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-secondary">
                    Total para Quitação: R$ {earlyPayoff.totalPayoffAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Tabela de Cronograma de Parcelas */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col gap-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-lg font-bold text-white">
                    Cronograma de Amortização & Ações Rápidas
                  </h2>
                </div>
                <span className="font-mono text-xs text-outline">
                  {selectedLoan.installments?.length || 0} parcelas registradas
                </span>
              </div>

              {selectedLoan.installments && (
                <InstallmentsTable
                  installments={selectedLoan.installments}
                  onOpenPayment={handleOpenPayment}
                  onOpenRollover={handleOpenRollover}
                />
              )}
            </div>
          </div>
        )}

        {/* Modal de Pagamento */}
        <PaymentModal
          installment={selectedInstallment}
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {/* Modal de Comprovante */}
        <PaymentReceiptModal
          receipt={currentReceipt}
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
        />
      </main>
    </div>
  );
}
