import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { IWhatsAppProvider, MessageHandler } from './IWhatsAppProvider';

export class BaileysProvider implements IWhatsAppProvider {
  public name = 'Baileys-WebSocket';
  private sock: any = null;
  private messageHandlers: MessageHandler[] = [];
  private authFolderPath: string;

  constructor(customAuthFolder?: string) {
    // Persistência estrita em disco para não perder a sessão em reinicializações (Requisito 3)
    this.authFolderPath =
      customAuthFolder ||
      process.env.WHATSAPP_AUTH_FOLDER ||
      path.resolve(process.cwd(), 'auth_info_baileys');
  }

  public onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  public async sendMessage(toJid: string, text: string): Promise<void> {
    if (!this.sock) {
      throw new Error('Conexão Baileys não está ativa.');
    }
    const targetJid = toJid.includes('@') ? toJid : `${toJid}@s.whatsapp.net`;
    await this.sock.sendMessage(targetJid, { text });
  }

  public async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authFolderPath);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'warn' });

    this.sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    // Salva credenciais autenticadas no diretório persistente
    this.sock.ev.on('creds.update', saveCreds);

    // Evento de conexão e QR Code
    this.sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n[WhatsApp Bot] Escaneie o QR Code abaixo com seu WhatsApp:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(
          `[WhatsApp Bot] Conexão encerrada devido a: ${lastDisconnect?.error}. Reconectando? ${shouldReconnect}`
        );
        if (shouldReconnect) {
          setTimeout(() => this.start(), 3000);
        }
      } else if (connection === 'open') {
        console.log('[WhatsApp Bot] Conectado com sucesso via WebSocket! Pronto para comandos.');
      }
    });

    // Evento de recebimento de mensagens
    this.sock.ev.on('messages.upsert', async (m: any) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const remoteJid = msg.key.remoteJid || '';
        const isGroup = remoteJid.endsWith('@g.us');

        const messageText =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';

        if (messageText.trim().length > 0) {
          for (const handler of this.messageHandlers) {
            try {
              await handler(remoteJid, messageText.trim(), isGroup);
            } catch (err) {
              console.error('[WhatsApp Bot] Erro ao processar mensagem no handler:', err);
            }
          }
        }
      }
    });
  }

  public async stop(): Promise<void> {
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }
  }
}
