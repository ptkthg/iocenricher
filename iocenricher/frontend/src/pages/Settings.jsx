import { useEffect, useState } from 'react';
import { C } from '../lib/theme';
import { loadInvestigations, saveInvestigations, exportWorkspaceBackup, importWorkspaceBackup } from '../lib/investigationStore';

const SETTINGS_KEY = 'iocenricher_settings';
const apiBase = import.meta.env.VITE_API_URL || '/api';
function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

export default function Settings({ onHistoryChange }) {
  const [settings, setSettings] = useState(readSettings);
  const [sources, setSources] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [response, items] = await Promise.all([fetch(`${apiBase}/health/sources`), loadInvestigations()]);
      if (!response.ok) throw new Error('Status das fontes indisponível');
      setSources((await response.json()).sources || []);
      setHistory(items);
    } catch { setSources(null); setHistory(await loadInvestigations()); }
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  function saveSlack() {
    if (settings.slackAlerts && !/^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(settings.slackWebhook || '')) {
      setMessage('Informe um webhook oficial do Slack para ativar as notificações.');
      return;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setMessage('Preferência de Slack salva neste navegador.');
  }
  async function testSlack() {
    if (!settings.slackWebhook) return;
    setTesting(true);
    try {
      const response = await fetch(`${apiBase}/notify/slack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhookUrl: settings.slackWebhook, test: true, result: { indicator: 'test.example.com', type: 'domain', risk: { score: null, level: 'INCONCLUSIVO', factors: ['Mensagem de teste; não representa uma investigação real.'] }, recommendation: 'TESTE', mitre: [] } }) });
      setMessage(response.ok ? 'Mensagem de teste entregue ao Slack.' : 'O teste falhou. Verifique o webhook e tente novamente.');
    } catch { setMessage('O teste falhou porque a API não respondeu.'); }
    setTesting(false);
  }
  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10_000_000) { setMessage('O backup excede o limite de 10 MB.'); return; }
    try {
      const backup = JSON.parse(await file.text());
      if (backup.schema === 'ioc-enricher-backup-v1') {
        const updated = await importWorkspaceBackup(backup);
        setHistory(updated);
        onHistoryChange?.(updated);
        setMessage('Backup da área de trabalho importado; registros locais anteriores foram preservados.');
        return;
      }
      if (backup.schema !== 'ioc-enricher-report-v1' || !Array.isArray(backup.investigations) || backup.investigations.length > 5000) throw new Error('Formato não suportado');
      const valid = backup.investigations.every(item => item && typeof item.indicator === 'string' && item.indicator.length <= 2048 && ['ip', 'domain', 'url', 'hash'].includes(item.type) && Number.isFinite(Date.parse(item.timestamp)) && (item.risk?.score == null || Number.isFinite(item.risk.score) && item.risk.score >= 0 && item.risk.score <= 100));
      if (!valid) throw new Error('Observações inválidas');
      const updated = await saveInvestigations(backup.investigations);
      setHistory(updated);
      onHistoryChange?.(updated);
      setMessage(`${backup.investigations.length} observação(ões) importadas; registros existentes foram preservados.`);
    } catch { setMessage('Backup inválido. Nenhum registro foi importado.'); }
  }

  async function exportBackup() {
    try {
      const content = JSON.stringify(await exportWorkspaceBackup(), null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `ioc-enricher-backup-${Date.now()}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Backup local criado com observações, notas e casos.');
    } catch { setMessage('Não foi possível criar o backup local.'); }
  }

  return <div className="stack">
    <div><h1 className="page-title">Preferências</h1><p className="page-subtitle">Estado das integrações e dados deste navegador.</p></div>
    {message && <div className="panel panel-pad" role="status">{message}</div>}
    <section className="panel panel-pad"><div className="toolbar" style={{ justifyContent: 'space-between' }}><h2 className="panel-title">Fontes OSINT</h2><button className="btn" onClick={refresh} disabled={loading}>{loading ? 'Verificando...' : 'Atualizar estado'}</button></div><p style={{ color: C.textMuted }}>O estado abaixo vem da API. Disponibilidade de uma fonte pode mudar entre esta verificação e uma consulta.</p>{sources ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Fonte</th><th>Estado verificado</th></tr></thead><tbody>{sources.map(source => <tr key={source.name}><td>{source.name}</td><td style={{ color: source.status === 'online' ? C.green : source.status === 'auth_error' ? C.yellow : C.textMuted }}>{source.status}</td></tr>)}</tbody></table></div> : <div className="empty">Estado das fontes indisponível.</div>}</section>
    <section className="panel panel-pad"><h2 className="panel-title">Dados locais e backup</h2><p style={{ color: C.textMuted, lineHeight: 1.6 }}>Há {history.length} observação(ões) salvas neste navegador. Apagar dados do navegador pode remover histórico, notas e casos. O backup inclui esses três conjuntos; a importação preserva os registros existentes.</p><div className="toolbar"><button className="btn" onClick={exportBackup}>Exportar backup JSON</button><label className="btn" style={{ cursor: 'pointer' }}>Importar backup JSON<input type="file" accept="application/json,.json" onChange={importBackup} style={{ display: 'none' }} /></label></div></section>
    <section className="panel panel-pad"><h2 className="panel-title">Notificações Slack</h2><p style={{ color: C.textMuted, lineHeight: 1.6 }}>Quando ativada, a aplicação envia análises de risco alto ou crítico ao webhook informado. O endereço fica nas preferências deste navegador e é enviado à API somente para entregar a mensagem.</p><label className="toolbar" style={{ marginBottom: 12 }}><input type="checkbox" checked={Boolean(settings.slackAlerts)} onChange={event => setSettings(value => ({ ...value, slackAlerts: event.target.checked }))} /> Ativar notificações de análises de alto risco</label><label style={{ display: 'block', marginBottom: 7 }}>Webhook oficial do Slack</label><input className="field" type="password" autoComplete="off" value={settings.slackWebhook || ''} onChange={event => setSettings(value => ({ ...value, slackWebhook: event.target.value }))} placeholder="https://hooks.slack.com/services/..." style={{ width: '100%', marginBottom: 12 }} /><div className="toolbar"><button className="btn btn-primary" onClick={saveSlack}>Salvar preferência</button><button className="btn" onClick={testSlack} disabled={testing || !settings.slackWebhook}>{testing ? 'Enviando...' : 'Enviar mensagem de teste'}</button></div></section>
    <section className="panel panel-pad"><h2 className="panel-title">Classificação de risco</h2><p style={{ color: C.textMuted, lineHeight: 1.6 }}>O score é calculado no backend a partir das respostas disponíveis. A confiança descreve a consistência das evidências; a cobertura mostra quantas fontes de reputação responderam. Uma falha de consulta permanece inconclusiva e não recebe score zero.</p></section>
  </div>;
}
