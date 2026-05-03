// Vercel serverless proxy — keeps CHARLIE_API_KEY out of the browser
const CHARLIE_URL = process.env.CHARLIE_API_URL || 'http://5.223.60.100:3001';
const CHARLIE_KEY = process.env.CHARLIE_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { endpoint, body } = req.body;
  const allowed = [
    '/api/charlie/upload-transcript',
    '/api/charlie/extract',
    '/api/charlie/document-status',
    '/api/charlie/workflow/start',
    '/api/charlie/customers',
    '/api/charlie/customer/session/start'
  ];

  // GET endpoints with ID params
  const isStatusPoll = endpoint && endpoint.startsWith('/api/charlie/document-status/');
  const isWorkflowStatus = endpoint && endpoint.startsWith('/api/charlie/workflow/status/');
  const isCustomerContext = endpoint && /^\/api\/charlie\/customer\/[^/]+\/context$/.test(endpoint);
  const isCustomerSessions = endpoint && /^\/api\/charlie\/customer\/[^/]+\/sessions$/.test(endpoint);
  const isSessionUpdate = endpoint && /^\/api\/charlie\/customer\/session\/[^/]+\/update$/.test(endpoint);

  if (!allowed.includes(endpoint) && !isStatusPoll && !isWorkflowStatus && !isCustomerContext && !isCustomerSessions && !isSessionUpdate) {
    return res.status(400).json({ error: 'Endpoint not allowed' });
  }

  try {
    const isGet = isStatusPoll || isWorkflowStatus || isCustomerContext || isCustomerSessions || endpoint === '/api/charlie/customers';
    const opts = {
      method: isGet ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-charlie-key': CHARLIE_KEY
      }
    };
    // Never allow autoRun to be set from the frontend
    if (body && endpoint === '/api/charlie/workflow/start') {
      delete body.autoRun;
    }
    if (!isGet && body) opts.body = JSON.stringify(body);

    const upstream = await fetch(`${CHARLIE_URL}${endpoint}`, opts);
    const data = await upstream.json();

    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Upstream unreachable', detail: e.message });
  }
}
