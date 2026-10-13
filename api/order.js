// Revalida o lead, envia para a DrCash e redireciona para a página de sucesso (padrão Nautubone MK).
const { normalizePhone } = require('../js/phone.js');

// ===== CONFIG DR CASH =====
const DC_API_URL     = 'https://affiliate-api.drcash.pro/v1/order';
// O token fica só na variável de ambiente DRCASH_TOKEN da Vercel: o repositório no GitHub é público
const DC_TOKEN       = process.env.DRCASH_TOKEN || '';
const DC_STREAM_CODE = process.env.DRCASH_STREAM || 'jv6fo'; // Osteon (Sérvia)
const GEO = 'RS';
// ==========================

// Opcional: URL (ex.: Google Apps Script) que recebe uma cópia de todo lead que NÃO entrou na DrCash
const BACKUP_WEBHOOK = process.env.LEAD_BACKUP_WEBHOOK || '';

function visitorIp(req) {
    const h = req.headers;
    const raw = h['x-real-ip'] || h['x-forwarded-for'] || req.socket?.remoteAddress || '';
    return String(raw).split(',')[0].trim();
}

// Nunca deixa um lead sumir em silêncio: registra no log da Vercel e, se configurado, no webhook de backup
async function backupLead(reason, lead) {
    console.error('LEAD_ERROR', reason, JSON.stringify(lead));
    if (!BACKUP_WEBHOOK) return;
    try {
        await fetch(BACKUP_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason, date: new Date().toISOString(), stream: DC_STREAM_CODE, geo: GEO, ...lead }),
            signal: AbortSignal.timeout(5000),
        });
    } catch (e) {
        console.error('Backup webhook error', e.message);
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.statusCode = 302;
        res.setHeader('Location', '/');
        return res.end();
    }

    let body = req.body || {};
    if (typeof body === 'string') body = Object.fromEntries(new URLSearchParams(body));
    const query = req.query || {};
    const param = (key) => String(body[key] ?? query[key] ?? '').trim();

    const name = param('name');
    const rawPhone = param('phone');
    const phone = normalizePhone(rawPhone, GEO);
    const https = (req.headers['x-forwarded-proto'] || 'https') === 'https';

    // Redirect limpo: dados do lead vão num cookie de 30 min, nunca na URL
    const redirect = (success, orderId) => {
        if (success) {
            const value = encodeURIComponent(JSON.stringify({ name, phone: phone.display, order: orderId || '' }));
            res.setHeader('Set-Cookie', `os_lead=${value}; Max-Age=1800; Path=/; SameSite=Lax${https ? '; Secure' : ''}`);
        }
        res.statusCode = 303;
        res.setHeader('Location', `/success.html?success=${success ? 1 : 0}`);
        res.end();
    };

    const gclid = param('gclid') || param('gbraid') || param('wbraid');

    // sub1 = clickid do cckdl (cd_...), para o postback devolver ao rastreador
    // sub5 = gclid/gbraid/wbraid do Google Ads
    const subs = {
        sub1: param('sub1') || param('clickid') || param('subid'),
        sub2: param('sub2') || param('utm_campaign'),
        sub3: param('sub3') || param('utm_content'),
        sub4: param('sub4') || param('utm_source'),
        sub5: param('sub5') || gclid,
    };
    for (const k of Object.keys(subs)) if (!subs[k]) delete subs[k];

    const client = {
        phone: phone ? phone.intl : rawPhone, // 381641234567
        name,
        ip: visitorIp(req),
    };
    const lead = { ...client, raw_phone: rawPhone, ...subs };

    // Revalidação no servidor (mesma regra do formulário)
    if (name.length < 3 || !phone) {
        await backupLead('invalid_params', lead);
        return redirect(false);
    }
    if (!DC_TOKEN) {
        await backupLead('missing_DRCASH_TOKEN', lead);
        return redirect(false);
    }

    try {
        const r = await fetch(DC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + DC_TOKEN,
            },
            body: JSON.stringify({ stream_code: DC_STREAM_CODE, client, ...subs }),
            signal: AbortSignal.timeout(25000),
        });
        const text = await r.text();
        let result = null;
        try { result = JSON.parse(text); } catch (e) {}

        if (r.status === 200) {
            const orderId = (result && (result.uuid || result.order_id || result.id)) || '';
            console.log('LEAD_OK', JSON.stringify({ order: orderId, response: text.slice(0, 300), sub1: subs.sub1, sub5: subs.sub5 }));
            return redirect(true, orderId);
        }

        await backupLead(`api_${r.status}: ${text.slice(0, 300)}`, lead);
    } catch (e) {
        await backupLead(`exception: ${e.message}`, lead);
    }
    return redirect(false);
};
