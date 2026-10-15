# Refatoração visual — IOC Enricher

## Referências analisadas

As quatro imagens originais permanecem em `D:\iocenricher`.

| Arquivo | Tela | Padrões aplicados |
| --- | --- | --- |
| `71843dec-5421-44b9-bfd5-593004597ddb.png` | Painel / Overview | Barra superior compacta, sidebar operacional, KPIs, tendência, classificação e atividade recente |
| `76ff4438-0ea6-4717-bf9d-29b27f270288.png` | Investigações | Busca, filtros, tabela densa, badges, datas, paginação e ação de nova análise |
| `5a62c3ec-43fb-4eae-bde4-c5dca9ccf02e.png` | MITRE ATT&CK | Matriz em colunas por tática, técnica selecionada e IOCs associados |
| `0452a6ff-f0cd-41a6-83b5-10230ea3d005.png` | Fontes | Catálogo tabular, status, tipos de dados, resultados locais e uso por fonte |

Não havia imagem da análise individual nem da autenticação. Essas telas usam a mesma tipografia monoespaçada, paleta, navegação e densidade das quatro referências.

## Arquitetura e dados

- Frontend: React 18, Vite 5, componentes JSX e CSS. Não há Next.js nem TypeScript no repositório.
- Backend: Express com rotas `/api/enrich`, `/api/health/sources`, `/api/graph`, `/api/graph/ai-summary`, `/api/threatfeed/*`, `/api/phishing/parse` e `/api/notify/slack`.
- Fontes de enriquecimento: VirusTotal, IPinfo, AbuseIPDB, Shodan, URLhaus, MalwareBazaar, Passive DNS, WHOIS, crt.sh, análise de subnet e typosquatting. Groq fornece análise contextual quando a chave estiver configurada.
- Persistência: histórico, contas, sessão, notas, tags e preferências em `localStorage`. Não há banco de dados, autenticação no servidor ou sincronização entre usuários.
- MITRE: a matriz agrega somente técnicas presentes nos resultados salvos. O backend deixou de atribuir técnicas pelo tipo de IOC ou por simples detecção genérica; ainda é uma correlação por termos das fontes que exige revisão humana.
- Grafo: a rota e a tela anteriores foram preservadas. A análise individual carrega sob demanda um resumo visual das relações reais; **Relacionamentos** abre o grafo completo já com o IOC selecionado.

## Limites funcionais

- Os números das imagens são demonstrativos e não foram inseridos no código. Estatísticas vêm do histórico local e o status vem de `/api/health/sources`.
- O endpoint de saúde verifica seis fontes de inteligência e o provedor de IA Groq. A interface conta apenas as seis fontes; integrações auxiliares sem probe aparecem como **Não verificado**.
- Sem resposta de uma fonte de reputação, score zero passa a ser **INCONCLUSIVO**, com recomendação de investigação.
- Não há casos compartilhados, papéis aplicados no servidor, coleções persistidas, disponibilidade histórica das fontes, quota por provedor ou métricas de analista. Essas seções das referências não podem ser apresentadas como dados reais até existir suporte no backend.
- Login e cadastro existentes são locais ao navegador. O antigo atalho que aceitava qualquer senha com quatro caracteres para um endereço específico foi removido. Contas locais já cadastradas, login e acesso de convidado continuam disponíveis.
- As integrações dependem das chaves em `backend/.env`; nunca use `VITE_` para chaves secretas. Com a rede ou as chaves indisponíveis, a interface mostra ausência de dados e erros verificáveis.
- Cada resposta de `/api/enrich` inclui `source_status`, com `ok`, `no_match`, `not_configured`, `auth_error`, `rate_limited` ou `unavailable` por fonte consultada. A tela mostra um aviso de análise parcial quando uma fonte falha. Resultados locais, como typosquatting, não substituem uma consulta de reputação.
- A instalação reportou avisos de segurança em dependências existentes (9 no backend, 8 no frontend, considerando desenvolvimento). A atualização das dependências e sua compatibilidade exigem uma rodada própria; nenhum pacote foi trocado nesta refatoração visual.

## Execução local

Em dois terminais:

```powershell
cd D:\iocenricher\codigo\iocenricher\backend
Copy-Item .env.example .env
# Edite .env com suas chaves. Não comite esse arquivo.
npm install
npm start
```

```powershell
cd D:\iocenricher\codigo\iocenricher\frontend
npm install
npm run dev
```

Abra `http://127.0.0.1:5173/`. O proxy do Vite envia `/api` ao backend na porta 3001.

Nesta instalação local, `frontend/.env.local` aponta `VITE_API_URL` para `https://iocenricher.vercel.app/api`, usando as integrações e chaves já configuradas no projeto Vercel. O arquivo é ignorado pelo Git e contém somente o endereço público da API. Para voltar ao backend local, remova essa variável e reinicie o Vite.

Para receber resultados OSINT externos, configure as chaves necessárias em `backend/.env` e permita conexões HTTPS de saída para os provedores no processo Node. `backend/.env.example` contém os nomes das variáveis. Sem isso, a consulta pode retornar `INCONCLUSIVO` e o aviso indicará a causa por fonte. As alterações locais não aparecem no site publicado enquanto não houver um deploy autorizado.

## Validação

```powershell
cd D:\iocenricher\codigo\iocenricher\backend
npm test
cd ..\frontend
npm run build
```

Não há scripts de lint ou typecheck no projeto original. As capturas de QA ficam em `D:\iocenricher\*-qa.png`; foram geradas em Chrome headless, em 1440 × 1000 e 390 × 844. O script auxiliar está em `scripts/capture-local.mjs` e requer Chrome em modo de depuração na porta 9229.
