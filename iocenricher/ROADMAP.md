# Evolução do IOC Enricher

Branch de desenvolvimento: `roadmap/phase1-public-access`. Em 2026-10-15, o usuário autorizou publicar o progresso no GitHub e no site conforme cada incremento for validado.

## Linha de base — 2026-10-14

- Git: `main` limpo no commit `6748527` antes da criação da branch.
- Backend: 3 testes existentes passaram (`npm test`).
- Frontend: `npm run build` passou.
- Persistência atual: `localStorage` (`iocenricher_history`, notas e preferências); nenhum dado local foi removido.
- Problemas confirmados: login obrigatório; análise em lote classifica erro como `BAIXO`; limites de API somente em memória; webhook arbitrário na rota Slack; validação de IOC permissiva; score zero usado em consultas sem cobertura.

## Progresso

| Fase | Estado | Evidência e pendências |
| --- | --- | --- |
| 1. Acesso público, segurança e estabilidade | Parcialmente concluída | Login removido; consultas individuais e em lote distinguem falha de baixo risco; validação, SSRF, cache, concorrência e limites implementados. Status público das fontes não devolve detalhes internos de erro e usa cache de 60 s. Sinais contextuais isolados não bastam para classificação maliciosa. Limite distribuído preparado, mas sem Upstash configurado. |
| 2. Arquitetura e UX | Concluída com limitações registradas | Navegação agrupada; histórico/notas/casos no IndexedDB com migração e backup; filtros persistentes; relatórios JSON/CSV e impressão técnica para PDF; extração de componentes e lógica dos módulos de investigação, grafo, preferências e relatórios; telas operacionais traduzidas, controles acessíveis e responsividade verificada. Limitações de PDF, tradução e auditoria ampla descritas abaixo. |
| 3. Motor de inteligência | Parcialmente concluída | Evidências e origem visíveis na análise por IA; comparação entre snapshots reais. Passport existe de forma distribuída na página de IOC, mas falta um modelo unificado e maior cobertura de infraestrutura/certificados. Chave Groq recuperada localmente, mas saída de rede deste ambiente impede teste ao vivo. |
| 4. Casos e correlação | Parcialmente concluída | Caderno local de casos, múltiplos IOCs, correlação direta de URL/domínio/IP por dados salvos, arestas com proveniência, grafo conjunto do caso com filtro e exportação JSON/SVG. Falta expansão controlada e correlação mais ampla de certificados/amostras. |
| 5. Detection Engineering | Parcialmente concluída | Hunting KQL/SPL/YARA-L Search, playbook contextual e pacote operacional JSON e impressão em PDF com casos e relações verificadas. Falta validação executada nas plataformas de destino, regras persistentes e revisão visual do PDF técnico. |

## Limitações externas

- Na Fase 2, o PDF técnico é gerado por impressão do navegador, sem renderizador dedicado. A conferência visual em todos os navegadores e uma auditoria completa de acessibilidade ainda dependem de validação adicional; estas limitações não bloqueiam consulta, persistência ou exportação.
- O frontend usa JavaScript e não oferece scripts de lint ou typecheck no projeto atual. Foram executados os testes existentes, o build e verificações no navegador; uma futura adoção de lint/TypeScript requer escopo próprio.

- Limites distribuídos e cache compartilhado exigem armazenamento persistente ou proteção da plataforma. A aplicação atual não possui esse serviço configurado. Limites por instância serão apenas uma camada de proteção, não uma garantia global na Vercel.
- As variáveis do projeto Vercel foram baixadas para `backend/.env`, ignorado pelo Git; valores não foram impressos. O backend local continua sem saída de rede para os provedores. A versão publicada já usa esta branch; o health publicado agora indica as sete fontes configuradas online.
- URLhaus e MalwareBazaar usam variáveis separadas, mas a chave mais recente fornecida pelo usuário foi aceita pelas duas fontes no teste publicado. O serviço distingue ausência de resultado de falha da API. A chave anterior do URLhaus continuava gerando erro de autenticação.
- O endereço do webhook Slack continua salvo nas preferências locais do navegador para preservar a funcionalidade anterior. Antes de uma operação pública de maior escala, a entrega deve migrar para uma integração protegida no servidor ou ser desativada.

## Validações locais — 2026-10-15

