# 🔬 IOC Enricher

**Blue Team OSINT Tool** — Enriquecimento de indicadores de comprometimento para triagem em SOC.

## Funcionalidades

- Suporte a IP, domínio, URL, hash (MD5/SHA1/SHA256)
- Detecção automática do tipo de indicador
- Consulta em múltiplas fontes OSINT em paralelo
- Score de risco 0-100 com recomendação operacional
- Histórico de consultas na sessão
- Exportação de resultado em JSON

## Fontes OSINT

| Fonte | Tipos suportados |
|-------|-----------------|
| VirusTotal | IP, Domínio, URL, Hash |
| AbuseIPDB | IP |
| MalwareBazaar | Hash |
| URLScan.io | URL |

## Recomendações

| Nível | Score | Ação |
|-------|-------|------|
| 🔴 CRÍTICO | 70-100 | BLOQUEAR |
| 🟠 ALTO | 40-69 | INVESTIGAR |
| 🟡 MÉDIO | 15-39 | MONITORAR |
| 🟢 BAIXO | 0-14 | IGNORAR |

## Estrutura

```text
iocenricher/
├── backend/         ← Express API + integrações OSINT
├── frontend/        ← React + Vite
└── README.md
```

## Como rodar

```bash
# Backend
cd backend
cp .env.example .env  # adicione suas API keys
npm install
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Autor

Patrick Thiago Rezende dos Santos — Blue Team / Detection Engineering
