# Documentação Técnica: Arquitetura da Aba de Sinais

Este documento descreve o funcionamento interno do motor preditivo e do feed de sinais, abrangendo desde a coleta de dados até a auditoria automatizada.

## 1. Motor de Polling e Ciclo de Vida
O componente `PredictiveSignals.tsx` opera em um ciclo de atualização constante (aproximadamente a cada 30 segundos, sincronizado com novos resultados da Blaze).

### A. Frequência e Polling
- O motor consome a stream de resultados da tabela `blaze_results`.
- A cada atualização, o motor recalcula as projeções matemáticas baseadas em 7 análises principais (A1-A7) e gatilhos de confluência (Somas, Sequências).

### B. Peak Rank Lock
- **Definição:** Durante o ciclo de vida de um sinal (3 minutos), ele pode evoluir em força (análises simultâneas).
- **Funcionamento:** O sistema armazena o `peakAnalysisCount` (maior número de confluências atingido) no `peakStates` (Zustand/Local State).
- **Efeito:** Uma vez que um sinal atinge o nível "Ouro", ele nunca retrocede para "Prata" na interface, mesmo que os cálculos momentâneos variem, garantindo estabilidade visual para o usuário.

---

## 2. Agrupamento Hierárquico (4 Seções)
Os sinais são distribuídos em quatro blocos estritos de exclusividade:

1.  **💎 TOP 1 + CONFLUÊNCIA (SINAIS RAROS):** 
    - Gatilho: Dois ou mais sinais "Top 1" em horários vizinhos (±1 minuto).
2.  **🎯 TOP 1 ISOLADO:** 
    - Gatilho: Análise principal de maior assertividade sem apoio de confluências secundárias.
3.  **⚡️ TOP 1 + CONFLUÊNCIA TOP 5:** 
    - Gatilho: Um sinal Top 1 validado por uma ou mais análises secundárias (Top 2 ao Top 5).
4.  **📊 CONFLUÊNCIA TOP 5:** 
    - Gatilho: Apenas cruzamentos entre análises secundárias. **Regra Estrita:** Se um card possui qualquer propriedade de "Top 1", ele é excluído desta seção.

---

## 3. Graduação por Volume (Medalhas)
A força do sinal é representada por medalhas baseadas no `analysisCount`:
- **Bronze:** 2 Confluências
- **Prata:** 3 Confluências
- **Ouro:** 4 Confluências
- **Mestre:** 5 Confluências
- **Rei:** 6 Confluências
- **Supremo:** 7+ Confluências

---

## 4. Auditoria e Validação (trigger_audits)
Cada sinal gerado é registrado na tabela `trigger_audits` para transparência total.

### A. Ciclo de Auditoria
- **Nascimento:** O sinal nasce com status `PENDENTE`.
- **Janela de Validação (±1 min):** O motor verifica se a pedra Branca (0) aparece no minuto anterior, no minuto alvo ou no minuto posterior ao sinal.
- **Resultado:**
    - **WIN:** Se o 0 aparecer na janela.
    - **LOSS:** Se a janela fechar sem o 0.

### B. Expiração
- Sinais e gatilhos são mantidos na interface por 3 minutos após o horário alvo antes de serem movidos para o histórico/auditoria definitiva.

---

## 5. Métricas e Relatórios
### A. Blocos de 4 Horas
As métricas de assertividade são calculadas em blocos fixos:
`00-04h | 04-08h | 08-12h | 12-16h | 16-20h | 20-00h`
Isso permite ao usuário identificar janelas de maior performance do robô.

### B. Exportação CSV (24h)
- O usuário pode baixar o relatório técnico de todos os gatilhos disparados nas últimas 24 horas.
- A função `cleanup_audit_24h` no backend garante que dados antigos sejam limpos, mantendo a performance do banco de dados.
