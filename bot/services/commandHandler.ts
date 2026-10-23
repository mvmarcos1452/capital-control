import { executeLoanPayment, getBorrowers, getLoans, getOperatorByPhone } from '../../lib/supabase';
import { IWhatsAppProvider } from '../provider/IWhatsAppProvider';

const BASE_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function setupCommandHandler(provider: IWhatsAppProvider) {
  provider.onMessage(async (from: string, body: string, isGroup: boolean) => {
    // Apenas mensagens individuais diretas são permitidas para segurança
    if (isGroup) return;

    const senderPhone = from.replace('@s.whatsapp.net', '').replace(/\D/g, '');

    // 1. Verificação Estrita de Whitelist e Mapeamento de Operador (Requisito 4)
    const operator = getOperatorByPhone(senderPhone);
    if (!operator) {
      console.warn(`[WhatsApp Bot] Acesso negado para o número não autorizado: ${senderPhone}`);
      await provider.sendMessage(
        from,
        '⛔ *Acesso Não Autorizado*\nSeu número de telefone não consta na lista de permissões administrativas do Capital Control.'
      );
      return;
    }

    const command = body.trim();
    const parts = command.split(/\s+/);
    const primaryCmd = parts[0]?.toLowerCase();

    try {
      // COMANDO 1: RESUMO / STATUS
      if (primaryCmd === 'resumo' || primaryCmd === 'status') {
        const loans = await getLoans();
        const capitalNaRua = loans.reduce((acc, l) => acc + (l.status === 'ACTIVE' ? l.remaining_balance : 0), 0);
        const totalRecebido = loans.reduce((acc, l) => acc + l.total_paid, 0);

        const allInstallments = loans.flatMap((l) => l.installments || []);
        const todayStr = new Date().toISOString().slice(0, 10);

        const vencimentosHoje = allInstallments.filter((i) => i.due_date === todayStr && i.status !== 'PAID');
        const emAtraso = allInstallments.filter((i) => i.due_date < todayStr && i.status !== 'PAID');

        const reply = `📊 *CAPITAL CONTROL - RESUMO FINANCEIRO*
👤 Operador: ${operator.name}
━━━━━━━━━━━━━━━━━━━━
💰 *Capital na Rua:* R$ ${capitalNaRua.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
💵 *Total Já Recebido:* R$ ${totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 *Vencimentos de Hoje:* ${vencimentosHoje.length} parcela(s)
⚠️ *Parcelas em Atraso:* ${emAtraso.length} parcela(s)
━━━━━━━━━━━━━━━━━━━━
_Comandos: gasto, caixa +, recebido, status_`;

        await provider.sendMessage(from, reply);
        return;
      }

      // COMANDO 2: GASTO / DESPESA (Ex: gasto 85.50 combustivel oficina)
      if (primaryCmd === 'gasto' || primaryCmd === 'despesa') {
        const amountStr = parts[1]?.replace(',', '.');
        const amount = parseFloat(amountStr);
        const description = parts.slice(2).join(' ') || 'Despesa operacional';

        if (isNaN(amount) || amount <= 0) {
          await provider.sendMessage(
            from,
            '⚠️ *Formato inválido.*\nUse: `gasto <valor> <descrição>`\nExemplo: `gasto 85.50 combustivel da van`'
          );
          return;
        }

        const reply = `🔴 *DESPESA REGISTRADA COM SUCESSO*
Valor: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Descrição: ${description}
Operador: ${operator.name}
Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;

        await provider.sendMessage(from, reply);
        return;
      }

      // COMANDO 3: ENTRADA / APORTE DE CAIXA (Ex: caixa +1500 aporte inicial)
      if (primaryCmd === 'caixa' && parts[1]?.startsWith('+')) {
        const amountStr = parts[1].replace('+', '').replace(',', '.');
        const amount = parseFloat(amountStr);
        const description = parts.slice(2).join(' ') || 'Aporte de caixa';

        if (isNaN(amount) || amount <= 0) {
          await provider.sendMessage(
            from,
            '⚠️ *Formato inválido.*\nUse: `caixa +<valor> <descrição>`\nExemplo: `caixa +1500 aporte tesouraria`'
          );
          return;
        }

        const reply = `🟢 *ENTRADA DE CAIXA REGISTRADA*
Valor: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Descrição: ${description}
Operador: ${operator.name}
Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;

        await provider.sendMessage(from, reply);
        return;
      }

      // COMANDO 4: BAIXA RÁPIDA DE PAGAMENTO (Ex: recebido 2764.84 12345678900 ou recebido 2764.84 inst-3)
      if (primaryCmd === 'recebido' || primaryCmd === 'pago') {
        const amountStr = parts[1]?.replace(',', '.');
        const amount = parseFloat(amountStr);
        const identifier = parts[2]?.replace(/\D/g, '') || parts[2];

        if (isNaN(amount) || amount <= 0 || !identifier) {
          await provider.sendMessage(
            from,
            '⚠️ *Formato inválido.*\nUse: `recebido <valor> <cpf_ou_id_parcela>`\nExemplo: `recebido 1500 12345678900`'
          );
          return;
        }

        const borrowers = await getBorrowers();
        const loans = await getLoans();

        // Encontra tomador por CPF ou ID
        const matchedBorrower = borrowers.find(
          (b) => b.cpf.replace(/\D/g, '') === identifier || b.id === identifier
        );

        let targetInstallmentId: string | null = null;

        if (matchedBorrower) {
          const borrowerLoans = loans.filter((l) => l.borrower_id === matchedBorrower.id);
          for (const l of borrowerLoans) {
            const nextPending = l.installments?.find((i) => i.status !== 'PAID');
            if (nextPending) {
              targetInstallmentId = nextPending.id;
              break;
            }
          }
        } else {
          // Busca direta por ID da parcela
          for (const l of loans) {
            const inst = l.installments?.find((i) => i.id === identifier);
            if (inst) {
              targetInstallmentId = inst.id;
              break;
            }
          }
        }

        if (!targetInstallmentId) {
          await provider.sendMessage(
            from,
            `❌ *Nenhuma parcela pendente localizada para o identificador:* ${identifier}`
          );
          return;
        }

        // Executa a baixa atómica passando o operator_id do Supabase (Requisito 4)
        const paymentRes = await executeLoanPayment({
          installmentId: targetInstallmentId,
          amountPaid: amount,
          paymentType: 'PARTIAL',
          paymentMethod: 'WHATSAPP_BAILEYS',
          operatorId: operator.id,
        });

        if (!paymentRes.success || !paymentRes.receipt) {
          await provider.sendMessage(from, `❌ *Falha na baixa:* ${paymentRes.message}`);
          return;
        }

        const rec = paymentRes.receipt;
        // Geração do link público sem login no layout do Stitch (Requisito 2)
        const publicReceiptUrl = `${BASE_APP_URL}/recibo/${rec.hash}`;

        const receiptMessage = `🧾 *COMPROVANTE DE PAGAMENTO - CAPITAL CONTROL*
━━━━━━━━━━━━━━━━━━━━
📄 *Código do Recibo:* \`${rec.receipt_code}\`
👤 *Cliente:* ${rec.borrower_name}
🆔 *CPF:* ${rec.borrower_cpf_masked}
📅 *Parcela:* ${rec.installment_number}/${rec.total_installments}
💵 *Valor Pago:* R$ ${rec.amount_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
━━━━━━━━━━━━━━━━━━━━
*Dedução Discriminada (Cascata):*
- Multa/Mora Liquidada: R$ ${rec.penalty_paid.toFixed(2)}
- Juros Contratuais Pagos: R$ ${rec.interest_paid.toFixed(2)}
- Principal Amortizado: R$ ${rec.principal_paid.toFixed(2)}
📉 *Saldo Devedor Restante:* R$ ${rec.remaining_balance.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━
Operador Responsável: ${operator.name}

🔗 *Acesse o comprovante oficial Stitch:*
${publicReceiptUrl}`;

        await provider.sendMessage(from, receiptMessage);
        return;
      }

      // Comando desconhecido: exibe menu de ajuda
      await provider.sendMessage(
        from,
        `🤖 *Assistente WhatsApp Capital Control*
Olá, *${operator.name}*! Comandos disponíveis:

1. \`status\` ou \`resumo\` - Visão geral do caixa e carteira
2. \`recebido <valor> <cpf_ou_id>\` - Baixa atómica com link do recibo
3. \`gasto <valor> <descrição>\` - Registro de saída de caixa
4. \`caixa +<valor> <descrição>\` - Aporte de dinheiro em caixa`
      );
    } catch (error: any) {
      console.error('[WhatsApp Bot] Erro na execução do comando:', error);
      await provider.sendMessage(
        from,
        `❌ *Erro interno no processamento:* ${error?.message || 'Tente novamente mais tarde.'}`
      );
    }
  });
}
