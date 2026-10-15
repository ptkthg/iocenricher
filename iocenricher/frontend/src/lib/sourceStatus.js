import { C } from './theme';

const states = {
  ok: { label: 'Consultada', color: C.green },
  online: { label: 'Disponível na verificação', color: C.green },
  no_match: { label: 'Sem correspondência', color: C.textMuted },
  not_configured: { label: 'Chave não configurada', color: C.yellow },
  auth_error: { label: 'Falha de autenticação', color: C.yellow },
  model_unavailable: { label: 'Modelo de IA indisponível', color: C.yellow },
  rate_limited: { label: 'Limite da fonte atingido', color: C.yellow },
  unavailable: { label: 'Indisponível', color: C.red },
  offline: { label: 'Indisponível na verificação', color: C.red },
  skipped: { label: 'Não consultada', color: C.textMuted },
};

export const sourceStatusView = status => states[status] || { label: 'Estado desconhecido', color: C.textMuted };
