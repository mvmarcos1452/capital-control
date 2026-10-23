import Link from 'next/link';
import { ArrowRight, Calculator, FileText, Plus, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { StatsCards } from '../components/dashboard/StatsCards';
import { Navbar } from '../components/layout/Navbar';
import { getBorrowers, getLoans } from '../lib/supabase';

export default async function DashboardPage() {
  const loans = await getLoans();
  const borrowers = await getBorrowers();

  const capitalNaRua = loans.reduce(
    (acc, l) => acc + (l.status === 'ACTIVE' ? l.remaining_balance : 0),
    0
  );
  const totalAReceber = loans.reduce((acc, l) => acc + l.total_amount, 0);
  const lucroRecebido = loans.reduce((acc, l) => acc + l.total_paid, 0);

  const allInstallments = loans.flatMap((l) => l.installments || []);
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueInstallments = allInstallments.filter(
    (i) => i.due_date < todayStr && i.status !== 'PAID'
  );
  const inadimplenciaValor = overdueInstallments.reduce(
    (acc, i) => acc + i.remaining_balance,
    0
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full pt-28 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-mono text-xs text-outline uppercase tracking-wider">
              <span>Tesouraria Institucional</span>
              <span className="text-primary">/</span>
              <span>Capital Control ERP</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Visão Geral de Carteira & Caixa
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              Monitoramento algorítmico de amortizações, mitigação de inadimplência com 0 dias de carência e fluxo de tesouraria.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/emprestimos"
              className="py-2.5 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Empréstimo</span>
            </Link>
          </div>
        </div>

        {/* 4 KPI Cards do Stitch */}
        <StatsCards
          capitalNaRua={capitalNaRua}
          totalAReceber={totalAReceber}
          lucroRecebido={lucroRecebido}
          inadimplenciaValor={inadimplenciaValor}
          contratosAtivos={loans.filter((l) => l.status === 'ACTIVE').length}
          parcelasAtraso={overdueInstallments.length}
        />

        {/* Seção Central: Empréstimos Ativos & Acesso Rápido */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tabela de Contratos Recentes */}
          <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-secondary" />
                <h2 className="font-heading text-lg font-bold text-white">
                  Contratos Recentes da Carteira
                </h2>
              </div>
              <Link
                href="/emprestimos"
                className="text-xs font-semibold text-primary hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Ver Todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="font-mono text-[11px] text-outline uppercase border-b border-white/10 pb-2">
                  <tr>
                    <th className="py-2">Tomador</th>
                    <th className="py-2">Modalidade</th>
                    <th className="py-2 text-right">Principal</th>
                    <th className="py-2 text-right">Saldo Devedor</th>
                    <th className="py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] font-mono text-xs">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-sans font-medium text-white">
                        {loan.borrower?.name}
                      </td>
                      <td className="py-3 text-on-surface-variant">
                        {loan.calculation_type} ({loan.installments_count}x)
                      </td>
                      <td className="py-3 text-right text-white">
                        R$ {loan.principal_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right text-secondary font-semibold">
                        R$ {loan.remaining_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-primary/10 text-primary border border-primary/20">
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card Lateral: Atalhos e Bot WhatsApp */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>WhatsApp Bot Ativo</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-white">
                Operações Rápidas no WhatsApp
              </h3>
              <p className="text-xs text-on-surface-variant">
                Lançamentos por mensagem de texto com consumo de memória inferior a 120MB de RAM.
              </p>

              <div className="bg-surface-container-high/60 p-3.5 rounded-xl border border-white/10 font-mono text-xs flex flex-col gap-1.5 text-on-surface-variant">
                <div>
                  <span className="text-primary font-bold">recebido</span> 2764.84 12345678900
                </div>
                <div>
                  <span className="text-secondary font-bold">gasto</span> 85.50 combustivel
                </div>
                <div>
                  <span className="text-tertiary font-bold">resumo</span> (KPIs em tempo real)
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/clientes"
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4 text-primary" />
                  <span>Auditar Reputação dos Clientes</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
