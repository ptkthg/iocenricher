# IOC Enricher

**Ferramenta de OSINT para Blue Team:** recebe um IP, domínio, URL ou hash, consulta várias fontes de inteligência em
paralelo e devolve uma classificação de risco com recomendação operacional para a triagem no SOC.

**Demonstração:** [iocenricher.vercel.app](https://iocenricher.vercel.app)

## O que faz
- Detecta automaticamente o tipo do indicador (IP, domínio, URL, MD5, SHA1, SHA256).
- Consulta as fontes em paralelo e calcula um score de risco de 0 a 100, com a ação recomendada: bloquear, investigar,
  monitorar ou ignorar.
- Mapeia o resultado para técnicas do MITRE ATT&CK e gera uma análise em linguagem natural com IA.
- Tem análise em lote, histórico da sessão e exportação em JSON.

Módulos de enriquecimento em [`iocenricher/backend/services/`](iocenricher/backend/services/):
VirusTotal, AbuseIPDB, MalwareBazaar, URLScan.io, URLhaus, Shodan, IPinfo, WHOIS, DNS passivo, certificado SSL,
typosquatting, inteligência de sub-rede e feeds de ameaça.

## Stack
- **Backend:** Node.js + Express (`iocenricher/backend/`), publicado como funções serverless na Vercel.
- **Frontend:** React + Vite (`iocenricher/frontend/`).

As chaves das APIs ficam em `.env`, a partir dos arquivos `.env.example`. Nenhuma chave está no repositório.

## Como rodar
Veja o passo a passo e a tabela de score no [README do projeto](iocenricher/README.md).

## Licença
[MIT](iocenricher/LICENSE)
