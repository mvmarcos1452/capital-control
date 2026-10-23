---
name: loan-engine
description: Motor matemático e financeiro para geração de cronogramas, amortizações (Price, SAC, Simples, Compostos), regras de feriados, juros de mora, multas, rolagem e liquidação antecipada sem desconto. Utilize ao programar ou testar regras de cálculo financeiro.
---

# Loan Engine Skill

Esta competência rege as regras matemáticas de empréstimos e liquidação em `lib/finance.ts` e `lib/payment-rules.ts`.

## Fórmulas e Modalidades de Cálculo

1. **Tabela Price (Prestações Fixas)**:
   $$PMT = PV \cdot \frac{i(1+i)^n}{(1+i)^n - 1}$$
   - Amortização crescente, juros decrescentes calculados sobre o saldo devedor residual.

2. **Tabela SAC (Amortização Constante)**:
   $$A = \frac{PV}{n}, \quad J_k = SD_{k-1} \cdot i, \quad PMT_k = A + J_k$$

3. **Sobre o Total (Juro Simples/Global)**:
   $$J_{total} = PV \cdot i \cdot n, \quad PMT = \frac{PV + J_{total}}{n}$$

4. **Juros Compostos**:
   $$M = PV \cdot (1 + i)^n$$

5. **Por Parcela**:
   - Taxa fixa aplicada diretamente ao valor de cada prestação contratada.

## Ajustes de Calendário e Feriados

- Avalie cada data de vencimento contra sábados, domingos e a lista de feriados nacionais.
- Consoante o parâmetro do contrato:
  - `POSTPONE`: Move para o primeiro dia útil seguinte.
  - `PRECEDE`: Move para o dia útil imediatamente anterior.
  - `EXACT_DATE`: Mantém a data exata.

## Regras de Liquidação e Atraso

- **Atraso**: Aplicação de Multa contratual fixa (%) + Juros de Mora diários sobre o valor vencido.
- **Pagamento Parcial**: Amortiza primeiro multas e encargos de mora, depois juros e por fim o principal. O saldo restante permanece pendente na parcela.
- **Apenas Juros (Rolagem)**:
  - Liquida o montante de juros do ciclo.
  - O capital principal não sofre amortização ($SD$ mantém-se).
  - A data de liquidação do principal avança para o ciclo seguinte.
- **Quitação Antecipada SEM Desconto**:
  - Quando o cliente optar por liquidar antes do termo, o valor total devido é:
    $$\text{Total} = \text{Saldo Devedor Principal} + \sum \text{Juros Contratados de Todas as Parcelas Futuras}$$
  - Não há dedução proporcional nem abatimento de encargos futuros.

## Validação de Código
- Sempre que alterar fórmulas, execute `npm test` garantindo que os testes unitários em `tests/finance.test.ts` passam a 100%.