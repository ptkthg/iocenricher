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
| 1. Acesso público, segurança e estabilidade | Parcialmente concluída | Login removido; consultas individuais e em lote distinguem falha de baixo risco; validação, SSRF, cache, concorrência e limites implementados. Limite distribuído preparado, mas sem Upstash configurado no ambiente. |
| 2. Arquitetura e UX | Parcialmente concluída | Navegação agrupada, histórico/notas/casos no IndexedDB, migração e backup versionado, relatórios com dados reais. Ainda faltam refatoração completa dos componentes extensos, retenção, filtros persistentes, tradução consistente, auditoria ampla de acessibilidade e PDF com pacote integral. |
| 3. Motor de inteligência | Parcialmente concluída | Evidências e origem visíveis na análise por IA; comparação entre snapshots reais. Passport existe de forma distribuída na página de IOC, mas falta um modelo unificado e maior cobertura de infraestrutura/certificados. Integração Groq sem chave local para teste ao vivo. |
| 4. Casos e correlação | Parcialmente concluída | Caderno local de casos, múltiplos IOCs, correlação direta de URL/domínio/IP por dados salvos, arestas com proveniência e exportação JSON/SVG do grafo individual. Falta grafo conjunto do caso, filtros de aresta, expansão controlada e correlação mais ampla de certificados/amostras. |
| 5. Detection Engineering | Parcialmente concluída | Hunting KQL/SPL/YARA-L Search, playbook contextual e pacote JSON operacional. Falta validação executada nas plataformas de destino, regras persistentes, integração completa de casos/grafo ao PDF e revisão visual do PDF técnico. |

## Limitações externas

- Limites distribuídos e cache compartilhado exigem armazenamento persistente ou proteção da plataforma. A aplicação atual não possui esse serviço configurado. Limites por instância serão apenas uma camada de proteção, não uma garantia global na Vercel.
- Consultas externas dependem das chaves já configuradas no ambiente de produção; o ambiente local não contém `backend/.env`.
- O endereço do webhook Slack continua salvo nas preferências locais do navegador para preservar a funcionalidade anterior. Antes de uma operação pública de maior escala, a entrega deve migrar para uma integração protegida no servidor ou ser desativada.

## Validações locais — 2026-10-15

- Backend: `npm test` — 8 testes aprovados, incluindo classificação sem cobertura, validação, SSRF, limite compartilhado simulado, cache e concorrência.
- Frontend: `npm run build` — aprovado.
- Browser: `node scripts/phase1-smoke.mjs` — acesso sem login, rotas diretas, IOC inválido, falha de fontes e viewport mobile aprovados.
- Browser isolado: `node scripts/storage-smoke.mjs` — migração de 2 registros legados, múltiplas observações, deduplicação e exclusão seletiva aprovadas.
- Após o checkpoint inicial: `npm test` no backend — 11 testes; `npm test` no frontend — 4 testes; `node scripts/storage-smoke.mjs` cobre também notas, casos e backup; smoke público cobre Detection Studio e caderno de casos em 390 px, além de restaurar um snapshot ao atualizar a página. Build do frontend aprovado.
- Não houve teste de enriquecimento com chaves locais porque `backend/.env` não está presente. Nenhum push ou deploy neste roadmap.
