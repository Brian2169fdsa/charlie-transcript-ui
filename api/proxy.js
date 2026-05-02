// Vercel serverless proxy — keeps CHARLIE_API_KEY out of the browser
const CHARLIE_URL = process.env.CHARLIE_API_URL || 'http://5.223.60.100:3001';
const CHARLIE_KEY = process.env.CHARLIE_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { endpoint, body } = req.body;
  const allowed = [
    '/api/charlie/upload-transcript',
    '/api/charlie/extract',
    '/api/charlie/document-status'
  ];

  // document-status is a GET with an ID param
  const isStatusPoll = endpoint && endpoint.startsWith('/api/charlie/document-status/');
  if (!allowed.includes(endpoint) && !isStatusPoll) {
    return res.status(400).json({ error: 'Endpoint not allowed' });
  }

  try {
    const isGet = isStatusPoll;
    const opts = {
      method: isGet ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-charlie-key': CHARLIE_KEY
      }
    };
    if (!isGet && body) opts.body = JSON.stringify(body);

    const upstream = await fetch(`${CHARLIE_URL}${endpoint}`, opts);
    const data = await upstream.json();

    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Upstream unreachable', detail: e.message });
  }
}
