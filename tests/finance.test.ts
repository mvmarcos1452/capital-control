import { describe, expect, it } from 'bun:test';
import { adjustDueDate, getBrazilianHolidays, isBusinessDay } from '../lib/calendar';
import {
  calculateEarlyPayoffWithoutDiscount,
  generateSchedule,
  roundToCents,
} from '../lib/finance';
import {
  applyPartialPayment,
  calculateBorrowerReputation,
  calculateLatePenalty,
  processRollover,
} from '../lib/payment-rules';
import { BorrowerDelayJustification, LoanInstallment } from '../lib/types';

describe('Loan Engine - Financial Calculations & Cent Compensation', () => {
  it('should generate Tabela Price with exact principal cent compensation on last installment', () => {
    // R$ 10.000,00 a 3.5% a.m. em 12 parcelas
    const schedule = generateSchedule({
      principal: 10000,
      interestRate: 3.5,
      installmentsCount: 12,
      calculationType: 'PRICE',
      holidayRule: 'POSTPONE',
      startDate: '2026-01-15',
    });

    expect(schedule.installments).toHaveLength(12);

    // Soma de todas as amortizações do principal DEVE bater exatamente R$ 10.000,00
    const sumPrincipalAmortized = roundToCents(
      schedule.installments.reduce((acc, inst) => acc + inst.principal_due, 0)
    );
    expect(sumPrincipalAmortized).toBe(10000.0);

    // Todas as parcelas têm total_due maior que zero
    schedule.installments.forEach((inst) => {
      expect(inst.total_due).toBeGreaterThan(0);
      expect(roundToCents(inst.principal_due + inst.interest_due)).toBe(inst.total_due);
    });
  });

  it('should generate Tabela SAC with constant amortization and exact cent closure', () => {
    // R$ 10.000,00 a 2.0% a.m. em 12 parcelas
    const schedule = generateSchedule({
      principal: 10000,
      interestRate: 2.0,
      installmentsCount: 12,
      calculationType: 'SAC',
      holidayRule: 'POSTPONE',
      startDate: '2026-03-10',
    });

    expect(schedule.installments).toHaveLength(12);

    const sumPrincipal = roundToCents(
      schedule.installments.reduce((acc, inst) => acc + inst.principal_due, 0)
    );
    expect(sumPrincipal).toBe(10000.0);

    // Na tabela SAC, as primeiras 11 amortizações são 833.33 e a última fecha o centavo restante
    expect(schedule.installments[0].principal_due).toBe(833.33);
    expect(schedule.installments[11].principal_due).toBe(833.37);
  });

  it('should generate Simple Total (Sobre o Total) with exact cent balance', () => {
    // R$ 5.000,00 a 5.0% a.m. em 6 parcelas
    // Juros totais = 5000 * 0.05 * 6 = 1500. Total = 6500.
    const schedule = generateSchedule({
      principal: 5000,
      interestRate: 5.0,
      installmentsCount: 6,
      calculationType: 'TOTAL',
      holidayRule: 'EXACT_DATE',
      startDate: '2026-05-01',
    });

    expect(schedule.installments).toHaveLength(6);
    expect(schedule.totalInterest).toBe(1500.0);
    expect(schedule.totalAmount).toBe(6500.0);

    const sumPrincipal = roundToCents(
      schedule.installments.reduce((acc, inst) => acc + inst.principal_due, 0)
    );
    const sumInterest = roundToCents(
      schedule.installments.reduce((acc, inst) => acc + inst.interest_due, 0)
    );
    expect(sumPrincipal).toBe(5000.0);
    expect(sumInterest).toBe(1500.0);
  });

  it('should calculate Early Payoff without discount (Principal + All Future Interest)', () => {
    const installments: LoanInstallment[] = [
      {
        id: 'inst-1',
        loan_id: 'loan-1',
        installment_number: 1,
        original_due_date: '2026-01-10',
        due_date: '2026-01-10',
        principal_due: 1000,
        interest_due: 200,
        penalty_due: 0,
        total_due: 1200,
        paid_amount: 1200,
        remaining_principal: 0,
        remaining_interest: 0,
        remaining_penalty: 0,
        remaining_balance: 0,
        status: 'PAID',
      },
      {
        id: 'inst-2',
        loan_id: 'loan-1',
        installment_number: 2,
        original_due_date: '2026-02-10',
        due_date: '2026-02-10',
        principal_due: 1000,
        interest_due: 200,
        penalty_due: 0,
        total_due: 1200,
        paid_amount: 0,
        remaining_principal: 1000,
        remaining_interest: 200,
        remaining_penalty: 0,
        remaining_balance: 1200,
        status: 'PENDING',
      },
      {
        id: 'inst-3',
        loan_id: 'loan-1',
        installment_number: 3,
        original_due_date: '2026-03-10',
        due_date: '2026-03-10',
        principal_due: 1000,
        interest_due: 200,
        penalty_due: 0,
        total_due: 1200,
        paid_amount: 0,
        remaining_principal: 1000,
        remaining_interest: 200,
        remaining_penalty: 0,
        remaining_balance: 1200,
        status: 'PENDING',
      },
    ];

    const payoff = calculateEarlyPayoffWithoutDiscount(installments);
    // Principal pendente: 2000
    // Juros futuros contratados: 400
    // Total SEM desconto: 2400
    expect(payoff.remainingPrincipal).toBe(2000);
    expect(payoff.contractualFutureInterest).toBe(400);
    expect(payoff.totalPayoffAmount).toBe(2400);
  });
});

