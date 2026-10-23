import { ShieldCheck, Users } from 'lucide-react';
import { ClientsManager } from '../../components/clients/ClientsManager';
import { Navbar } from '../../components/layout/Navbar';
import { getBorrowers } from '../../lib/supabase';

export default async function ClientesPage() {
  const borrowers = await getBorrowers();

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full pt-28 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-mono text-xs text-outline uppercase tracking-wider">
              <span>Módulo de Crédito</span>
              <span className="text-primary">/</span>
              <span>Compliance & Reputação</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Gestão de Clientes & Histórico de Bom Pagador
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              Cálculo estrito de reputação com 0 dias de carência, detecção imediata de atrasos e auditoria de justificativas manuais pelo operador.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
            <span>Regra de 0 Dias de Carência Ativa</span>
          </div>
        </div>

        <ClientsManager initialBorrowers={borrowers} />
      </main>
    </div>
  );
}
