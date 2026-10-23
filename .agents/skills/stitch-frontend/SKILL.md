---
name: stitch-frontend
description: Converte os templates HTML/Tailwind do Stitch para componentes React/Next.js no Capital Control, mantendo fidelidade visual, responsividade e componentes de comprovativo. Utilize ao criar ou ajustar ecrãs, dashboards e componentes visuais.
---

# Stitch Frontend Skill

Esta competência orienta a conversão dos esquemas visuais do Stitch para componentes Next.js (App Router, Tailwind CSS, Lucide Icons).

## Diretrizes de Implementação

1. **Fidelidade Visual e Tailwind**:
   - Inspecione os ficheiros HTML em `.agents/skills/stitch-frontend/references/` antes de codificar.
   - Preserve a paleta de cores, tipografia, raios de curvatura (`rounded-*`) e hierarquia visual das referências.
   - Utilize a biblioteca de ícones `lucide-react` para todos os elementos visuais interativos.

2. **Componentes Obrigatórios do Módulo de Empréstimos**:
   - **Dashboard Principal**: Cartões com métricas atómicas (*Capital na Rua*, *Dinheiro em Caixa*, *Total a Receber*, *Juros Recebidos*).
   - **Formulário de Contrato**:
     - Seletor de modalidade de cálculo: Por Parcela, Sobre o Total, Juros Compostos, Tabela Price e Tabela SAC.
     - Seletor de ajuste de calendário (Manter corrido / Empurrar para o próximo dia útil / Antecipar em feriados e fins de semana).
     - Campo de busca e cadastro de cliente (Nome, CPF, Endereço, Telefone) com exibição da etiqueta de reputação (*Bom Pagador*, *Atrasos Frequentes*, *Inadimplente*).
   - **Tabela de Cronograma**: Exibição detalhada de parcelas, estado de pagamento, amortização, juros, multas acumuladas e ações rápidas.
   - **Modal de Baixa de Pagamento**: Opções para pagamento total da parcela, pagamento parcial, pagamento apenas de juros (rolagem de principal) e quitação antecipada integral (sem desconto de juros).
   - **Aba/Modal de Emissão de Comprovativo**:
     - Visual formal e profissional com identificador único, CPF mascarado (`***.123.456-**`), data/hora, discriminativo de valores e saldo devedor restante.
     - Botões para impressão, exportação em imagem/PDF e partilha direta para o WhatsApp.

3. **Boas Práticas de Código**:
   - Isole o estado das calculadoras em *custom hooks* (`useLoanCalculator`).
   - Mantenha a renderização otimizada para evitar re-renderizações desnecessárias em tabelas longas de amortização.