-- RPC Atómica para Processamento de Pagamento, Liquidação e Emissão de Recibo
CREATE OR REPLACE FUNCTION process_loan_payment(
    p_installment_id UUID,
    p_amount_paid NUMERIC,
    p_payment_type VARCHAR DEFAULT 'PARTIAL', -- 'FULL', 'PARTIAL', 'ROLLOVER', 'EARLY_PAYOFF'
    p_payment_method VARCHAR DEFAULT 'PIX',
    p_operator_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_installment RECORD;
    v_loan RECORD;
    v_borrower RECORD;
    v_remaining_to_allocate NUMERIC;
    v_allocated_penalty NUMERIC := 0;
    v_allocated_interest NUMERIC := 0;
    v_allocated_principal NUMERIC := 0;
    v_new_remaining_penalty NUMERIC;
    v_new_remaining_interest NUMERIC;
    v_new_remaining_principal NUMERIC;
    v_new_remaining_balance NUMERIC;
    v_new_status VARCHAR;
    v_receipt_code VARCHAR;
    v_receipt_hash VARCHAR;
    v_masked_cpf VARCHAR;
    v_receipt_id UUID;
    v_pending_installments_count INT;
    v_result JSONB;
BEGIN
    IF p_amount_paid <= 0 THEN
        RAISE EXCEPTION 'O valor de pagamento deve ser estritamente positivo.';
    END IF;

    -- 1. Bloqueio Atómico da Parcela
    SELECT * INTO v_installment
    FROM loan_installments
    WHERE id = p_installment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parcela de empréstimo não encontrada.';
    END IF;

    IF v_installment.status = 'PAID' THEN
        RAISE EXCEPTION 'Esta parcela já se encontra totalmente quitada.';
    END IF;

    -- 2. Bloqueio Atómico do Empréstimo
    SELECT * INTO v_loan
    FROM loans
    WHERE id = v_installment.loan_id
    FOR UPDATE;

    -- 3. Consulta dos Dados do Tomador
    SELECT * INTO v_borrower
    FROM borrowers
    WHERE id = v_loan.borrower_id;

    -- Máscara do CPF: ***.123.456-**
    IF length(v_borrower.cpf) >= 11 THEN
        v_masked_cpf := '***.' || substr(v_borrower.cpf, 5, 7) || '-**';
    ELSE
        v_masked_cpf := '***.***.***-**';
    END IF;

    -- 4. Cascatas de Alocação do Valor Pago
    v_remaining_to_allocate := round(p_amount_paid, 2);

    IF p_payment_type = 'ROLLOVER' THEN
        -- Na Rolagem: Liquida Multa e Juros contratuais da parcela; o principal não é amortizado
        v_allocated_penalty := v_installment.remaining_penalty;
        v_allocated_interest := v_installment.remaining_interest;
        v_allocated_principal := 0;

        v_new_remaining_penalty := 0;
        v_new_remaining_interest := 0;
        v_new_remaining_principal := v_installment.remaining_principal;
        v_new_remaining_balance := v_installment.remaining_principal;
        v_new_status := 'ROLLED';
    ELSE
        -- Ordem Obrigatória: 1) Multa/Mora -> 2) Juros Contratuais -> 3) Principal
        v_allocated_penalty := LEAST(v_remaining_to_allocate, v_installment.remaining_penalty);
        v_remaining_to_allocate := v_remaining_to_allocate - v_allocated_penalty;

        v_allocated_interest := LEAST(v_remaining_to_allocate, v_installment.remaining_interest);
        v_remaining_to_allocate := v_remaining_to_allocate - v_allocated_interest;

        v_allocated_principal := LEAST(v_remaining_to_allocate, v_installment.remaining_principal);
        v_remaining_to_allocate := v_remaining_to_allocate - v_allocated_principal;

        v_new_remaining_penalty := round(v_installment.remaining_penalty - v_allocated_penalty, 2);
        v_new_remaining_interest := round(v_installment.remaining_interest - v_allocated_interest, 2);
        v_new_remaining_principal := round(v_installment.remaining_principal - v_allocated_principal, 2);

        v_new_remaining_balance := round(
            v_new_remaining_penalty + v_new_remaining_interest + v_new_remaining_principal,
            2
        );

        IF v_new_remaining_balance <= 0 THEN
            v_new_status := 'PAID';
        ELSE
            v_new_status := 'PARTIALLY_PAID';
        END IF;
    END IF;

    -- 5. Atualização da Parcela
    UPDATE loan_installments
    SET
        paid_amount = round(paid_amount + (v_allocated_penalty + v_allocated_interest + v_allocated_principal), 2),
        remaining_penalty = v_new_remaining_penalty,
        remaining_interest = v_new_remaining_interest,
        remaining_principal = v_new_remaining_principal,
        remaining_balance = v_new_remaining_balance,
        status = v_new_status,
        paid_at = NOW()
    WHERE id = p_installment_id;

    -- 6. Inserção Atómica no Fluxo de Caixa (Tesouraria)
    INSERT INTO cash_flow (
        type,
        category,
        amount,
        description,
        loan_id,
        installment_id,
        operator_id
    ) VALUES (
        'INFLOW',
        'LOAN_PAYMENT',
        round(v_allocated_penalty + v_allocated_interest + v_allocated_principal, 2),
        'Recebimento parcela #' || v_installment.installment_number || ' - ' || v_borrower.name,
        v_loan.id,
        v_installment.id,
        p_operator_id
    );

    -- 7. Geração de Identificador Único e Hash Público para Recibo
    v_receipt_code := 'REC-' || to_char(NOW(), 'YYYYMM') || '-' || upper(substr(md5(random()::text), 1, 6));
    v_receipt_hash := md5(gen_random_uuid()::text || clock_timestamp()::text || p_installment_id::text);

    INSERT INTO receipts (
        receipt_code,
        hash,
        installment_id,
        loan_id,
        borrower_name,
        borrower_cpf_masked,
        amount_paid,
        penalty_paid,
        interest_paid,
        principal_paid,
        remaining_balance,
        payment_method,
        operator_id,
        issued_at
    ) VALUES (
        v_receipt_code,
        v_receipt_hash,
        v_installment.id,
        v_loan.id,
        v_borrower.name,
        v_masked_cpf,
        round(v_allocated_penalty + v_allocated_interest + v_allocated_principal, 2),
        v_allocated_penalty,
        v_allocated_interest,
        v_allocated_principal,
        v_new_remaining_balance,
        p_payment_method,
        p_operator_id,
        NOW()
    )
    RETURNING id INTO v_receipt_id;

    -- 8. Atualização do Saldo Consolidado do Contrato
    UPDATE loans
    SET
        total_paid = round(total_paid + (v_allocated_penalty + v_allocated_interest + v_allocated_principal), 2),
        remaining_balance = round(remaining_balance - (v_allocated_interest + v_allocated_principal), 2)
    WHERE id = v_loan.id;

    -- Se não houver mais parcelas pendentes no contrato, marcar como QUITADO (PAID)
    SELECT COUNT(*) INTO v_pending_installments_count
    FROM loan_installments
    WHERE loan_id = v_loan.id AND status NOT IN ('PAID', 'ROLLED');

    IF v_pending_installments_count = 0 THEN
        UPDATE loans SET status = 'PAID' WHERE id = v_loan.id;
    END IF;

    -- 9. Retorno com os Dados do Comprovante
    v_result := jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_code', v_receipt_code,
        'receipt_hash', v_receipt_hash,
        'installment_id', v_installment.id,
        'installment_number', v_installment.installment_number,
        'borrower_name', v_borrower.name,
        'borrower_cpf_masked', v_masked_cpf,
        'amount_paid', round(v_allocated_penalty + v_allocated_interest + v_allocated_principal, 2),
        'penalty_paid', v_allocated_penalty,
        'interest_paid', v_allocated_interest,
        'principal_paid', v_allocated_principal,
        'remaining_balance', v_new_remaining_balance,
        'status', v_new_status,
        'issued_at', NOW()
    );

    RETURN v_result;
END;
$$;
