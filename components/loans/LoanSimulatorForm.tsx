'use client';

import { useMemo, useState } from 'react';
import { Calculator, Calendar, Check, CheckCircle2, ChevronRight, DollarSign, Percent } from 'lucide-react';
import { generateSchedule } from '../../lib/finance';
import { Borrower, CalculationType, HolidayRule } from '../../lib/types';

interface LoanSimulatorFormProps {
  borrowers: Borrower[];
  onContractCreated?: () => void;
}

export function LoanSimulatorForm({ borrowers, onContractCreated }: LoanSimulatorFormProps) {
  const [selectedBorrowerId, setSelectedBorrowerId] = useState(borrowers[0]?.id || '');
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(3.5);
  const [installmentsCount, setInstallmentsCount] = useState(12);
  const [calcType, setCalcType] = useState<CalculationType>('PRICE');
  const [holidayRule, setHolidayRule] = useState<HolidayRule>('POSTPONE');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [contractCreated, setContractCreated] = useState(false);

  const selectedBorrower = borrowers.find((b) => b.id === selectedBorrowerId);

  // Simulação reativa em tempo real com compensação exata de centavos
  const simulation = useMemo(() => {
    try {
      if (principal <= 0 || installmentsCount <= 0) return null;
      return generateSchedule({
        principal,
        interestRate: rate,
        installmentsCount,
        calculationType: calcType,
        holidayRule,
        startDate,
      });
    } catch {
      return null;
    }
  }, [principal, rate, installmentsCount, calcType, holidayRule, startDate]);

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    setContractCreated(true);
    setTimeout(() => {
      setContractCreated(false);
      if (onContractCreated) onContractCreated();
    }, 2500);
  };

  const calcOptions: { type: CalculationType; label: string; desc: string }[] = [
    { type: 'PRICE', label: 'Tabela Price', desc: 'Prestações fixas, amortização crescente' },
    { type: 'SAC', label: 'Tabela SAC', desc: 'Amortização constante, parcelas decrescentes' },
    { type: 'TOTAL', label: 'Sobre o Total', desc: 'Juros simples divididos igualmente' },
    { type: 'COMPOUND', label: 'Juros Compostos', desc: 'Montante exponencial por período' },
    { type: 'PER_INSTALLMENT', label: 'Por Parcela', desc: 'Taxa fixa aplicada em cada prestação' },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col gap-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="font-mono text-xs text-outline uppercase tracking-wider block">
            Motor de Cálculo Algorítmico
          </span>
          <h2 className="font-heading text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Cadastro & Simulação de Empréstimo
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Compensação Exata de Centavos Ativa</span>
        </div>
      </div>

      <form onSubmit={handleCreateContract} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna da Esquerda: Parâmetros */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Seleção de Tomador */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-2">
              Tomador / Cliente Favorecido
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedBorrowerId}
                onChange={(e) => setSelectedBorrowerId(e.target.value)}
                className="flex-1 bg-surface-container border border-white/15 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-white outline-none"
              >
                {borrowers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} - CPF: {b.cpf}
                  </option>
                ))}
              </select>

              {selectedBorrower && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 font-mono text-xs shrink-0">
                  <span className="text-on-surface-variant">Score:</span>
                  <span
                    className={`font-semibold ${
                      selectedBorrower.reputation_status === 'GOOD_PAYER'
                        ? 'text-primary'
                        : selectedBorrower.reputation_status === 'ATTENTION'
                        ? 'text-secondary'
                        : 'text-error'
                    }`}
                  >
                    {selectedBorrower.reputation_score} pts ({selectedBorrower.reputation_status})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Grid de Valores Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Valor Principal (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline font-mono text-xs">
                  R$
                </span>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/15 focus:border-primary rounded-xl py-2 pl-9 pr-3 text-white font-mono text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Taxa de Juros (% a.m.)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/15 focus:border-primary rounded-xl py-2 pl-3 pr-8 text-white font-mono text-sm outline-none"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-outline" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Nº de Parcelas (Meses)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/15 focus:border-primary rounded-xl py-2 px-3 text-white font-mono text-sm outline-none"
              />
            </div>
          </div>

          {/* Modalidade de Cálculo (Radio Grid) */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-2">
              Modalidade de Cálculo Financeiro
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {calcOptions.map((opt) => {
                const isSelected = calcType === opt.type;
                return (
                  <div
                    key={opt.type}
                    onClick={() => setCalcType(opt.type)}
                    className={`p-3.5 rounded-2xl cursor-pointer border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-primary bg-primary text-black'
                          : 'border-white/30'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-on-surface-variant mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ajuste de Feriados e Data Inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Regra de Calendário & Feriados
              </label>
              <select
                value={holidayRule}
                onChange={(e) => setHolidayRule(e.target.value as HolidayRule)}
                className="w-full bg-surface-container border border-white/15 focus:border-primary rounded-xl py-2 px-3 text-xs text-white outline-none"
              >
                <option value="POSTPONE">Empurrar para o próximo dia útil (Padrão)</option>
                <option value="PRECEDE">Antecipar para o dia útil anterior</option>
                <option value="EXACT_DATE">Manter data exata (Sem ajuste)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Data de Início da Operação
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/15 focus:border-primary rounded-xl py-2 px-3 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Painel Resumo e Projeção */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="font-mono text-xs uppercase tracking-wider text-outline">
                Resumo da Projeção
              </span>
              <span className="font-mono text-xs text-secondary font-medium">
                {installmentsCount} parcelas mensais
              </span>
            </div>

            {simulation ? (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Capital Emprestado:</span>
                  <span className="font-mono font-semibold text-white">
                    R$ {simulation.principalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Lucro em Juros:</span>
                  <span className="font-mono font-semibold text-primary">
                    + R$ {simulation.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                  <span className="font-semibold text-white text-base">Total a Receber:</span>
                  <span className="font-mono text-xl font-bold text-white">
                    R$ {simulation.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Prévia da 1ª e Última Parcela com compensação de centavos */}
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-2 font-mono text-xs">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>1ª Parcela ({simulation.installments[0]?.due_date}):</span>
                    <span className="text-white">
                      R$ {simulation.installments[0]?.total_due.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>
                      Última Parcela ({simulation.installments[installmentsCount - 1]?.due_date}):
                    </span>
                    <span className="text-primary font-medium">
                      R$ {simulation.installments[installmentsCount - 1]?.total_due.toFixed(2)} (Ajustada)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-on-surface-variant text-sm">
                Preencha os dados ao lado para calcular.
              </div>
            )}
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={contractCreated}
              className="w-full py-3.5 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-heading font-semibold text-sm transition-all shadow-[0_0_24px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2"
            >
              {contractCreated ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Contrato Gerado com Sucesso!</span>
                </>
              ) : (
                <>
                  <span>Contratar & Iniciar Empréstimo</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
