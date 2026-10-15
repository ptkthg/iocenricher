# Changelog

## Não publicado

### Fase 1 — em andamento

- Linha de base técnica registrada em `ROADMAP.md`.
- Acesso público direto ao Investigador de IOC, sem bloqueio de autenticação; rotas diretas preservadas.
- Classificação com score, confiança e cobertura separados. Ausência de reputação e falhas externas não geram risco baixo ou score zero.
- Validação estrita de IOC, corpo limitado, webhook Slack restrito, limites por endpoint, concorrência e cache de fontes. Limite distribuído opcional via Upstash Redis REST.
- Análise em lote, histórico e relatórios deixam de apresentar falhas como resultados benignos.
- A análise individual distingue visualmente erro de consulta de reputação; fallback e relatório HTML não aplicam cor de baixo risco a estados desconhecidos. A linha do tempo deixa de apresentar detecções atuais como se fossem da primeira observação.

### Fase 2 — em andamento

- Sidebar reorganizada por área de trabalho, inteligência, ferramentas e sistema.
- Migração versionada do histórico para IndexedDB; registros antigos preservados e múltiplas observações do mesmo IOC suportadas.
- Histórico com exclusão seletiva, filtros e exportação CSV; relatórios JSON/CSV e impressão técnica para salvar como PDF com dados reais.
- Preferências simplificadas para estado verificável das fontes, backup local e notificação Slack já existente.
- Notas, tags e casos no IndexedDB; backup JSON versionado exporta e restaura observações, notas e casos sem substituir registros preexistentes.
- Retenção manual nas Preferências mostra quantos registros serão excluídos e preserva notas e casos; o fluxo exige confirmação explícita.
- Filtros do histórico persistem após recarregar a página; valores salvos são validados antes de uso.

### Fases 3 a 5 — incrementos parciais

- Análise Groq separa fatos gerados pelo backend de hipóteses do modelo e remove referências de evidência inexistentes.
- IOC Diff compara snapshots e trata falha de fonte como diferença de cobertura.
- Casos locais incluem IOCs, decisões e relações diretas comprovadas por URL ou Passive DNS.
- Grafo individual informa origem, campo, horário e confiança das arestas, com exportações JSON e SVG.
- Grafo do caso apresenta conexões verificadas, evidência por aresta, filtro de relacionamento, navegação por teclado e exportações JSON/SVG.
- Detection Studio gera buscas KQL, SPL e YARA-L Search e playbooks de investigação; pacote operacional JSON e impressão para PDF reúnem observação, histórico, nota, casos, relações, busca e playbook.
