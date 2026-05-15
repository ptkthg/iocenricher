// Typosquatting & Brand Impersonation detector — no API key needed
const TOP_BRANDS = [
  'google','gmail','youtube','microsoft','outlook','office','azure','windows',
  'apple','icloud','iphone','amazon','aws','netflix','facebook','instagram',
  'whatsapp','twitter','linkedin','paypal','stripe','coinbase','binance',
  'blockchain','chase','wellsfargo','bankofamerica','citibank','visa','mastercard',
  'dropbox','github','gitlab','cloudflare','godaddy','namecheap','shopify',
  'wordpress','adobe','salesforce','zoom','slack','discord','telegram','signal',
  'protonmail','yahoo','hotmail','live','bing','duckduckgo'
];

const SUSPICIOUS_TLDS = ['.xyz','.top','.click','.loan','.online','.site',
  '.info','.biz','.cc','.tk','.ml','.ga','.cf','.pw'];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function analyzeDomain(domain) {
  const clean = domain.toLowerCase().replace(/^www\./, '');
  const dotIdx = clean.lastIndexOf('.');
  const name = dotIdx > 0 ? clean.slice(0, dotIdx) : clean;
  const tld = dotIdx > 0 ? clean.slice(dotIdx) : '';

  const matches = [];

  for (const brand of TOP_BRANDS) {
    const dist = levenshtein(name, brand);
    // Exact substring match
    if (name.includes(brand) && name !== brand) {
      matches.push({ brand, technique: 'Brand in subdomain/prefix', distance: 0, confidence: 'HIGH' });
      continue;
    }
    // Very close typo (1-2 char diff)
    if (dist === 1 && name.length >= 5) {
      matches.push({ brand, technique: 'Typosquatting (1 char)', distance: dist, confidence: 'HIGH' });
    } else if (dist === 2 && name.length >= 7) {
      matches.push({ brand, technique: 'Typosquatting (2 chars)', distance: dist, confidence: 'MEDIUM' });
    }
    // Homograph: number substitution (go0gle, micrоsoft)
    const denum = name.replace(/0/g,'o').replace(/1/g,'l').replace(/3/g,'e').replace(/4/g,'a').replace(/5/g,'s');
    if (denum !== name && levenshtein(denum, brand) === 0) {
      matches.push({ brand, technique: 'Homograph (number substitution)', distance: 0, confidence: 'HIGH' });
    }
    // Punycode/IDN check
    if (name.startsWith('xn--')) {
      matches.push({ brand: 'IDN domain', technique: 'Internationalized Domain Name (IDN)', distance: 0, confidence: 'MEDIUM' });
    }
  }

  // Remove duplicates
  const seen = new Set();
  const unique = matches.filter(m => { const k = `${m.brand}|${m.technique}`; return seen.has(k) ? false : seen.add(k); });

  const hasSuspiciousTld = SUSPICIOUS_TLDS.some(t => tld === t);
  const isNewPattern = /\d{4,}/.test(name); // many numbers = suspicious
  const isDashHeavy = (name.match(/-/g) || []).length >= 2;

  return {
    domain,
    matches: unique.slice(0, 5),
    is_suspicious: unique.length > 0 || hasSuspiciousTld,
    suspicious_tld: hasSuspiciousTld ? tld : null,
    flags: [
      ...(hasSuspiciousTld ? [`Suspicious TLD: ${tld}`] : []),
      ...(isNewPattern ? ['Contains numeric pattern'] : []),
      ...(isDashHeavy ? ['Multiple hyphens (common in phishing)'] : []),
    ],
    score: Math.min(unique.filter(m => m.confidence === 'HIGH').length * 30 + unique.filter(m => m.confidence === 'MEDIUM').length * 15 + (hasSuspiciousTld ? 10 : 0), 100),
  };
}

module.exports = { analyzeDomain };
