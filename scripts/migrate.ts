import fs from 'fs';
import path from 'path';

/**
 * Script Utilitário para Teste de Conexão e Execução de Migrações Supabase / PostgreSQL
 * Execução: bun run scripts/migrate.ts
 */
async function runMigrations() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 Supabase / PostgreSQL Migration Runner - Capital Control');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log(`🔍 Supabase URL: ${supabaseUrl || '(não configurada)'}`);
  console.log(`🔍 Database URL: ${databaseUrl ? databaseUrl.replace(/:([^:@]+)@/, ':****@') : '(não configurada)'}`);

  const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Diretório de migrações não encontrado: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`📁 Ficheiros de migração encontrados (${files.length}):`);
  files.forEach((f) => console.log(`   - ${f}`));

  if (!databaseUrl) {
    console.log('\n⚠️  DATABASE_URL não está configurada no ambiente.');
    console.log('💡 Para aplicar via Supabase Studio (Interface Web no Coolify):');
    console.log('   1. Abra o Supabase Studio em sua URL interna/pública.');
    console.log('   2. Acesse a aba "SQL Editor".');
    console.log('   3. Cole e execute o conteúdo dos ficheiros em ordem:\n');
    files.forEach((f) => {
      console.log(`      * supabase/migrations/${f}`);
    });
    console.log('\n💡 Para aplicar via CLI com DATABASE_URL, defina no .env:');
    console.log('   DATABASE_URL=postgresql://postgres:[SENHA]@[HOST]:[PORTA]/postgres\n');
    return;
  }

  try {
    console.log('\n🔌 Testando conexão direta com o PostgreSQL...');
    const sql = new Bun.SQL({ url: databaseUrl });

    // Testa consulta simples
    const versionRes: any = await sql.unsafe('SELECT version();');
    console.log(`✅ Conexão estabelecida com sucesso!`);
    if (versionRes && versionRes[0]) {
      console.log(`   Versão: ${versionRes[0].version.slice(0, 50)}...`);
    }

    console.log('\n🚀 Iniciando aplicação de migrações em lote...');

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`\n⏳ Aplicando: ${file}...`);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      try {
        await sql.unsafe(sqlContent);
        console.log(`   ✅ Sucesso: ${file} executado.`);
      } catch (err: any) {
        console.error(`   ❌ Erro ao aplicar ${file}:`, err.message);
        throw err;
      }
    }

    console.log('\n✨ Todas as migrações foram aplicadas com sucesso no banco de dados!');

    // Validação da função RPC
    const checkRpc: any = await sql.unsafe(
      "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'process_loan_payment';"
    );

    if (checkRpc && checkRpc.length > 0) {
      console.log('✅ Função RPC atómica "process_loan_payment" confirmada no schema público.');
    }

    await sql.close();
  } catch (err: any) {
    console.error('\n❌ Falha na conexão ou execução:', err.message);
    console.log('\n💡 Dica de Configuração:');
    console.log('   - Certifique-se de que o container do PostgreSQL/Supabase no Coolify está ativo.');
    console.log('   - Se o Coolify estiver na mesma rede Docker, use a URL da rede interna (ex: postgresql://postgres:senha@supabase-db:5432/postgres).');
    console.log('   - Ou aplique os scripts manualmente no SQL Editor do Supabase Studio.');
    process.exit(1);
  }
}

runMigrations().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
