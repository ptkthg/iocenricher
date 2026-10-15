# Evolução do IOC Enricher

Branch de desenvolvimento: `roadmap/phase1-public-access`. Nenhum push ou deploy será feito neste roadmap sem autorização.

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
| 2. Arquitetura e UX | Parcialmente concluída | Navegação agrupada, histórico/notas/casos no IndexedDB, migração, backup versionado, retenção manual, filtros persistentes e relatórios com dados reais. Tela individual parcialmente traduzida, estados de todas as fontes por coleta e impressão individual usando o módulo comum de relatórios. Ainda faltam refatoração dos componentes extensos, tradução das demais rotas e auditoria ampla de acessibilidade. |
| 3. Motor de inteligência | Parcialmente concluída | Evidências e origem visíveis na análise por IA; comparação entre snapshots reais. Passport existe de forma distribuída na página de IOC, mas falta um modelo unificado e maior cobertura de infraestrutura/certificados. Chave Groq recuperada localmente, mas saída de rede deste ambiente impede teste ao vivo. |
| 4. Casos e correlação | Parcialmente concluída | Caderno local de casos, múltiplos IOCs, correlação direta de URL/domínio/IP por dados salvos, arestas com proveniência, grafo conjunto do caso com filtro e exportação JSON/SVG. Falta expansão controlada e correlação mais ampla de certificados/amostras. |
| 5. Detection Engineering | Parcialmente concluída | Hunting KQL/SPL/YARA-L Search, playbook contextual e pacote operacional JSON e impressão em PDF com casos e relações verificadas. Falta validação executada nas plataformas de destino, regras persistentes e revisão visual do PDF técnico. |

## Limitações externas

- Limites distribuídos e cache compartilhado exigem armazenamento persistente ou proteção da plataforma. A aplicação atual não possui esse serviço configurado. Limites por instância serão apenas uma camada de proteção, não uma garantia global na Vercel.
- As variáveis existentes do projeto Vercel foram baixadas para `backend/.env`, ignorado pelo Git; valores não foram impressos. O backend local continua sem saída de rede para os provedores (todos retornaram `offline` no health local). A produção respondeu com VirusTotal, AbuseIPDB, Shodan e Groq disponíveis; IPinfo e URLhaus retornaram falha de acesso, e MalwareBazaar falha de autenticação. A versão publicada continua no código antigo; não houve deploy neste roadmap.
- MalwareBazaar exige uma chave própria `MALWAREBAZAAR_API_KEY`, ausente nas variáveis recuperadas. O serviço agora indica fonte não configurada quando a chave falta e distingue `hash_not_found` de erro da API. URLhaus também exige Auth-Key; a chave existente retornou 403 na verificação publicada. Essas integrações dependem de credenciais válidas antes de testes reais.
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
