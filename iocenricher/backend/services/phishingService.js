/**
 * Parses raw .eml content and extracts headers, URLs, and IPs.
 * Uses only regex — no external dependencies.
 */
function parseEml(content) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Invalid or empty EML content.');
  }

  // RFC 2822: headers and body separated by the first blank line
  const sepIdx = content.search(/\r?\n\r?\n/);
  const headerSection = sepIdx !== -1 ? content.slice(0, sepIdx) : content;
  const body = sepIdx !== -1 ? content.slice(sepIdx + 2) : '';

  // Unfold multi-line header values (RFC 2822 §2.2.3)
  const unfolded = headerSection.replace(/\r?\n[ \t]+/g, ' ');

  function get(name) {
    const m = unfolded.match(new RegExp(`^${name}:\\s*(.+)`, 'im'));
    return m ? m[1].trim() : null;
  }

  function getAll(name) {
    const re = new RegExp(`^${name}:\\s*(.+)`, 'gim');
    const out = [];
    let m;
    while ((m = re.exec(unfolded)) !== null) out.push(m[1].trim());
    return out;
  }

  const headers = {
    from:           get('From'),
    replyTo:        get('Reply-To'),
    returnPath:     get('Return-Path'),
    received:       getAll('Received'),
    xOriginatingIP: get('X-Originating-IP'),
    messageId:      get('Message-ID'),
    subject:        get('Subject'),
    date:           get('Date'),
  };

  // Extract URLs from body + headers
  const urlRe = /https?:\/\/[^\s"'<>)\]\\]+/gi;
  const rawUrls = [
    ...(body.match(urlRe) || []),
    ...(headerSection.match(urlRe) || []),
  ];
  // Deduplicate and strip trailing punctuation
  const urls = [...new Set(rawUrls.map(u => u.replace(/[.,;:]+$/, '')))];

  // Extract IPs from body + Received headers + X-Originating-IP
  const ipRe = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
  const ipSrc = [body, ...headers.received, headers.xOriginatingIP || ''].join('\n');
  const allIPs = [...new Set(ipSrc.match(ipRe) || [])];
  // Filter loopback, unspecified, broadcast
  const ips = allIPs.filter(ip =>
    !ip.startsWith('127.') &&
    !ip.startsWith('0.') &&
    ip !== '255.255.255.255'
  );

  return { headers, urls, ips };
}

module.exports = { parseEml };
