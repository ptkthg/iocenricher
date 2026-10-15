# Changelog

## Não publicado

### Fase 1 — em andamento

- Linha de base técnica registrada em `ROADMAP.md`.
- Acesso público direto ao Investigador de IOC, sem bloqueio de autenticação; rotas diretas preservadas.
- Classificação com score, confiança e cobertura separados. Ausência de reputação e falhas externas não geram risco baixo ou score zero.
- Validação estrita de IOC, corpo limitado, webhook Slack restrito, limites por endpoint, concorrência e cache de fontes. Limite distribuído opcional via Upstash Redis REST.
- Análise em lote, histórico e relatórios deixam de apresentar falhas como resultados benignos.

### Fase 2 — em andamento

- Sidebar reorganizada por área de trabalho, inteligência, ferramentas e sistema.
- Migração versionada do histórico para IndexedDB; registros antigos preservados e múltiplas observações do mesmo IOC suportadas.
- Histórico com exclusão seletiva, filtros e exportação CSV; relatórios JSON/CSV e impressão técnica para salvar como PDF com dados reais.
- Preferências simplificadas para estado verificável das fontes, backup local e notificação Slack já existente.
