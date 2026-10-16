# Changelog

## Entregas incrementais

### Fase 1 — em andamento

- Linha de base técnica registrada em `ROADMAP.md`.
- Acesso público direto ao Investigador de IOC, sem bloqueio de autenticação; rotas diretas preservadas.
- Classificação com score, confiança e cobertura separados. Ausência de reputação e falhas externas não geram risco baixo ou score zero.
- Validação estrita de IOC, corpo limitado, webhook Slack restrito, limites por endpoint, concorrência e cache de fontes. Limite distribuído opcional via Upstash Redis REST.
- Análise em lote, histórico e relatórios deixam de apresentar falhas como resultados benignos.
- A análise individual distingue visualmente erro de consulta de reputação; fallback e relatório HTML não aplicam cor de baixo risco a estados desconhecidos. A linha do tempo deixa de apresentar detecções atuais como se fossem da primeira observação.
- O health público reduz detalhes de falhas a estados seguros e reutiliza a verificação por 60 segundos por instância.
- MalwareBazaar usa Auth-Key no servidor, timeout e interpretação explícita da resposta; erro de autenticação ou protocolo não conta como hash ausente. O health usa um hash válido para verificar essa fonte.
- URLhaus considera `no_results` uma consulta negativa; erros retornados no corpo da API agora são falhas de fonte, inclusive no health.
- Diagnóstico da IA registra apenas categoria e código do erro do provedor, sem conteúdo de investigações ou credenciais, para apurar falhas de geração observadas no deploy público.
- O modelo Groq descontinuado foi substituído por `openai/gpt-oss-20b` nas análises individuais e do grafo, com saída JSON; o health agora confirma a disponibilidade do modelo configurado.
- O motor de risco exige sinal forte de fonte de reputação antes de classificar um IOC como malicioso; score alto apenas por sinais contextuais permanece suspeito.

### Fase 2 — concluída em 2026-10-16, com limitações no ROADMAP

- Grafo com simulação isolada em hook, atualização correta ao trocar entidades, seleção por teclado e detalhes em layout móvel.
- Cartões de fontes OSINT extraídos da investigação, tabelas com rolagem local e grades adaptadas para mobile; idade do domínio deixou de ser sinal verde de reputação.
- Preferências e seleção de relatórios extraídas para utilitários testáveis; seleção permanece estável ao reordenar observações.
- Threat Feed distingue indisponibilidade de lista/estatísticas de contagens reais, e a análise de phishing valida tamanho do arquivo e erros de leitura. Telas de Fontes, Grafo e Phishing receberam tradução e rótulos acessíveis.

- A análise em lote usa o serviço comum de enriquecimento, mantém erros sem score de risco, valida o cache local e bloqueia lotes acima de dez IOCs em vez de ignorar indicadores excedentes.
- A tela em lote foi traduzida, ganhou ordenação acessível por teclado, rótulos de filtros e ações, e informa falhas de armazenamento ou cópia.
- O painel lateral da investigação foi separado em componente próprio; notas e tags são carregadas por IOC sem exibir dados do indicador anterior, e a lista de consultas recentes agora aceita teclado.
- Campos e controles da investigação ganharam rótulos acessíveis e foco visível consistente.
- Sidebar reorganizada por área de trabalho, inteligência, ferramentas e sistema.
- Migração versionada do histórico para IndexedDB; registros antigos preservados e múltiplas observações do mesmo IOC suportadas.
- Histórico com exclusão seletiva, filtros e exportação CSV; relatórios JSON/CSV e impressão técnica para salvar como PDF com dados reais.
- Preferências simplificadas para estado verificável das fontes, backup local e notificação Slack já existente.
- Notas, tags e casos no IndexedDB; backup JSON versionado exporta e restaura observações, notas e casos sem substituir registros preexistentes.
- Retenção manual nas Preferências mostra quantos registros serão excluídos e preserva notas e casos; o fluxo exige confirmação explícita.
- Filtros do histórico persistem após recarregar a página; valores salvos são validados antes de uso.
- A análise individual apresenta todos os estados das fontes da coleta, traduz textos operacionais e usa o relatório técnico compartilhado para impressão individual.
- A abertura do IndexedDB agora tem limite de espera e fallback para a cópia local preservada quando outra aba bloqueia a atualização do banco.
- O checklist contextual passa a exigir revisão de falsos positivos, impacto e aprovação antes de qualquer contenção; marcações antigas permanecem preservadas sob a chave anterior.

### Fases 3 a 5 — incrementos parciais

- Análise Groq separa fatos gerados pelo backend de hipóteses do modelo e remove referências de evidência inexistentes.
- IOC Diff compara snapshots e trata falha de fonte como diferença de cobertura.
- Casos locais incluem IOCs, decisões e relações diretas comprovadas por URL ou Passive DNS.
- Grafo individual informa origem, campo, horário e confiança das arestas, com exportações JSON e SVG.
- Grafo do caso apresenta conexões verificadas, evidência por aresta, filtro de relacionamento, navegação por teclado e exportações JSON/SVG.
- Detection Studio gera buscas KQL, SPL e YARA-L Search e playbooks de investigação; pacote operacional JSON e impressão para PDF reúnem observação, histórico, nota, casos, relações, busca e playbook.
