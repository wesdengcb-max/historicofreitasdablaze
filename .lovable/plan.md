# Refatoração do Motor de Sinais: Confluência e Remoção de Selos

Refatoração do motor de geração de sinais para remover a interface de selos (Verde/Azul) e converter gatilhos secundários em camadas de confluência, permitindo "Super Sinais" apenas com 4+ confluências.

## Alterações no Backend (`src/lib/predictive.ts`)

- **Remoção de Selos**: Eliminar a função `buildSeloVerde` e referências a selos azul/verde.
- **Manutenção de Gatilhos**: Manter as funções de gatilho (A8, A9, 8-11, 11-11, etc.) pois elas serão usadas como camadas de confluência.
- **Simplificação de Tipos**: Remover propriedades `isSecondary` ou relacionadas a selos se não forem mais necessárias para a lógica de confluência.

## Alterações na Interface e Lógica de Disparo (`src/components/double/PredictiveSignals.tsx`)

- **Filtro de Exibição**:
    - Gatilhos secundários (A8, A9, 8-11, 11-11, 4-11, 4-14, 14-4, somas 17, 19, 21, 7-11) deixam de gerar cards isolados.
    - Esses gatilhos agora apenas incrementam o `analysisCount` (confluência) de sinais das Análises Principais (A1-A7) existentes no mesmo minuto.
- **Regra do Super Sinal**:
    - Se a soma de gatilhos secundários/somas para um minuto for **4 ou mais**, um novo card de "Super Sinal" é gerado.
    - Se houver menos de 4 confluências e nenhuma Análise Principal (A1-A7) para o minuto, o sinal não é exibido.
- **Limpeza de UI**:
    - Remover badges "SELO AZUL", "SELADO", "Selo Verde", etc.
    - Manter e reforçar badges de "RARO" ou "Alta Confluência" para sinais com `analysisCount >= 4`.
    - Ajustar a função `getMedalStyles` para refletir a nova hierarquia baseada em confluências.

## Detalhes Técnicos
- Refatorar o loop de geração de `Mode1Signal` para separar Análises Principais de Gatilhos de Confluência.
- Implementar contador de confluências por minuto.
- Remover estados e props `isGreenSeal`, `greenSealAssertivity`, `isVerified` (Azul) do tipo `Mode1Signal` e `Mode2Signal`.
