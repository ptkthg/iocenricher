// MITRE ATT&CK mapping service
// Maps threat intel signals to real ATT&CK techniques (no API key required)

const TECHNIQUES = {
  T1071: { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control', tacticId: 'TA0011', url: 'https://attack.mitre.org/techniques/T1071' },
  T1095: { id: 'T1095', name: 'Non-Application Layer Protocol', tactic: 'Command and Control', tacticId: 'TA0011', url: 'https://attack.mitre.org/techniques/T1095' },
  T1566: { id: 'T1566', name: 'Phishing', tactic: 'Initial Access', tacticId: 'TA0001', url: 'https://attack.mitre.org/techniques/T1566' },
  T1105: { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control', tacticId: 'TA0011', url: 'https://attack.mitre.org/techniques/T1105' },
  T1486: { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', tacticId: 'TA0040', url: 'https://attack.mitre.org/techniques/T1486' },
  T1219: { id: 'T1219', name: 'Remote Access Software', tactic: 'Command and Control', tacticId: 'TA0011', url: 'https://attack.mitre.org/techniques/T1219' },
  T1496: { id: 'T1496', name: 'Resource Hijacking', tactic: 'Impact', tacticId: 'TA0040', url: 'https://attack.mitre.org/techniques/T1496' },
  T1190: { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access', tacticId: 'TA0001', url: 'https://attack.mitre.org/techniques/T1190' },
  T1056: { id: 'T1056', name: 'Input Capture', tactic: 'Collection', tacticId: 'TA0009', url: 'https://attack.mitre.org/techniques/T1056' },
  T1552: { id: 'T1552', name: 'Unsecured Credentials', tactic: 'Credential Access', tacticId: 'TA0006', url: 'https://attack.mitre.org/techniques/T1552' },
  T1539: { id: 'T1539', name: 'Steal Web Session Cookie', tactic: 'Credential Access', tacticId: 'TA0006', url: 'https://attack.mitre.org/techniques/T1539' },
  T1041: { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration', tacticId: 'TA0010', url: 'https://attack.mitre.org/techniques/T1041' },
  T1204: { id: 'T1204', name: 'User Execution', tactic: 'Execution', tacticId: 'TA0002', url: 'https://attack.mitre.org/techniques/T1204' },
  T1498: { id: 'T1498', name: 'Network Denial of Service', tactic: 'Impact', tacticId: 'TA0040', url: 'https://attack.mitre.org/techniques/T1498' },
  T1583: { id: 'T1583', name: 'Acquire Infrastructure', tactic: 'Resource Development', tacticId: 'TA0042', url: 'https://attack.mitre.org/techniques/T1583' },
  T1027: { id: 'T1027', name: 'Obfuscated Files or Information', tactic: 'Defense Evasion', tacticId: 'TA0005', url: 'https://attack.mitre.org/techniques/T1027' },
  T1588: { id: 'T1588', name: 'Obtain Capabilities', tactic: 'Resource Development', tacticId: 'TA0042', url: 'https://attack.mitre.org/techniques/T1588' },
  T1059: { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution', tacticId: 'TA0002', url: 'https://attack.mitre.org/techniques/T1059' },
};

// Keyword → technique mapping
const KEYWORD_MAP = [
  { keywords: ['botnet', 'c2', 'c&c', 'command', 'control', 'cnc'], techniques: ['T1071', 'T1095', 'T1041'] },
  { keywords: ['phishing', 'spear', 'credential', 'login', 'harvest', 'spamming', 'spam'], techniques: ['T1566', 'T1552', 'T1539'] },
  { keywords: ['malware', 'download', 'dropper', 'loader', 'payload', 'exe', 'malware_download'], techniques: ['T1105', 'T1204'] },
  { keywords: ['ransomware', 'ransom', 'encrypt', 'locker', 'cryptolocker'], techniques: ['T1486', 'T1041'] },
  { keywords: ['rat', 'remote', 'backdoor', 'trojan', 'remote access'], techniques: ['T1219', 'T1071'] },
  { keywords: ['banker', 'banking', 'formgrabber', 'stealer', 'infostealer', 'keylog'], techniques: ['T1056', 'T1539', 'T1552'] },
  { keywords: ['miner', 'coin', 'crypto', 'xmrig', 'monero'], techniques: ['T1496'] },
  { keywords: ['exploit', 'kit', 'vulnerability', 'cve', 'rig', 'fallout', 'blackhole'], techniques: ['T1190', 'T1588'] },
  { keywords: ['ddos', 'dos', 'flood', 'amplification', 'reflection'], techniques: ['T1498'] },
  { keywords: ['obfuscat', 'pack', 'crypt', 'encoded', 'shellcode'], techniques: ['T1027', 'T1059'] },
  { keywords: ['infrastructure', 'hosting', 'bulletproof'], techniques: ['T1583'] },
];

function normalize(str) {
  return (str || '').toLowerCase().replace(/[_\-\.]/g, ' ');
}

function mapToMitre(sources, type) {
  const techniqueIds = new Set();
  const signals = [];

  // Collect all text signals from sources
  const urlhaus = sources.urlhaus;
  const mb = sources.malwarebazaar;
  const vt = sources.virustotal;

  if (urlhaus?.found) {
    if (urlhaus.threat) signals.push(normalize(urlhaus.threat));
    if (urlhaus.signature) signals.push(normalize(urlhaus.signature));
    if (urlhaus.tags) urlhaus.tags.forEach(t => signals.push(normalize(t)));
  }

  if (mb?.found) {
    if (mb.signature) signals.push(normalize(mb.signature));
    if (mb.tags) mb.tags.forEach(t => signals.push(normalize(t)));
    if (mb.file_type) signals.push(normalize(mb.file_type));
  }

  if (vt) {
    if (vt.malicious > 0) signals.push('malware');
    if (vt.categories) Object.values(vt.categories).forEach(c => signals.push(normalize(c)));
    if (vt.tags) vt.tags.forEach(t => signals.push(normalize(t)));
  }

  // Baseline techniques by IOC type
  if (type === 'ip' && sources.ipinfo) techniqueIds.add('T1583');
  if (type === 'url') techniqueIds.add('T1105');
  if (type === 'hash') techniqueIds.add('T1204');
  if (type === 'domain') techniqueIds.add('T1583');

  // Match signals to techniques
  for (const signal of signals) {
    for (const rule of KEYWORD_MAP) {
      if (rule.keywords.some(k => signal.includes(k))) {
        rule.techniques.forEach(t => techniqueIds.add(t));
      }
    }
  }

  // If high risk with no specific match, add generic ones
  if (techniqueIds.size <= 1 && (sources.urlhaus?.found || sources.malwarebazaar?.found)) {
    techniqueIds.add('T1071');
    techniqueIds.add('T1041');
  }

  return [...techniqueIds].map(id => TECHNIQUES[id]).filter(Boolean);
}

module.exports = { mapToMitre };