describe('Holiday and Calendar Adjustments', () => {
  it('should detect national holidays and postpone weekend due dates', () => {
    // 01 de janeiro de 2026 é feriado (quinta-feira)
    const holidays2026 = getBrazilianHolidays(2026);
    expect(holidays2026.has('2026-01-01')).toBe(true);

    // 07 de setembro de 2026 é Independência (segunda-feira)
    expect(holidays2026.has('2026-09-07')).toBe(true);

    // Teste de domingo: 15 de março de 2026 (domingo)
    // Com POSTPONE deve empurrar para segunda-feira 16 de março
    const adjustedPostpone = adjustDueDate('2026-03-15', 'POSTPONE');
    expect(adjustedPostpone).toBe('2026-03-16');

    // Com PRECEDE deve antecipar para sexta-feira 13 de março
    const adjustedPrecede = adjustDueDate('2026-03-15', 'PRECEDE');
    expect(adjustedPrecede).toBe('2026-03-13');

    // Com EXACT_DATE deve manter 15 de março
    const adjustedExact = adjustDueDate('2026-03-15', 'EXACT_DATE');
    expect(adjustedExact).toBe('2026-03-15');
  });
});

describe('Partial Payment Waterfall (Multa -> Juros -> Principal)', () => {
  it('should strictly amortize penalty first, then interest, then principal', () => {
    const installment: LoanInstallment = {
      id: 'inst-test-1',
      loan_id: 'loan-1',
      installment_number: 1,
      original_due_date: '2026-01-10',
      due_date: '2026-01-10',
      principal_due: 1000,
      interest_due: 200,
      penalty_due: 50,
      total_due: 1250,
      paid_amount: 0,
      remaining_principal: 1000,
      remaining_interest: 200,
      remaining_penalty: 50,
      remaining_balance: 1250,
      status: 'PENDING',
    };

    // Caso A: Pagamento de R$ 100,00 (abate R$ 50 de multa e R$ 50 de juros)
    const resA = applyPartialPayment(installment, 100);
    expect(resA.allocatedPenalty).toBe(50);
    expect(resA.allocatedInterest).toBe(50);
    expect(resA.allocatedPrincipal).toBe(0);
    expect(resA.remainingPenalty).toBe(0);
    expect(resA.remainingInterest).toBe(150);
    expect(resA.remainingPrincipal).toBe(1000);
    expect(resA.remainingBalance).toBe(1150);
    expect(resA.newStatus).toBe('PARTIALLY_PAID');

    // Caso B: Pagamento de R$ 300,00 (abate R$ 50 de multa, R$ 200 de juros e R$ 50 de principal)
    const resB = applyPartialPayment(installment, 300);
    expect(resB.allocatedPenalty).toBe(50);
    expect(resB.allocatedInterest).toBe(200);
    expect(resB.allocatedPrincipal).toBe(50);
    expect(resB.remainingPenalty).toBe(0);
    expect(resB.remainingInterest).toBe(0);
    expect(resB.remainingPrincipal).toBe(950);
    expect(resB.remainingBalance).toBe(950);
    expect(resB.newStatus).toBe('PARTIALLY_PAID');

    // Caso C: Pagamento integral de R$ 1250,00
    const resC = applyPartialPayment(installment, 1250);
    expect(resC.allocatedPenalty).toBe(50);
    expect(resC.allocatedInterest).toBe(200);
    expect(resC.allocatedPrincipal).toBe(1000);
    expect(resC.remainingBalance).toBe(0);
    expect(resC.newStatus).toBe('PAID');
  });

  it('should process rollover keeping principal intact and postponing cycle', () => {
    const installment: LoanInstallment = {
      id: 'inst-roll-1',
      loan_id: 'loan-1',
      installment_number: 1,
      original_due_date: '2026-01-10',
      due_date: '2026-01-10',
      principal_due: 1500,
      interest_due: 150,
      penalty_due: 30,
      total_due: 1680,
      paid_amount: 0,
      remaining_principal: 1500,
      remaining_interest: 150,
      remaining_penalty: 30,
      remaining_balance: 1680,
      status: 'PENDING',
    };

    const rollover = processRollover(installment, '2026-02-10');
    expect(rollover.interestPaid).toBe(150);
    expect(rollover.penaltyPaid).toBe(30);
    expect(rollover.rolledPrincipal).toBe(1500);
    expect(rollover.rolledInstallment.due_date).toBe('2026-02-10');
    expect(rollover.rolledInstallment.principal_due).toBe(1500);
  });
});

