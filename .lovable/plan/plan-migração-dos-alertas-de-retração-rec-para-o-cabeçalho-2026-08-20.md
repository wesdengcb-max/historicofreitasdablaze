# Plan: Migração dos Alertas de Retração (REC) para o Cabeçalho

Este plano descreve a reestruturação visual dos alertas de retração ("possível rec"). As informações serão movidas dos cards individuais para o cabeçalho das seções do feed, mantendo a lógica de monitoramento temporal.

## Alterações

### 1. Motor Preditivo (PredictiveSignals.tsx)
- Identificar janelas de retração ativas no `useMemo` com base no histórico (`7-14`, `4-7`, `5-14`).
- Remover a prop `isRecAlert` da sincronização com o feed e da renderização interna dos cards.
- Adicionar um subtítulo dinâmico em cada cabeçalho de seção:
  - Texto: "⚠️ Possível REC ativo até às HH:MM"
  - Estilo: Amarelo/laranja neon, pulsante, caixa baixa.

### 2. Interface do Feed (SinaisSection.tsx)
- Remover a exibição do badge "possível rec" nos cards do feed manual.
- Garantir que a lógica de "REC" não polua mais o corpo do card.

### 3. Limpeza do Componente de Card (Card.tsx)
- Remover referências a `isRecAlert` ou badges relacionados à retração se existirem como props.

## Detalhes Técnicos
- **Fórmulas de Retração:**
  - 7-14 -> 14 min
  - 4-7 -> 9 min
  - 5-14 -> 14 min
- **Polling:** A interface atualizará o estado de visibilidade do alerta a cada atualização do motor (30s).

## Verificação
- Simular gatilhos de retração para validar o surgimento do subtítulo.
- Verificar o desaparecimento automático após o `HH:MM`.
- Confirmar a remoção visual nos cards.
