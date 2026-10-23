import { createClient } from '@supabase/supabase-js';
import { initialBorrowers, initialJustifications, initialLoans, initialReceipts } from './mock-data';
import { applyPartialPayment, calculateBorrowerReputation } from './payment-rules';
import {
  Borrower,
  BorrowerDelayJustification,
  Loan,
  LoanInstallment,
  PaymentReceipt,
} from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Estado de memória local para execução sem conexão direta ao Supabase configurada
let memoryBorrowers: Borrower[] = [...initialBorrowers];
let memoryLoans: Loan[] = [...initialLoans];
let memoryReceipts: PaymentReceipt[] = [...initialReceipts];
let memoryJustifications: BorrowerDelayJustification[] = [...initialJustifications];

// Mapeamento de Telefones da Whitelist para Operadores (Requisito 4)
export const operatorWhitelistMap: Record<string, { id: string; name: string; role: string }> = {
  '5511999999999': {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Operador Geral Capital Control',
    role: 'ADMIN',
  },
  '5511988887777': {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Gestor Financeiro Chefe',
    role: 'MANAGER',
  },
};

/**
 * Mapeia um número de telefone higienizado para o UUID de operador registrado.
 * Suporta configuração dinâmica via variável de ambiente WHATSAPP_ADMIN_WHITELIST e DEFAULT_OPERATOR_ID.
 */
export function getOperatorByPhone(phone: string): { id: string; name: string; role: string } | null {
  const cleanPhone = phone.replace(/\D/g, '');

  // 1. Verificação no mapa em memória
  if (operatorWhitelistMap[cleanPhone]) {
    return operatorWhitelistMap[cleanPhone];
  }

  // 2. Verificação dinâmica via variável de ambiente WHATSAPP_ADMIN_WHITELIST
  const envWhitelistRaw = process.env.WHATSAPP_ADMIN_WHITELIST || '';
  if (envWhitelistRaw) {
    const numbers = envWhitelistRaw.split(',').map((n) => n.trim().replace(/\D/g, ''));
    if (numbers.includes(cleanPhone)) {
      const defaultOperatorId =
        process.env.DEFAULT_OPERATOR_ID || '00000000-0000-0000-0000-000000000001';
      const dynamicOp = {
        id: defaultOperatorId,
        name: `Operador Whitelist (+${cleanPhone})`,
        role: 'ADMIN',
      };
      // Cache local para requisições subsequentes
      operatorWhitelistMap[cleanPhone] = dynamicOp;
      return dynamicOp;
    }
  }

  return null;
}

/**
 * Consulta recibo por Hash público (para rota /recibo/[hash] sem autenticação).
 */
export async function getReceiptByHash(hash: string): Promise<PaymentReceipt | null> {
  // 1. Busca direta no cache/memória local
  const memoryReceipt = memoryReceipts.find((r) => r.hash === hash || r.receipt_code === hash);
  if (memoryReceipt) {
    return memoryReceipt;
  }

  // 2. Consulta à base PostgreSQL/Supabase se configurada
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NODE_ENV !== 'test'
  ) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('hash', hash)
        .abortSignal(controller.signal)
        .single();
      clearTimeout(timeoutId);
      if (!error && data) {
        return data as PaymentReceipt;
      }
    } catch {
      // Fallback gracioso
    }
  }

  return null;
}

/**
 * Retorna todos os tomadores/clientes com reputação calculada.
 */
export async function getBorrowers(): Promise<Borrower[]> {
  return memoryBorrowers;
}

/**
 * Retorna os empréstimos ativos.
 */
export async function getLoans(): Promise<Loan[]> {
  return memoryLoans;
}

/**
 * Retorna um empréstimo específico por ID.
 */
export async function getLoanById(id: string): Promise<Loan | null> {
  const loan = memoryLoans.find((l) => l.id === id);
  return loan || null;
}

/**
 * Registra uma justificativa manual de atraso pelo operador.
 */
export async function recordDelayJustification(
  borrowerId: string,
  installmentId: string,
  reason: string,
  waivedPenalty: boolean,
  operatorNotes: string,
  operatorId: string
): Promise<BorrowerDelayJustification> {
  const justification: BorrowerDelayJustification = {
    id: `just-${Date.now()}`,
    borrower_id: borrowerId,
    installment_id: installmentId,
    reason,
    waived_penalty: waivedPenalty,
    operator_notes: operatorNotes,
    operator_id: operatorId,
    created_at: new Date().toISOString(),
  };

  memoryJustifications.push(justification);

  // Recalcula reputação do tomador com 0 dias de tolerância + justificativa
  const borrower = memoryBorrowers.find((b) => b.id === borrowerId);
  if (borrower) {
    const allBorrowerInstallments: LoanInstallment[] = memoryLoans
      .filter((l) => l.borrower_id === borrowerId)
      .flatMap((l) => l.installments || []);

    const borrowerJusts = memoryJustifications.filter((j) => j.borrower_id === borrowerId);
    const rep = calculateBorrowerReputation(
      allBorrowerInstallments,
      borrowerJusts,
      new Date().toISOString().slice(0, 10)
    );

    borrower.reputation_score = rep.score;
    borrower.reputation_status = rep.status;
  }

  return justification;
}

