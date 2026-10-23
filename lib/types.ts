export type CalculationType =
  | 'PRICE'
  | 'SAC'
  | 'TOTAL'
  | 'COMPOUND'
  | 'PER_INSTALLMENT';

export type HolidayRule = 'POSTPONE' | 'PRECEDE' | 'EXACT_DATE';

export type LoanStatus = 'ACTIVE' | 'PAID' | 'DEFAULTED';

export type InstallmentStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'ROLLED';

export type CashFlowType = 'INFLOW' | 'OUTFLOW';

export type CashFlowCategory =
  | 'LOAN_PAYMENT'
  | 'LOAN_DISBURSEMENT'
  | 'EXPENSE'
  | 'CASH_DEPOSIT';

export type ReputationStatus = 'GOOD_PAYER' | 'ATTENTION' | 'DEFAULT';

export interface Borrower {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  address?: string;
  notes?: string;
  reputation_score: number; // 0 to 100
  reputation_status: ReputationStatus;
  created_at: string;
}

export interface BorrowerDelayJustification {
  id: string;
  borrower_id: string;
  installment_id?: string;
  reason: string;
  waived_penalty: boolean;
  operator_notes?: string;
  operator_id: string;
  created_at: string;
}

export interface LoanInstallment {
  id: string;
  loan_id: string;
  installment_number: number;
  original_due_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD (após feriado)
  principal_due: number;
  interest_due: number;
  penalty_due: number; // Multa + Juros de mora diários
  total_due: number;
  paid_amount: number;
  remaining_principal: number;
  remaining_interest: number;
  remaining_penalty: number;
  remaining_balance: number;
  status: InstallmentStatus;
  rolled_to_installment_id?: string;
  paid_at?: string;
}

export interface Loan {
  id: string;
  borrower_id: string;
  borrower?: Borrower;
  calculation_type: CalculationType;
  principal_amount: number;
  interest_rate: number; // em % mensal ou por parcela
  installments_count: number;
  holiday_rule: HolidayRule;
  start_date: string; // YYYY-MM-DD
  total_interest: number;
  total_amount: number;
  total_paid: number;
  remaining_balance: number;
  status: LoanStatus;
  created_at: string;
  installments?: LoanInstallment[];
}

export interface CashFlowEntry {
  id: string;
  type: CashFlowType;
  category: CashFlowCategory;
  amount: number;
  description: string;
  loan_id?: string;
  installment_id?: string;
  created_at: string;
}

export interface PaymentReceipt {
  id: string;
  receipt_code: string; // Ex: REC-202610-A9F8
  hash: string; // SHA-256 ou UUID único para rota pública /recibo/[hash]
  installment_id: string;
  loan_id: string;
  borrower_name: string;
  borrower_cpf_masked: string; // ***.123.456-**
  amount_paid: number;
  penalty_paid: number;
  interest_paid: number;
  principal_paid: number;
  remaining_balance: number;
  payment_method: string;
  operator_id: string;
  issued_at: string;
  installment_number: number;
  total_installments: number;
}

export interface PaymentExecutionResult {
  success: boolean;
  message: string;
  receipt?: PaymentReceipt;
  updated_installment?: LoanInstallment;
  cash_flow_entry?: CashFlowEntry;
}
