import { differenceInDays, parseISO } from 'date-fns';
import { roundToCents } from './finance';
import {
  Borrower,
  BorrowerDelayJustification,
  InstallmentStatus,
  LoanInstallment,
  ReputationStatus,
} from './types';

export interface PartialPaymentResult {
  paidAmount: number;
  allocatedPenalty: number;
  allocatedInterest: number;
  allocatedPrincipal: number;
  remainingPenalty: number;
  remainingInterest: number;
  remainingPrincipal: number;
  remainingBalance: number;
  newStatus: InstallmentStatus;
}

/**
 * Aplica a regra estrita de amortização parcial:
 * ORDEM: Multa/Mora -> Juros Contratuais -> Saldo Principal.
 */
export function applyPartialPayment(
  installment: LoanInstallment,
  amountPaid: number
): PartialPaymentResult {
  if (amountPaid <= 0) {
    throw new Error('O valor de pagamento deve ser maior que zero.');
  }

  let remainingToAllocate = roundToCents(amountPaid);

  const currentPenalty = roundToCents(installment.remaining_penalty);
  const currentInterest = roundToCents(installment.remaining_interest);
  const currentPrincipal = roundToCents(installment.remaining_principal);

  // 1. Amortização de Multa e Mora
  const allocatedPenalty = Math.min(remainingToAllocate, currentPenalty);
  const remainingPenalty = roundToCents(currentPenalty - allocatedPenalty);
  remainingToAllocate = roundToCents(remainingToAllocate - allocatedPenalty);

  // 2. Amortização de Juros Contratuais
  const allocatedInterest = Math.min(remainingToAllocate, currentInterest);
  const remainingInterest = roundToCents(currentInterest - allocatedInterest);
  remainingToAllocate = roundToCents(remainingToAllocate - allocatedInterest);

  // 3. Amortização do Principal
  const allocatedPrincipal = Math.min(remainingToAllocate, currentPrincipal);
  const remainingPrincipal = roundToCents(currentPrincipal - allocatedPrincipal);
  remainingToAllocate = roundToCents(remainingToAllocate - allocatedPrincipal);

  const remainingBalance = roundToCents(
    remainingPenalty + remainingInterest + remainingPrincipal
  );

  const newStatus: InstallmentStatus =
    remainingBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

  return {
    paidAmount: roundToCents(amountPaid - remainingToAllocate),
    allocatedPenalty,
    allocatedInterest,
    allocatedPrincipal,
    remainingPenalty,
    remainingInterest,
    remainingPrincipal,
    remainingBalance,
    newStatus,
  };
}

/**
 * Calcula a multa contratual e juros de mora diários a partir da data de vencimento.
 * Regra: 0 dias de tolerância.
 * - Multa padrão: 2% sobre o saldo pendente.
 * - Juros de mora: 0.033% ao dia sobre o saldo pendente (aprox. 1% ao mês).
 */
export function calculateLatePenalty(
  installment: LoanInstallment,
  currentDateStr: string,
  penaltyPercent = 2,
  dailyInterestRate = 0.033
): number {
  if (installment.status === 'PAID') {
    return 0;
  }

  const dueDate = parseISO(installment.due_date);
  const currentDate = parseISO(currentDateStr);

  const daysLate = differenceInDays(currentDate, dueDate);

  if (daysLate <= 0) {
    return 0;
  }

  const baseDue = installment.remaining_principal + installment.remaining_interest;
  const fixedPenalty = roundToCents((baseDue * penaltyPercent) / 100);
  const dailyInterest = roundToCents((baseDue * (dailyInterestRate / 100)) * daysLate);

  return roundToCents(fixedPenalty + dailyInterest);
}

/**
 * Regra de Rolagem de Dívida (Pagamento Apenas de Juros):
 * - Liquida os juros e multa pendentes.
 * - O saldo principal permanece integralmente devido e é transferido.
 */
export function processRollover(
  installment: LoanInstallment,
  nextDueDateStr: string
): {
  interestPaid: number;
  penaltyPaid: number;
  rolledPrincipal: number;
  rolledInstallment: LoanInstallment;
} {
  const interestPaid = installment.remaining_interest;
  const penaltyPaid = installment.remaining_penalty;
  const rolledPrincipal = installment.remaining_principal;

  const rolledInstallment: LoanInstallment = {
    ...installment,
    id: `rolled-${installment.id}-${Date.now()}`,
    due_date: nextDueDateStr,
    original_due_date: nextDueDateStr,
    principal_due: rolledPrincipal,
    interest_due: roundToCents(rolledPrincipal * (installment.interest_due / (installment.principal_due || 1))),
    penalty_due: 0,
    total_due: roundToCents(
      rolledPrincipal +
        roundToCents(rolledPrincipal * (installment.interest_due / (installment.principal_due || 1)))
    ),
    paid_amount: 0,
    remaining_principal: rolledPrincipal,
    remaining_interest: roundToCents(
      rolledPrincipal * (installment.interest_due / (installment.principal_due || 1))
    ),
    remaining_penalty: 0,
    remaining_balance: roundToCents(
      rolledPrincipal +
        roundToCents(rolledPrincipal * (installment.interest_due / (installment.principal_due || 1)))
    ),
    status: 'PENDING',
  };

  return {
    interestPaid,
    penaltyPaid,
    rolledPrincipal,
    rolledInstallment,
  };
}

