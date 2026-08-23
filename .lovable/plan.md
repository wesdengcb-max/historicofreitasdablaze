# Plano de Reestruturação do Modo VIP

Implementar o Modo VIP como um recurso ativável/desativável globalmente, permitindo acesso público à Home Page e protegendo funcionalidades específicas com uma sessão persistente via Token VIP.

## Mudanças no Frontend

### Componentes
- **VipModal**: Novo componente modal para entrada e exibição do Token VIP.
- **AppHeader**: Atualizar o botão VIP para abrir o modal em vez de ser um simples indicador.

### Estado e Lógica
- **Persistência**: Garantir que o token e o status VIP sejam salvos no `localStorage` e propagados para a `vipStore`.
- **Navegação**: Ajustar as rotas para permitir acesso público à Home e usar o modal para ativação VIP em vez de redirecionamentos forçados (exceto em áreas estritamente VIP como /admin).

## Mudanças no Backend

### Server Functions
- **validateToken**: Garantir que a validação seja pública (sem middleware de auth) para permitir a ativação por visitantes.

### Segurança
- **RLS**: Manter as políticas de segurança onde apenas tokens ativos e válidos podem ler dados sensíveis se necessário, mas permitindo a leitura pública do histórico base conforme as regras atuais.

## Detalhes Técnicos
- O modal será disparado por um evento customizado `open-vip-modal`.
- A sessão VIP será validada no carregamento inicial para manter o estado ativo entre visitas.
- O botão "SAIR DO MODO VIP" limpará o `localStorage` e resetará a `vipStore`.
