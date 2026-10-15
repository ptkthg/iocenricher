export function buildPlaybook(observation) {
  if (!observation) return [];
  const type = observation.type;
  const coverage = observation.risk?.coverage;
  const uncertain = observation.query_status === 'error' || !coverage?.successful;
  const scope = type === 'ip' ? 'fluxos de rede' : type === 'hash' ? 'arquivos e processos' : 'requisições DNS, proxy e web';
  return [
    { title: 'Confirmar a coleta', objective: 'Revisar classificação, confiança e cobertura das fontes.', prerequisite: 'Snapshot da análise disponível.', expected: 'Status e timestamps de cada fonte, com falhas registradas.', done: 'Evidências confirmadas separadas de fontes indisponíveis.' },
    { title: `Buscar ${scope}`, objective: `Localizar eventos ligados ao IOC em ${scope}.`, prerequisite: 'Acesso autorizado a SIEM ou XDR e janela temporal definida.', expected: 'Eventos com host, usuário, horário e campo que correspondeu ao IOC.', done: 'Ocorrências relevantes documentadas ou ausência de telemetria declarada.' },
    { title: 'Investigar indicadores relacionados', objective: 'Verificar relações sustentadas por DNS, certificados ou amostras.', prerequisite: 'Resultados das fontes e permissões de consulta.', expected: 'Cada relação com fonte, horário e tipo de associação.', done: 'Relações não verificadas marcadas como hipótese.' },
    { title: 'Verificar falsos positivos', objective: 'Confrontar reputação com contexto operacional e ativos próprios.', prerequisite: 'Inventário de ativos e responsáveis pelo serviço.', expected: 'Uso legítimo conhecido, exceções e divergências entre fontes.', done: 'Contexto revisado antes de recomendar contenção.' },
    ...(uncertain ? [{ title: 'Repetir fontes indisponíveis', objective: 'Obter cobertura suficiente antes de classificar.', prerequisite: 'Limites das APIs disponíveis.', expected: 'Nova observação com status de fonte verificável.', done: 'Falhas e diferenças entre coletas registradas.' }] : []),
    { title: 'Avaliar impacto e resposta', objective: 'Determinar alcance e necessidade de contenção.', prerequisite: 'Evidências de atividade no ambiente e aprovação operacional.', expected: 'Ativos afetados, cronologia e justificativa da decisão.', done: 'Decisão documentada; nenhuma ação administrativa é executada pelo IOC Enricher.' },
    { title: 'Encerrar e documentar', objective: 'Registrar conclusão, lacunas e próximos acompanhamentos.', prerequisite: 'Coleta e revisão pelo analista.', expected: 'Caso e relatório técnico com evidências e limitações.', done: 'Conclusão revisável por outro analista.' },
  ];
}