export interface BorrowerReputationMetrics {
  totalInstallments: number;
  paidOnTime: number;
  paidLateWithoutJustification: number;
  paidLateWithJustification: number;
  rolledCount: number;
  activeLateInstallments: number;
  score: number; // 0 a 100
  status: ReputationStatus;
}

/**
 * Calcula a pontuação e status de "Bom Pagador" com 0 dias de tolerância
 * e suporte a abono/justificativa de atrasos inserida pelo operador.
 */
export function calculateBorrowerReputation(
  installments: LoanInstallment[],
  justifications: BorrowerDelayJustification[],
  currentDateStr: string
): BorrowerReputationMetrics {
  if (installments.length === 0) {
    return {
      totalInstallments: 0,
      paidOnTime: 0,
      paidLateWithoutJustification: 0,
      paidLateWithJustification: 0,
      rolledCount: 0,
      activeLateInstallments: 0,
      score: 100,
      status: 'GOOD_PAYER',
    };
  }

  const currentDate = parseISO(currentDateStr);
  const justifiedInstallmentIds = new Set(
    justifications
      .filter((j) => j.waived_penalty || j.reason.trim().length > 0)
      .map((j) => j.installment_id)
  );

  let paidOnTime = 0;
  let paidLateWithoutJustification = 0;
  let paidLateWithJustification = 0;
  let rolledCount = 0;
  let activeLateInstallments = 0;

  for (const inst of installments) {
    if (inst.status === 'ROLLED') {
      rolledCount++;
      continue;
    }

    if (inst.status === 'PAID') {
      const paidDate = inst.paid_at ? parseISO(inst.paid_at) : parseISO(inst.due_date);
      const dueDate = parseISO(inst.due_date);

      if (differenceInDays(paidDate, dueDate) <= 0) {
        paidOnTime++;
      } else {
        if (justifiedInstallmentIds.has(inst.id)) {
          paidLateWithJustification++;
        } else {
          paidLateWithoutJustification++;
        }
      }
    } else if (inst.status === 'PENDING' || inst.status === 'PARTIALLY_PAID') {
      const dueDate = parseISO(inst.due_date);
      if (differenceInDays(currentDate, dueDate) > 0) {
        if (!justifiedInstallmentIds.has(inst.id)) {
          activeLateInstallments++;
        }
      }
    }
  }

  const evaluatedCount =
    paidOnTime +
    paidLateWithoutJustification +
    paidLateWithJustification +
    rolledCount +
    activeLateInstallments;

  if (evaluatedCount === 0) {
    return {
      totalInstallments: installments.length,
      paidOnTime: 0,
      paidLateWithoutJustification: 0,
      paidLateWithJustification: 0,
      rolledCount: 0,
      activeLateInstallments: 0,
      score: 100,
      status: 'GOOD_PAYER',
    };
  }

  // Base de 100 pontos:
  // Parcelas em dia contam 100%
  // Parcelas justificadas contam 85%
  // Rolagens contam 60%
  // Atrasos pagos sem justificativa contam 40%
  // Atrasos ativos não justificados penalizam severamente (peso 0%)
  const positivePoints =
    paidOnTime * 100 +
    paidLateWithJustification * 85 +
    rolledCount * 60 +
    paidLateWithoutJustification * 40;

  let score = Math.round(positivePoints / evaluatedCount);

  // Penalização direta adicional se houver atrasos ativos sem justificativa
  if (activeLateInstallments > 0) {
    score = Math.max(0, score - activeLateInstallments * 25);
  }

  score = Math.min(100, Math.max(0, score));

  let status: ReputationStatus = 'GOOD_PAYER';
  if (activeLateInstallments > 0 || score < 70) {
    status = 'DEFAULT';
  } else if (score < 90 || paidLateWithoutJustification > 0 || rolledCount > 1) {
    status = 'ATTENTION';
  }

  return {
    totalInstallments: installments.length,
    paidOnTime,
    paidLateWithoutJustification,
    paidLateWithJustification,
    rolledCount,
    activeLateInstallments,
    score,
    status,
  };
}
