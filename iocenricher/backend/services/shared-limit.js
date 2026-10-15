const axios = require('axios');
const { createHmac } = require('node:crypto');

const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n";
const configured = () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

function sharedLimit(scope, max) {
  return async (req, res, next) => {
    if (!configured()) return next();
    const salt = process.env.RATE_LIMIT_SALT || process.env.UPSTASH_REDIS_REST_TOKEN;
    const client = createHmac('sha256', salt).update(req.ip || req.socket.remoteAddress || 'unknown').digest('hex');
    const key = `iocenricher:limit:${scope}:${Math.floor(Date.now() / 60_000)}:${client}`;
    try {
      const { data } = await axios.post(process.env.UPSTASH_REDIS_REST_URL, ['EVAL', script, 1, key, 70], {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
        timeout: 3000,
      });
      const count = Number(data.result);
      if (!Number.isFinite(count)) throw new Error('invalid counter response');
      if (count > max) { res.set('Retry-After', '60'); return res.status(429).json({ error: 'Limite de consultas atingido. Aguarde um minuto.' }); }
      return next();
    } catch {
      return res.status(503).json({ error: 'Proteção de consultas indisponível. Tente novamente em instantes.' });
    }
  };
}

module.exports = { sharedLimit, configured };
