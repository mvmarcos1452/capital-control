import { adjustDueDate, generateMonthlyDates } from './calendar';
import { CalculationType, HolidayRule, LoanInstallment } from './types';

/**
 * Arredonda um valor numérico para exatamente 2 casas decimais (centavos monetários).
 */
export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ScheduleCalculationInput {
  principal: number; // Valor financiado (PV)
  interestRate: number; // Taxa mensal em % (ex: 5 para 5% a.m.)
  installmentsCount: number; // Quantidade de parcelas (n)
  calculationType: CalculationType;
  holidayRule: HolidayRule;
  startDate: string; // YYYY-MM-DD
}

export interface ScheduleCalculationOutput {
  principalAmount: number;
  totalInterest: number;
  totalAmount: number;
  installments: Omit<LoanInstallment, 'id' | 'loan_id'>[];
}

/**
 * Gera o cronograma de parcelas com compensação exata de centavos na última parcela.
 */
export function generateSchedule(input: ScheduleCalculationInput): ScheduleCalculationOutput {
  const {
    principal,
    interestRate,
    installmentsCount,
    calculationType,
    holidayRule,
    startDate,
  } = input;

  if (principal <= 0) {
    throw new Error('O valor principal deve ser maior que zero.');
  }
  if (installmentsCount <= 0 || !Number.isInteger(installmentsCount)) {
    throw new Error('A quantidade de parcelas deve ser um número inteiro positivo.');
  }

  const i = interestRate / 100;
  const n = installmentsCount;
  const rawDates = generateMonthlyDates(startDate, n);

  let installments: Omit<LoanInstallment, 'id' | 'loan_id'>[] = [];

  switch (calculationType) {
    case 'PRICE': {
      // PMT = PV * [i * (1+i)^n] / [(1+i)^n - 1]
      // Se taxa de juros for 0%, PMT = PV / n
      const pmt = i === 0 ? roundToCents(principal / n) : roundToCents((principal * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1));

      let currentBalance = principal;
      let accumulatedPrincipalAmortized = 0;

      for (let k = 1; k <= n; k++) {
        const originalDue = rawDates[k - 1];
        const adjustedDue = adjustDueDate(originalDue, holidayRule);

        const interestDue = roundToCents(currentBalance * i);
        let principalDue: number;
        let totalDue: number;

        if (k === n) {
          // Compensação de centavos na última parcela: o principal amortizado é exatamente o saldo restante
          principalDue = roundToCents(principal - accumulatedPrincipalAmortized);
          totalDue = roundToCents(principalDue + interestDue);
          currentBalance = 0;
        } else {
          principalDue = roundToCents(pmt - interestDue);
          totalDue = roundToCents(principalDue + interestDue);
          currentBalance = roundToCents(currentBalance - principalDue);
          accumulatedPrincipalAmortized = roundToCents(accumulatedPrincipalAmortized + principalDue);
        }

        installments.push({
          installment_number: k,
          original_due_date: originalDue,
          due_date: adjustedDue,
          principal_due: principalDue,
          interest_due: interestDue,
          penalty_due: 0,
          total_due: totalDue,
          paid_amount: 0,
          remaining_principal: principalDue,
          remaining_interest: interestDue,
          remaining_penalty: 0,
          remaining_balance: totalDue,
          status: 'PENDING',
        });
      }
      break;
    }

    case 'SAC': {
      // Amortização constante A = PV / n
      const baseAmortization = roundToCents(principal / n);
      let currentBalance = principal;
      let accumulatedAmortized = 0;

      for (let k = 1; k <= n; k++) {
        const originalDue = rawDates[k - 1];
        const adjustedDue = adjustDueDate(originalDue, holidayRule);

        const interestDue = roundToCents(currentBalance * i);
        let principalDue: number;

        if (k === n) {
          // Compensação de centavos na última parcela para fechar o principal exato
          principalDue = roundToCents(principal - accumulatedAmortized);
          currentBalance = 0;
        } else {
          principalDue = baseAmortization;
          accumulatedAmortized = roundToCents(accumulatedAmortized + principalDue);
          currentBalance = roundToCents(currentBalance - principalDue);
        }

        const totalDue = roundToCents(principalDue + interestDue);

        installments.push({
          installment_number: k,
          original_due_date: originalDue,
          due_date: adjustedDue,
          principal_due: principalDue,
          interest_due: interestDue,
          penalty_due: 0,
          total_due: totalDue,
          paid_amount: 0,
          remaining_principal: principalDue,
          remaining_interest: interestDue,
          remaining_penalty: 0,
          remaining_balance: totalDue,
          status: 'PENDING',
        });
      }
      break;
    }

    case 'TOTAL': {
      // Juros Simples Globais: J_total = PV * i * n
      const totalInterest = roundToCents(principal * i * n);
      const basePrincipal = roundToCents(principal / n);
      const baseInterest = roundToCents(totalInterest / n);

      let accumulatedPrincipal = 0;
      let accumulatedInterest = 0;

      for (let k = 1; k <= n; k++) {
        const originalDue = rawDates[k - 1];
        const adjustedDue = adjustDueDate(originalDue, holidayRule);

        let principalDue: number;
        let interestDue: number;

        if (k === n) {
          // Compensação de centavos na última parcela para ambos
          principalDue = roundToCents(principal - accumulatedPrincipal);
          interestDue = roundToCents(totalInterest - accumulatedInterest);
        } else {
          principalDue = basePrincipal;
          interestDue = baseInterest;
          accumulatedPrincipal = roundToCents(accumulatedPrincipal + principalDue);
          accumulatedInterest = roundToCents(accumulatedInterest + interestDue);
        }

        const totalDue = roundToCents(principalDue + interestDue);

        installments.push({
          installment_number: k,
          original_due_date: originalDue,
          due_date: adjustedDue,
          principal_due: principalDue,
          interest_due: interestDue,
          penalty_due: 0,
          total_due: totalDue,
          paid_amount: 0,
          remaining_principal: principalDue,
          remaining_interest: interestDue,
          remaining_penalty: 0,
          remaining_balance: totalDue,
          status: 'PENDING',
        });
      }
      break;
    }

    case 'COMPOUND': {
      // M = PV * (1 + i)^n
      const totalAmount = roundToCents(principal * Math.pow(1 + i, n));
      const totalInterest = roundToCents(totalAmount - principal);

      const basePrincipal = roundToCents(principal / n);
      const baseInterest = roundToCents(totalInterest / n);

      let accumulatedPrincipal = 0;
      let accumulatedInterest = 0;

      for (let k = 1; k <= n; k++) {
        const originalDue = rawDates[k - 1];
        const adjustedDue = adjustDueDate(originalDue, holidayRule);

        let principalDue: number;
        let interestDue: number;

        if (k === n) {
          principalDue = roundToCents(principal - accumulatedPrincipal);
          interestDue = roundToCents(totalInterest - accumulatedInterest);
        } else {
          principalDue = basePrincipal;
          interestDue = baseInterest;
          accumulatedPrincipal = roundToCents(accumulatedPrincipal + principalDue);
          accumulatedInterest = roundToCents(accumulatedInterest + interestDue);
        }

        const totalDue = roundToCents(principalDue + interestDue);

        installments.push({
          installment_number: k,
          original_due_date: originalDue,
          due_date: adjustedDue,
          principal_due: principalDue,
          interest_due: interestDue,
          penalty_due: 0,
          total_due: totalDue,
          paid_amount: 0,
          remaining_principal: principalDue,
          remaining_interest: interestDue,
          remaining_penalty: 0,
          remaining_balance: totalDue,
          status: 'PENDING',
        });
      }
      break;
    }

    case 'PER_INSTALLMENT': {
      // Taxa fixa aplicada diretamente por prestação
      const interestPerInstallment = roundToCents(principal * i);
      const basePrincipal = roundToCents(principal / n);

      let accumulatedPrincipal = 0;

      for (let k = 1; k <= n; k++) {
        const originalDue = rawDates[k - 1];
        const adjustedDue = adjustDueDate(originalDue, holidayRule);

        let principalDue: number;
        if (k === n) {
          principalDue = roundToCents(principal - accumulatedPrincipal);
        } else {
          principalDue = basePrincipal;
          accumulatedPrincipal = roundToCents(accumulatedPrincipal + principalDue);
        }

        const totalDue = roundToCents(principalDue + interestPerInstallment);

        installments.push({
          installment_number: k,
          original_due_date: originalDue,
          due_date: adjustedDue,
          principal_due: principalDue,
          interest_due: interestPerInstallment,
          penalty_due: 0,
          total_due: totalDue,
          paid_amount: 0,
          remaining_principal: principalDue,
          remaining_interest: interestPerInstallment,
          remaining_penalty: 0,
          remaining_balance: totalDue,
          status: 'PENDING',
        });
      }
      break;
    }
  }

  const calculatedTotalInterest = roundToCents(
    installments.reduce((sum, inst) => sum + inst.interest_due, 0)
  );
  const calculatedTotalAmount = roundToCents(
    installments.reduce((sum, inst) => sum + inst.total_due, 0)
  );

  return {
    principalAmount: principal,
    totalInterest: calculatedTotalInterest,
    totalAmount: calculatedTotalAmount,
    installments,
  };
}

/**
 * Quitação Antecipada SEM Desconto:
 * O total exigido é a soma do Saldo Devedor Principal restante + TODOS os juros contratuais
 * de todas as parcelas futuras ainda pendentes (sem dedução de encargos).
 */
export function calculateEarlyPayoffWithoutDiscount(installments: LoanInstallment[]): {
  remainingPrincipal: number;
  contractualFutureInterest: number;
  totalPayoffAmount: number;
} {
  let remainingPrincipal = 0;
  let contractualFutureInterest = 0;

  for (const inst of installments) {
    if (inst.status !== 'PAID') {
      remainingPrincipal = roundToCents(remainingPrincipal + inst.remaining_principal);
      contractualFutureInterest = roundToCents(
        contractualFutureInterest + inst.remaining_interest
      );
    }
  }

  const totalPayoffAmount = roundToCents(remainingPrincipal + contractualFutureInterest);

  return {
    remainingPrincipal,
    contractualFutureInterest,
    totalPayoffAmount,
  };
}
