// api/notify-signup.js
// Se llama cada vez que alguien se registra en "Mi Día". Hace dos cosas con la
// misma llave BREVO que ya tienes configurada en Vercel:
//   1) Agrega el contacto a tu lista de Brevo (comunidad)
//   2) Te manda un correo a iworkcenteria@gmail.com avisando el registro

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
      return res.status(400).json({ error: 'JSON inválido' });
    }
  }

  const { nombre, email, origen } = body || {};
  if (!email) return res.status(400).json({ error: 'Falta el correo' });
  if (!process.env.BREVO) return res.status(500).json({ error: 'BREVO no está configurada en Vercel' });

  const results = { contact: null, mail: null };

  // 1) Agregar a la lista de contactos (comunidad)
  try {
    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'api-key': process.env.BREVO },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: nombre || '' },
        listIds: [17],
        updateEnabled: true
      })
    });
    results.contact = contactRes.ok || contactRes.status === 204 ? 'ok' : await contactRes.json();
  } catch (e) {
    results.contact = 'error: ' + e.message;
  }

  // 2) Notificación por correo a iworkcenteria@gmail.com
  try {
    const mailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'api-key': process.env.BREVO },
      body: JSON.stringify({
        sender: { name: 'Mi Día', email: 'noreply@iworkcenter.work' },
        to: [{ email: 'iworkcenteria@gmail.com' }],
        subject: '🆕 Nuevo registro en Mi Día',
        htmlContent: `<p><b>Nuevo usuario registrado</b></p>
          <p>Nombre: ${nombre || '(sin nombre)'}<br>
          Correo: ${email}<br>
          Origen: ${origen || 'Mi Día'}<br>
          Fecha: ${new Date().toLocaleString('es-CO')}</p>`
      })
    });
    results.mail = mailRes.ok ? 'ok' : await mailRes.json();
  } catch (e) {
    results.mail = 'error: ' + e.message;
  }

  return res.status(200).json({ ok: true, results });
}
