import { BaileysProvider } from './provider/BaileysProvider';
import { setupCommandHandler } from './services/commandHandler';

async function bootstrap() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 Inicializando Capital Control - Bot WhatsApp Leve');
  console.log('⚙️  Stack: Baileys WebSocket puro (~80-120 MB RAM)');
  console.log('📁 Sessão persistente em: ./auth_info_baileys');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const provider = new BaileysProvider();
  await setupCommandHandler(provider);
  await provider.start();
}

bootstrap().catch((err) => {
  console.error('Falha crítica ao iniciar o Bot de WhatsApp:', err);
  process.exit(1);
});
