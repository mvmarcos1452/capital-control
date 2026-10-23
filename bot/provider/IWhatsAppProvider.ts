export interface MessageHandler {
  (from: string, body: string, isGroup: boolean): Promise<void>;
}

export interface IWhatsAppProvider {
  name: string;
  start(): Promise<void>;
  sendMessage(toJid: string, text: string): Promise<void>;
  onMessage(handler: MessageHandler): void;
  stop?(): Promise<void>;
}
