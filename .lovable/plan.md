# Plano de Atualização Premium e Funcionalidades VIP

Melhorar a estética da interface VIP para um padrão "Premium", adicionar exibição de dias restantes para membros e implementar o botão de logout na sidebar/header.

## Alterações Visuais (Premium)
- **VipModal.tsx**: Redesenhar o card de status VIP com acabamento em vidro (glassmorphism), bordas neon sutis e tipografia refinada.
- **AppHeader.tsx**: Ajustar o badge VIP no cabeçalho para refletir o status de forma mais elegante.
- **Sidebar.tsx**: Refinar os ícones e estados ativos para manter a consistência visual.

## Novas Funcionalidades
- **Cálculo de Dias Restantes**:
  - Atualizar `vipStore.ts` para persistir a data de expiração.
  - Modificar `VipModal.tsx` para calcular e exibir a contagem regressiva de dias.
  - Exibir "Acesso Vitalício" se não houver data de expiração.
- **Fluxo de Logout**:
  - Garantir que o botão de logout limpe completamente o estado do `vipStore` e redirecione para a Home.
  - Adicionar o botão de logout na sidebar para facilitar o acesso.

## Detalhes Técnicos
- Utilizar a biblioteca `date-fns` ou lógica nativa de `Date` para o cálculo de diferença de dias.
- Sincronizar o `localStorage` com o `vipStore` para garantir que a data de expiração esteja sempre disponível no cliente após a validação inicial do token.
- Aplicar classes Tailwind de `backdrop-blur`, `bg-opacity` e `border-white/10` para o efeito premium.
