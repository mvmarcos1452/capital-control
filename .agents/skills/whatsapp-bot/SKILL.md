---
name: whatsapp-bot
description: Desenho e comandos do bot de WhatsApp para lançamento de despesas, entradas de caixa, baixas rápidas e envio de recibos. Focado em consumo mínimo de memória RAM no servidor.
---

# WhatsApp Bot Skill

Esta competência define o funcionamento do bot de mensageria integrado ao fluxo financeiro do Capital Control.

## Restrições de Infraestrutura (8GB RAM com Coolify)

1. **Stack Recomendada**:
   - **Opção A (Ideal)**: Webhook com a Meta Cloud API Oficial (0 MB de RAM extra no servidor).
   - **Opção B (Self-hosted leve)**: Baileys via WebSocket puro em Node.js/TypeScript (consumo estável de ~80-120 MB).
   - **PROIBIDO**: Bibliotecas baseadas em Chromium/Puppeteer (como `whatsapp-web.js`), que consomem mais de 1GB por instância.

## Comandos Suportados

- **Lançamento de Despesa**:
  - Sintaxe: `gasto <valor> <descrição>` (Ex.: `gasto 85.50 combustivel oficina`)
  - Ação: Regista saída em `cash_flow` e devolve o saldo atualizado de caixa.
- **Entrada / Aporte de Caixa**:
  - Sintaxe: `caixa +<valor> <descrição>` (Ex.: `caixa +1500 aporte inicial`)
  - Ação: Regista entrada em `cash_flow`.
- **Resumo de Indicadores**:
  - Sintaxe: `resumo` ou `status`
  - Resposta: Devolve Capital na Rua, Saldo em Caixa, Vencimentos do Dia e Parcelas em Atraso.
- **Registo de Pagamento Rápido**:
  - Sintaxe: `recebido <valor> <cpf_ou_id_parcela>`
  - Ação: Efetua a baixa atómica e devolve o texto do comprovativo com o código de validação.

## Segurança

- Lista de permissões (*whitelist*) estrita por número de telefone. Comandos de escrita ou consulta só são executados se o número do remetente coincidir com o administrador autorizado.