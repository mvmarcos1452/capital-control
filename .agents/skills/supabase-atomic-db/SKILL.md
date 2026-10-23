---
name: supabase-atomic-db
description: Modelação de tabelas PostgreSQL, migrações Drizzle/Supabase, transações atómicas para liquidação de empréstimos, RLS e cálculo do histórico de bom pagador. Utilize ao trabalhar com base de dados, migrações e consistência transacional.
---

# Supabase Atomic DB Skill

Esta competência rege o acesso a dados, integridade e segurança no PostgreSQL/Supabase auto-hospedado no Coolify.

## Estrutura de Dados Principal

1. **`borrowers`**:
   - `id`, `name`, `cpf` (único e indexado), `phone`, `address`, `notes`, `created_at`.
2. **`loans`**:
   - `id`, `borrower_id`, `calculation_type` (PRICE, SAC, TOTAL, COMPOUND, PER_INSTALLMENT), `principal_amount`, `interest_rate`, `installments_count`, `holiday_rule`, `status` (ACTIVE, PAID, DEFAULTED), `created_at`.
3. **`loan_installments`**:
   - `id`, `loan_id`, `installment_number`, `due_date`, `original_due_date`, `principal_due`, `interest_due`, `penalty_due`, `paid_amount`, `status` (PENDING, PARTIALLY_PAID, PAID, ROLLED).
4. **`cash_flow`**:
   - `id`, `type` (INFLOW, OUTFLOW), `category` (LOAN_PAYMENT, LOAN_DISBURSEMENT, EXPENSE, CASH_DEPOSIT), `amount`, `description`, `created_at`.
5. **`receipts`**:
   - `id`, `installment_id`, `payment_id`, `amount_paid`, `remaining_balance`, `receipt_code`, `issued_at`.

## Transações Atómicas Obrigatórias

- Qualquer pagamento (parcela completa, parcial, rolagem ou liquidação total) **deve** ser executado via RPC / Função PL/pgSQL atómica:
  1. Atualiza o estado e valores da parcela (`loan_installments`).
  2. Insere a entrada de caixa correspondente (`cash_flow`).
  3. Atualiza os agregados do empréstimo (`loans`).
  4. Gera o registo auditável de comprovativo (`receipts`).
  5. Se alguma operação falhar, reverte toda a transação (`ROLLBACK`).

## Score de Reputação (Bom Pagador)

- View ou consulta agregada para o histórico do cliente:
  - Percentagem de parcelas pagas dentro do prazo original.
  - Quantidade de rolagens de dívida (pagamento só de juros).
  - Dias médios de atraso em parcelas regularizadas após a data de vencimento.

## Segurança e Desempenho

- RLS (Row Level Security) ativado em todas as tabelas.
- Chaves forasteiras com índices explícitos.
- Consultas de dashboard consolidadas para evitar sobrecarga de memória nos 8GB de RAM do servidor.