- Backend: `npm test` — 8 testes aprovados, incluindo classificação sem cobertura, validação, SSRF, limite compartilhado simulado, cache e concorrência.
- Frontend: `npm run build` — aprovado.
- Browser: `node scripts/phase1-smoke.mjs` — acesso sem login, rotas diretas, IOC inválido, falha de fontes e viewport mobile aprovados.
- Browser isolado: `node scripts/storage-smoke.mjs` — migração de 2 registros legados, múltiplas observações, deduplicação e exclusão seletiva aprovadas.
- Após o checkpoint inicial: `npm test` no backend — 11 testes; `npm test` no frontend — 4 testes; `node scripts/storage-smoke.mjs` cobre também notas, casos e backup; smoke público cobre Detection Studio e caderno de casos em 390 px, além de restaurar um snapshot ao atualizar a página. Build do frontend aprovado.
- Grafo do caso e pacote técnico: `npm test` no frontend — 5 testes; `npm test` no backend — 11 testes; `npm run build` — aprovado. `node scripts/case-graph-smoke.mjs` confirmou aresta comprovada, painel de evidência, grafo e preferências em 390 px sem rolagem horizontal da página; captura em `D:\iocenricher\case-graph-mobile-qa.png` inspecionada.
- `node scripts/storage-smoke.mjs` confirmou retenção seletiva de observações antigas sem apagar notas ou casos, além da migração e backup existentes.
- Smoke público repetido após a revisão da análise individual: a interface exibiu “Erro de consulta” para falha externa e manteve score indisponível; build e 5 testes do frontend passaram.
- `node scripts/case-graph-smoke.mjs` confirmou também que o filtro de tipo do histórico persiste após atualizar a página; build repetido com sucesso.
- Após recuperar as variáveis existentes: health local com chaves presentes retornou `offline` para todos os provedores devido à restrição de rede deste ambiente. Uma consulta controlada a `8.8.8.8` na produção retornou o contrato antigo (`score: 0`, recomendação `IGNORAR`, sem confiança/cobertura), confirmando que esta branch não foi publicada.
- Atualização da análise individual e health: backend `npm test` — 14 testes aprovados; frontend `npm test` — 5; `npm run build` — aprovado; `node scripts/phase1-smoke.mjs` — estados de erro, tabela de fontes, rotas e mobile aprovados. Nenhum push ou deploy neste roadmap.
- Revisão da integração MalwareBazaar e relatório individual: backend `npm test` — 16 testes aprovados; frontend `npm test` — 6; `npm run build` — aprovado; `git diff --check` — sem erros. Health local confirmou `malwarebazaar: not_configured` sem chave. O smoke do navegador confirmou uma consulta nova sem login, erro de consulta sem score, conclusão do carregamento e telas móveis sem rolagem horizontal. `node scripts/storage-smoke.mjs` confirmou migração, notas, casos, backup e retenção em porta isolada.
- URLhaus: o tratamento de `query_status` foi alinhado ao resultado documentado `no_results`; erro no corpo não vira ausência de IOC. Backend `npm test` — 18 testes aprovados; `git diff --check` — sem erros.

## Publicação incremental — 2026-10-15

