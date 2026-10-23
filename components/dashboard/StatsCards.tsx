'use client';

import { AlertTriangle, ArrowUpRight, DollarSign, TrendingUp, Wallet } from 'lucide-react';

interface StatsCardsProps {
  capitalNaRua: number;
  totalAReceber: number;
  lucroRecebido: number;
  inadimplenciaValor: number;
  contratosAtivos: number;
  parcelasAtraso: number;
}

export function StatsCards({
  capitalNaRua,
  totalAReceber,
  lucroRecebido,
  inadimplenciaValor,
  contratosAtivos,
  parcelasAtraso,
}: StatsCardsProps) {
  const cards = [
    {
      title: 'Capital a Receber',
      subtitle: 'Principal em circulação',
      value: capitalNaRua,
      icon: Wallet,
      iconColor: 'text-secondary',
      iconBg: 'bg-secondary/10',
      badge: `${contratosAtivos} contratos ativos`,
      trend: '+3.2%',
      trendUp: true,
    },
    {
      title: 'Total a Receber',
      subtitle: 'Principal + Juros Contratados',
      value: totalAReceber,
      icon: TrendingUp,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      badge: 'Projeção de carteira',
      trend: '+5.8%',
      trendUp: true,
    },
    {
      title: 'Juros Recebidos',
      subtitle: 'Lucro operacional liquidado',
      value: lucroRecebido,
      icon: DollarSign,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      badge: 'Entradas acumuladas',
      trend: '+12.4%',
      trendUp: true,
    },
    {
      title: 'Parcelas em Atraso',
      subtitle: '0 dias de tolerância',
      value: inadimplenciaValor,
      icon: AlertTriangle,
      iconColor: 'text-error',
      iconBg: 'bg-error/10',
      badge: `${parcelasAtraso} parcela(s) pendente(s)`,
      trend: parcelasAtraso > 0 ? 'Atenção' : 'Regular',
      trendUp: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-mono text-xs text-outline uppercase tracking-wider">
                  {card.title}
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  {card.subtitle}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center ${card.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="my-5">
              <div className="font-mono text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center justify-between font-mono text-xs pt-2 border-t border-white/[0.06]">
              <span className="text-on-surface-variant">{card.badge}</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  card.trendUp
                    ? 'text-primary bg-primary/10'
                    : 'text-error bg-error/10'
                }`}
              >
                {card.trendUp && <ArrowUpRight className="w-3.5 h-3.5" />}
                {card.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
