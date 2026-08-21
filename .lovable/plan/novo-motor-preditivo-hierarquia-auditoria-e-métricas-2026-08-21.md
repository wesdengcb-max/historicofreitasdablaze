# Novo Motor Preditivo: Hierarquia, Auditoria e Métricas

Implementação da estrutura de regras e auditoria solicitada para o motor de sinais e interface.

## User Review Required
> [!IMPORTANT]
> A auditoria exige uma nova tabela `trigger_audits` no banco de dados para persistência e geração de relatórios. Vou aplicar o SQL necessário.

- **Download de Relatórios**: O download será via CSV gerado no cliente (browser) para eficiência, respeitando os blocos de 4 horas.
- **Hierarquia de 4 Seções**: O feed será reordenado conforme as categorias (💎 Raros, 🎯 Isolados, ⚡ Top 5, 📊 Secundários).

## Proposed Changes

### Database & Backend
- Criar tabela `trigger_audits` para registro de disparos.
- Implementar política de RLS (Select público, Insert/Update/Delete bloqueado).
- Criar função SQL para limpeza automática de registros > 24h.

### Motor Preditivo (`src/lib/predictive.ts`)
- Padronizar graduação (Bronze a Supremo) baseada no `analysisCount`.
- Ajustar lógica de confluência para suportar a nova hierarquia (Top 1 vizinho/simultâneo).

### Interface (`src/components/double/PredictiveSignals.tsx`)
- Reorganizar as 4 seções conforme a nova ordem hierárquica.
- Implementar o 'Peak Rank Lock' para manter o maior nível atingido durante o polling.
- Adicionar indicadores de blocos de 4 horas nos cabeçalhos.
- Adicionar botão para download do relatório CSV.

### Auditoria e Feed (`src/components/sections/SinaisSection.tsx`)
- Integrar a nova lógica de auditoria (Win se Branco em T-1, T, T+1).
- Exibir alertas de retração ("Possível REC") nos cabeçalhos das seções.

## Technical Details
- **Tabela trigger_audits**: `id`, `gatilho`, `horario_alvo`, `horario_base`, `win`, `analysis_count`, `category`, `created_at`.
- **Blocos Fixos**: 00-04, 04-08, 08-12, 12-16, 16-20, 20-00.
- **CSV Format**: Colunas [Gatilho, Horário -1, Horário Alvo, Horário +1, Win, Categoria, Confluências].