- Fase 2, análise em lote: serviço de consulta compartilhado, deduplicação testada, cache local malformado tratado e erro de consulta sem score. O browser confirmou rota, bloqueio de 11 IOCs, deduplicação e ausência de rolagem horizontal a 390 px; captura em `D:\iocenricher\bulk-mobile-qa.png` inspecionada. Frontend `npm test`: 10/10; backend `npm test`: 18/18; build aprovado antes do ajuste final de mensagem de armazenamento.
- Após o ajuste final: frontend `npm test` 10/10, `npm run build` aprovado, `git diff --check` sem erros. Commit `ffe3a13` enviado e deploy `dpl_7jCpoLEevGZbCa8FJC6RBcrvNA4Z` Ready em produção. `/lote` respondeu HTTP 200; `/api/health/sources` confirmou as sete integrações online.
- Fase 2, painel lateral da investigação: notas, tags e consultas recentes extraídas para componente próprio; troca de IOC reinicia o estado local do painel, controles recentes e tags usam botões acessíveis. Backend `npm test`: 18/18; frontend `npm test`: 6/6; `npm run build`: aprovado; `git diff --check`: sem erros. Inspeção visual deste incremento ainda pendente.
- Commit `5947583` enviado ao GitHub e deploy `dpl_8s4njFoTJ49aDnXBSy7VCH4o52BL` publicado em `https://iocenricher.vercel.app/` (Ready). A página respondeu HTTP 200 e `/api/health/sources` retornou VirusTotal, IPinfo, AbuseIPDB, Shodan e Groq online; URLhaus em `auth_error` e MalwareBazaar em `not_configured`.
- `npm audit --json` no frontend ainda reporta 8 alertas (1 baixo, 2 moderados, 5 altos), concentrados no toolchain de build/desenvolvimento. A correção de Vite exige atualização major e deve passar por validação própria antes de ser publicada.
- Credenciais abuse.ch: a primeira chave fornecida para URLhaus foi configurada, mas o deploy `dpl_Db99vzjVT9B6hnAfgTi32F6DbEz4` continuou com `auth_error` tanto no health quanto no enriquecimento. A chave mais recente foi configurada em `URLHAUS_API_KEY` e `MALWAREBAZAAR_API_KEY`, sem entrar no Git. O deploy `dpl_71odPxvxFaa8GYJyevJzKC378rK5` ficou Ready; `/api/health/sources` marcou ambas online. Consulta publicada de `example.com` retornou URLhaus `ok`, e consulta de hash de teste retornou URLhaus e MalwareBazaar `no_match`, com `query_status: complete`. Nenhuma ausência foi classificada como falha ou detecção.
- Autorização do usuário recebida para enviar o progresso ao GitHub e publicar no site conforme as entregas forem validadas.
- Antes da primeira publicação: backend `npm test` — 18 testes aprovados; frontend `npm test` — 6 testes aprovados; `npm run build` — aprovado.
- `vercel deploy --dry` confirmou que `backend/.env`, `frontend/.env.local`, dependências e build local estão excluídos do pacote. O arquivo `.vercelignore` fica na raiz usada pela Vercel.
- A publicação não altera as chaves existentes. MalwareBazaar segue sem chave própria e o limite distribuído segue sem Upstash configurado; esses estados precisam aparecer como indisponibilidade verificável, sem classificação benigna fictícia.
- Primeiro deploy de produção: `dpl_7ToSDDmLU85GeTRZWPnmh82mZTyw`, com alias `https://iocenricher.vercel.app`. A consulta publicada a `8.8.8.8` retornou dados reais e `BAIXO_RISCO_OBSERVADO` com cobertura 2/2. O health mostrou VirusTotal, IPinfo, AbuseIPDB, Shodan e Groq acessíveis; URLhaus apresentou erro de autenticação e MalwareBazaar ausência de chave. A geração Groq retornou HTTP 400 apesar do health acessível; diagnóstico por categoria foi acrescentado para investigar sem registrar dados da consulta.
- O diagnóstico da consulta seguinte identificou `model_not_found` para `llama-3.3-70b-versatile`; o modelo foi descontinuado para a conta atual. As duas rotas de IA passaram a usar `openai/gpt-oss-20b`. O health agora valida o modelo específico. A eficácia da correção exige nova consulta publicada.
- Deploy incremental `dpl_D9WB3KgQaZDzxFGPcXKXJBSVsrH2` validado em produção: health com Groq online para o modelo configurado; consulta real de `8.8.8.8` retornou `query_status: complete`, VirusTotal/IPinfo/AbuseIPDB/Shodan disponíveis, `BAIXO_RISCO_OBSERVADO` com cobertura 2/2 e análise de IA gerada (`groq: ok`, modelo `openai/gpt-oss-20b`). URLhaus segue com erro de autenticação e MalwareBazaar sem chave. Os logs de build reportaram 8 alertas de dependências no frontend, a revisar sem atualização automática de versões.

## Fechamento da Fase 2 — 2026-10-16

- Componentes de detalhe das fontes e simulação do grafo foram extraídos; preferências e seleção estável de relatórios ganharam utilitários testáveis. A tabela de fontes recebeu rolagem local e os painéis de fonte se adaptam a telas estreitas. Estados do Threat Feed distinguem erro de carregamento de ausência real de dados; MalwareBazaar informa a necessidade de chave de API.
- `npm test` no frontend: 13/13; `npm test` no backend: 18/18; `npm run build` no frontend: aprovado; `git diff --check`: sem erros.
- `node scripts/phase1-smoke.mjs`: acesso público, validação, erro de consulta, telas móveis e casos aprovados. `node scripts/phase2-smoke.mjs`: grafo, preferências, relatórios, fontes, Threat Feed e phishing aprovados em 390 px. O primeiro smoke da Fase 2 disputou a aba do navegador com o smoke da Fase 1 e falhou; a execução isolada passou.
- `node scripts/storage-smoke.mjs` e `node scripts/case-graph-smoke.mjs`: aprovados com Vite isolado na porta 5175; a primeira tentativa sem o servidor apresentou falha de conexão, resolvida ao iniciar a porta exigida pelos roteiros.
- Nenhum dado de usuário foi apagado. A Fase 1 permanece parcial por falta do limitador distribuído configurado; as Fases 3 a 5 seguem com pendências próprias.
