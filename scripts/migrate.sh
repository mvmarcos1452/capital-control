#!/usr/bin/env bash
# ==============================================================================
# Script de Migração Supabase / PostgreSQL para Produção / Coolify
# Uso: ./scripts/migrate.sh ou bash scripts/migrate.sh
# ==============================================================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Executando Migrações no Banco de Dados (Supabase)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Carrega variáveis do ficheiro .env se presente
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  Aviso: DATABASE_URL não definida."
  echo "Verifique o ficheiro .env ou execute via bun run scripts/migrate.ts"
  bun run scripts/migrate.ts
  exit 0
fi

echo "Executando via Bun TypeScript Migration Runner..."
bun run scripts/migrate.ts
