-- Habilitar extensões necessárias para UUID e Criptografia
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Operadores (para mapeamento de telefone da Whitelist do WhatsApp a operator_id)
CREATE TABLE IF NOT EXISTS operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL, -- Ex: '5511999999999'
    role VARCHAR(50) DEFAULT 'ADMIN',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir operador padrão para vincular à variável DEFAULT_OPERATOR_ID
INSERT INTO operators (id, name, phone, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'Operador Principal Capital Control', '5511999999999', 'ADMIN')
ON CONFLICT (phone) DO UPDATE SET id = EXCLUDED.id;

-- 2. Tabela de Tomadores / Clientes
CREATE TABLE IF NOT EXISTS borrowers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL, -- Formatado: 000.000.000-00
    phone VARCHAR(30) NOT NULL,
    address TEXT,
    notes TEXT,
    reputation_score INT DEFAULT 100,
    reputation_status VARCHAR(30) DEFAULT 'GOOD_PAYER', -- GOOD_PAYER, ATTENTION, DEFAULT
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borrowers_cpf ON borrowers(cpf);
CREATE INDEX IF NOT EXISTS idx_borrowers_phone ON borrowers(phone);

-- 3. Tabela de Empréstimos / Contratos
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE RESTRICT,
    calculation_type VARCHAR(30) NOT NULL, -- PRICE, SAC, TOTAL, COMPOUND, PER_INSTALLMENT
    principal_amount NUMERIC(12, 2) NOT NULL CHECK (principal_amount > 0),
    interest_rate NUMERIC(6, 2) NOT NULL,
    installments_count INT NOT NULL CHECK (installments_count > 0),
    holiday_rule VARCHAR(30) NOT NULL DEFAULT 'POSTPONE', -- POSTPONE, PRECEDE, EXACT_DATE
    start_date DATE NOT NULL,
    total_interest NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, PAID, DEFAULTED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- 4. Tabela de Parcelas de Empréstimo
CREATE TABLE IF NOT EXISTS loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    original_due_date DATE NOT NULL,
    due_date DATE NOT NULL,
    principal_due NUMERIC(12, 2) NOT NULL,
    interest_due NUMERIC(12, 2) NOT NULL,
    penalty_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_due NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_principal NUMERIC(12, 2) NOT NULL,
    remaining_interest NUMERIC(12, 2) NOT NULL,
    remaining_penalty NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PARTIALLY_PAID, PAID, ROLLED
    rolled_to_installment_id UUID REFERENCES loan_installments(id),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_loan_id ON loan_installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON loan_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON loan_installments(status);

-- 5. Tabela de Justificativas Manuais de Atraso (Auditoria do Operador)
CREATE TABLE IF NOT EXISTS borrower_delay_justifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    installment_id UUID REFERENCES loan_installments(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    waived_penalty BOOLEAN DEFAULT FALSE,
    operator_notes TEXT,
    operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_justifications_borrower ON borrower_delay_justifications(borrower_id);

-- 6. Tabela de Fluxo de Caixa (Tesouraria e Movimentações)
CREATE TABLE IF NOT EXISTS cash_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL, -- INFLOW, OUTFLOW
    category VARCHAR(50) NOT NULL, -- LOAN_PAYMENT, LOAN_DISBURSEMENT, EXPENSE, CASH_DEPOSIT
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    installment_id UUID REFERENCES loan_installments(id) ON DELETE SET NULL,
    operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_created_at ON cash_flow(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_flow_category ON cash_flow(category);

-- 7. Tabela de Comprovativos e Recibos (com Hash Único para acesso público)
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_code VARCHAR(50) UNIQUE NOT NULL, -- Ex: REC-202610-8A1F
    hash VARCHAR(64) UNIQUE NOT NULL,         -- Hash público para /recibo/[hash] sem login
    installment_id UUID REFERENCES loan_installments(id) ON DELETE SET NULL,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    borrower_name VARCHAR(255) NOT NULL,
    borrower_cpf_masked VARCHAR(20) NOT NULL, -- ***.123.456-**
    amount_paid NUMERIC(12, 2) NOT NULL,
    penalty_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    interest_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    principal_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'PIX',
    operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_hash ON receipts(hash);
CREATE INDEX IF NOT EXISTS idx_receipts_code ON receipts(receipt_code);

-- Habilitar Row Level Security (RLS)
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_delay_justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Política Pública para Leitura de Recibos via Hash (para rota /recibo/[hash] no Stitch sem autenticação)
DROP POLICY IF EXISTS receipts_public_read_by_hash ON receipts;
CREATE POLICY receipts_public_read_by_hash ON receipts
    FOR SELECT
    USING (true);

-- Políticas padrão para operações autenticadas (service role e usuários autorizados)
DROP POLICY IF EXISTS operators_all ON operators;
CREATE POLICY operators_all ON operators FOR ALL USING (true);

DROP POLICY IF EXISTS borrowers_all ON borrowers;
CREATE POLICY borrowers_all ON borrowers FOR ALL USING (true);

DROP POLICY IF EXISTS loans_all ON loans;
CREATE POLICY loans_all ON loans FOR ALL USING (true);

DROP POLICY IF EXISTS loan_installments_all ON loan_installments;
CREATE POLICY loan_installments_all ON loan_installments FOR ALL USING (true);

DROP POLICY IF EXISTS justifications_all ON borrower_delay_justifications;
CREATE POLICY justifications_all ON borrower_delay_justifications FOR ALL USING (true);

DROP POLICY IF EXISTS cash_flow_all ON cash_flow;
CREATE POLICY cash_flow_all ON cash_flow FOR ALL USING (true);
