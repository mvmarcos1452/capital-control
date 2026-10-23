import { describe, expect, it } from 'bun:test';
import { IWhatsAppProvider, MessageHandler } from '../bot/provider/IWhatsAppProvider';
import { setupCommandHandler } from '../bot/services/commandHandler';
import { getOperatorByPhone, getReceiptByHash, operatorWhitelistMap } from '../lib/supabase';

class MockWhatsAppProvider implements IWhatsAppProvider {
  public name = 'Mock';
  public sentMessages: { to: string; text: string }[] = [];
  private handlers: MessageHandler[] = [];

  public onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  public async sendMessage(toJid: string, text: string): Promise<void> {
    this.sentMessages.push({ to: toJid, text });
  }

  public async start(): Promise<void> {}

  public async simulateIncomingMessage(from: string, body: string, isGroup = false): Promise<void> {
    for (const h of this.handlers) {
      await h(from, body, isGroup);
    }
  }
}

describe('WhatsApp Bot & Whitelist Operator Mapping', () => {
  it('should map whitelisted phone numbers to operator_id in Supabase', () => {
    const operator = getOperatorByPhone('5511999999999');
    expect(operator).not.toBeNull();
    expect(operator?.id).toBe('00000000-0000-0000-0000-000000000001');
    expect(operator?.name).toBe('Operador Geral Capital Control');

    // Número não cadastrado na whitelist
    const unknownOp = getOperatorByPhone('5511911112222');
    expect(unknownOp).toBeNull();
  });

  it('should dynamically resolve operators configured in WHATSAPP_ADMIN_WHITELIST env', () => {
    process.env.WHATSAPP_ADMIN_WHITELIST = '5511944443333, 5521955554444';
    process.env.DEFAULT_OPERATOR_ID = '00000000-0000-0000-0000-000000000099';

    const op = getOperatorByPhone('5511944443333');
    expect(op).not.toBeNull();
    expect(op?.id).toBe('00000000-0000-0000-0000-000000000099');
    expect(op?.role).toBe('ADMIN');
  });

  it('should reject commands from non-whitelisted senders', async () => {
    const provider = new MockWhatsAppProvider();
    await setupCommandHandler(provider);

    await provider.simulateIncomingMessage('5511911112222@s.whatsapp.net', 'status');

    expect(provider.sentMessages).toHaveLength(1);
    expect(provider.sentMessages[0].text).toContain('Acesso Não Autorizado');
  });

  it('should process resumo/status command for authorized operators', async () => {
    const provider = new MockWhatsAppProvider();
    await setupCommandHandler(provider);

    await provider.simulateIncomingMessage('5511999999999@s.whatsapp.net', 'resumo');

    expect(provider.sentMessages).toHaveLength(1);
    expect(provider.sentMessages[0].text).toContain('CAPITAL CONTROL - RESUMO FINANCEIRO');
    expect(provider.sentMessages[0].text).toContain('Capital na Rua');
  });

  it('should process expense (gasto) command', async () => {
    const provider = new MockWhatsAppProvider();
    await setupCommandHandler(provider);

    await provider.simulateIncomingMessage('5511999999999@s.whatsapp.net', 'gasto 75.00 cartorio');

    expect(provider.sentMessages).toHaveLength(1);
    expect(provider.sentMessages[0].text).toContain('DESPESA REGISTRADA COM SUCESSO');
    expect(provider.sentMessages[0].text).toContain('75,00');
  });

  it('should process payment command (recebido) and return public receipt link', async () => {
    const provider = new MockWhatsAppProvider();
    await setupCommandHandler(provider);

    // Baixa de R$ 1.000,00 para o tomador CPF 12345678900
    await provider.simulateIncomingMessage(
      '5511999999999@s.whatsapp.net',
      'recebido 1000 12345678900'
    );

    expect(provider.sentMessages).toHaveLength(1);
    const reply = provider.sentMessages[0].text;
    expect(reply).toContain('COMPROVANTE DE PAGAMENTO');
    expect(reply).toContain('REC-');
    expect(reply).toContain('/recibo/');

    // Extrai o hash público retornado na mensagem
    const match = reply.match(/\/recibo\/(hash-[^\s\n]+)/);
    expect(match).not.toBeNull();
    const hash = match![1];

    // Verifica que a rota pública /recibo/[hash] consegue localizar o recibo sem login
    const receipt = await getReceiptByHash(hash);
    expect(receipt).not.toBeNull();
    expect(receipt?.borrower_name).toBe('Ricardo Silveira Albuquerque');
    expect(receipt?.amount_paid).toBe(1000);
  });
});