/**
 * Executa a baixa de pagamento na ordem estrita: Multa -> Juros -> Principal,
 * gerando o comprovante auditável com Hash público.
 */
export async function executeLoanPayment(params: {
  installmentId: string;
  amountPaid: number;
  paymentType: 'FULL' | 'PARTIAL' | 'ROLLOVER' | 'EARLY_PAYOFF';
  paymentMethod?: string;
  operatorId?: string;
}): Promise<{
  success: boolean;
  message: string;
  receipt?: PaymentReceipt;
  installment?: LoanInstallment;
}> {
  const { installmentId, amountPaid, paymentType, paymentMethod = 'PIX', operatorId } = params;

  let targetLoan: Loan | undefined;
  let targetInstallment: LoanInstallment | undefined;

  for (const loan of memoryLoans) {
    const inst = loan.installments?.find((i) => i.id === installmentId);
    if (inst) {
      targetLoan = loan;
      targetInstallment = inst;
      break;
    }
  }

  if (!targetLoan || !targetInstallment) {
    return { success: false, message: 'Parcela de empréstimo não localizada.' };
  }

  if (targetInstallment.status === 'PAID') {
    return { success: false, message: 'Esta parcela já se encontra quitada.' };
  }

  const borrower = memoryBorrowers.find((b) => b.id === targetLoan?.borrower_id);
  const borrowerName = borrower?.name || 'Cliente';
  const cpfMasked = borrower?.cpf ? `***.${borrower.cpf.slice(4, 11)}-**` : '***.***.***-**';

  let penaltyPaid = 0;
  let interestPaid = 0;
  let principalPaid = 0;
  let remainingBalance = 0;

  if (paymentType === 'ROLLOVER') {
    penaltyPaid = targetInstallment.remaining_penalty;
    interestPaid = targetInstallment.remaining_interest;
    principalPaid = 0;
    targetInstallment.remaining_penalty = 0;
    targetInstallment.remaining_interest = 0;
    remainingBalance = targetInstallment.remaining_principal;
    targetInstallment.remaining_balance = remainingBalance;
    targetInstallment.status = 'ROLLED';
    targetInstallment.paid_amount += penaltyPaid + interestPaid;
  } else {
    const result = applyPartialPayment(targetInstallment, amountPaid);
    penaltyPaid = result.allocatedPenalty;
    interestPaid = result.allocatedInterest;
    principalPaid = result.allocatedPrincipal;
    remainingBalance = result.remainingBalance;

    targetInstallment.remaining_penalty = result.remainingPenalty;
    targetInstallment.remaining_interest = result.remainingInterest;
    targetInstallment.remaining_principal = result.remainingPrincipal;
    targetInstallment.remaining_balance = result.remainingBalance;
    targetInstallment.paid_amount += result.paidAmount;
    targetInstallment.status = result.newStatus;
  }

  targetInstallment.paid_at = new Date().toISOString();

  // Atualiza saldo do empréstimo
  targetLoan.total_paid += penaltyPaid + interestPaid + principalPaid;
  targetLoan.remaining_balance = Math.max(0, targetLoan.remaining_balance - (interestPaid + principalPaid));

  const allPaid = targetLoan.installments?.every((i) => i.status === 'PAID' || i.status === 'ROLLED');
  if (allPaid) {
    targetLoan.status = 'PAID';
  }

  // Gera código e Hash único de recibo
  const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
  const receiptCode = `REC-${new Date().toISOString().slice(0, 7).replace('-', '')}-${randomHex}`;
  const receiptHash = `hash-${Date.now()}-${randomHex.toLowerCase()}`;

  const receipt: PaymentReceipt = {
    id: `rec-${Date.now()}`,
    receipt_code: receiptCode,
    hash: receiptHash,
    installment_id: targetInstallment.id,
    loan_id: targetLoan.id,
    borrower_name: borrowerName,
    borrower_cpf_masked: cpfMasked,
    amount_paid: penaltyPaid + interestPaid + principalPaid,
    penalty_paid: penaltyPaid,
    interest_paid: interestPaid,
    principal_paid: principalPaid,
    remaining_balance: remainingBalance,
    payment_method: paymentMethod,
    operator_id: operatorId || '00000000-0000-0000-0000-000000000001',
    issued_at: new Date().toISOString(),
    installment_number: targetInstallment.installment_number,
    total_installments: targetLoan.installments_count,
  };

  memoryReceipts.unshift(receipt);

  return {
    success: true,
    message: 'Pagamento processado com sucesso.',
    receipt,
    installment: targetInstallment,
  };
}