describe('Reputation Score & Delay Justifications (0 Grace Days)', () => {
  it('should calculate Good Payer status for on-time payments and apply justifications', () => {
    const installments: LoanInstallment[] = [
      {
        id: 'inst-1',
        loan_id: 'l-1',
        installment_number: 1,
        original_due_date: '2026-01-10',
        due_date: '2026-01-10',
        principal_due: 500,
        interest_due: 50,
        penalty_due: 0,
        total_due: 550,
        paid_amount: 550,
        remaining_principal: 0,
        remaining_interest: 0,
        remaining_penalty: 0,
        remaining_balance: 0,
        status: 'PAID',
        paid_at: '2026-01-10',
      },
      {
        id: 'inst-2',
        loan_id: 'l-1',
        installment_number: 2,
        original_due_date: '2026-02-10',
        due_date: '2026-02-10',
        principal_due: 500,
        interest_due: 50,
        penalty_due: 0,
        total_due: 550,
        paid_amount: 550,
        remaining_principal: 0,
        remaining_interest: 0,
        remaining_penalty: 0,
        remaining_balance: 0,
        status: 'PAID',
        paid_at: '2026-02-14', // 4 dias de atraso (0 dias tolerância)
      },
    ];

    // Sem justificativa
    const repWithoutJust = calculateBorrowerReputation(installments, [], '2026-02-20');
    expect(repWithoutJust.paidOnTime).toBe(1);
    expect(repWithoutJust.paidLateWithoutJustification).toBe(1);
    expect(repWithoutJust.status).toBe('ATTENTION');

    // Com justificativa do operador registrada
    const justifications: BorrowerDelayJustification[] = [
      {
        id: 'just-1',
        borrower_id: 'b-1',
        installment_id: 'inst-2',
        reason: 'Problema no sistema bancário do cliente confirmado',
        waived_penalty: true,
        operator_notes: 'Comprovante bancário anexado',
        operator_id: 'op-123',
        created_at: '2026-02-14',
      },
    ];

    const repWithJust = calculateBorrowerReputation(
      installments,
      justifications,
      '2026-02-20'
    );
    expect(repWithJust.paidLateWithJustification).toBe(1);
    expect(repWithJust.paidLateWithoutJustification).toBe(0);
    expect(repWithJust.score).toBeGreaterThanOrEqual(90);
    expect(repWithJust.status).toBe('GOOD_PAYER');
  });
});
