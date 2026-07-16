// api/legal-agent.js
// Función serverless de Vercel: puente seguro entre I WORK / Lawyer (GitHub Pages)
// y la API de Claude. La llave ANTHROPIC_API_KEY vive solo aquí, nunca en el HTML.

export default async function handler(req, res) {
  // CORS — mientras pruebas, "*" es lo más simple.
  // Cuando ya esté funcionando, cambia "*" por tu dominio real, ej:
  // res.setHeader('Access-Control-Allow-Origin', 'https://iworkcenter.github.io');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Lee el body manualmente — más confiable que depender del auto-parseo de Vercel
  let body = req.body;
  if (!body || typeof body === 'string' || Object.keys(body).length === 0) {
    try {
      const raw = typeof body === 'string' ? body : await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      return res.status(400).json({ error: 'JSON inválido en el body de la petición' });
    }
  }

  const { messages, system } = body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Falta "messages" en el body' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no está configurada en las variables de entorno de Vercel' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: system || '',
        messages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error llamando a la API de Claude' });
  }
}
