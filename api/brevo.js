export default async function handler(req, res) {
    // Solo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // CORS — permite llamadas desde iworkcenter.work
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { email, nombres, apellidos, empresa, cargo, ciudad, whatsapp, celular, listId } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email requerido' });
    }

    try {
        const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': process.env.BREVO  // ← lee la variable secreta de Vercel
            },
            body: JSON.stringify({
                email: email,
                attributes: {
                    FIRSTNAME: nombres   || '',
                    LASTNAME:  apellidos || '',
                    COMPANY:   empresa   || '',
                    SMS:       whatsapp  || celular || '',
                    JOB_TITLE: cargo     || '',
                    CITY:      ciudad    || ''
                },
                listIds: [listId || 17],
                updateEnabled: true
            })
        });

        if (brevoRes.ok || brevoRes.status === 204) {
            return res.status(200).json({ ok: true });
        } else {
            const err = await brevoRes.json();
            console.error('Brevo error:', err);
            return res.status(200).json({ ok: false, message: err.message });
        }
    } catch (e) {
        console.error('Error interno:', e);
        return res.status(500).json({ error: 'Error interno' });
    }
}
