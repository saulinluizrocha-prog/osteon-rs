// Revalida o lead, envia para a ProfitAlphas e redireciona para a página de sucesso (padrão Nautubone MK).
const { normalizePhone } = require('../js/phone.js');

// ===== CONFIG PROFIT ALPHAS =====
const PA_API_URL  = 'https://api.profitalphas.com/api/v1/nutra/orders';
const PA_API_KEY  = process.env.PA_API_KEY || 'pa_live_b4ROMeCeWi69or9HNZ_t6687JHOxLxAdOH6UQ_ZlXiQ';
const PA_OFFER_ID = process.env.PA_OFFER_ID || 'PA-0VPA'; // Osteon (Sérvia)
const GEO = 'RS';
// =================================

// Opcional: URL (ex.: Google Apps Script) que recebe uma cópia de todo lead que NÃO entrou na ProfitAlphas
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
            body: JSON.stringify({ reason, date: new Date().toISOString(), offer: PA_OFFER_ID, geo: GEO, ...lead }),
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

    const data = {
        offer_id:         PA_OFFER_ID,
        name,
        phone:            phone ? phone.intl : rawPhone, // 381641234567, como no exemplo da documentação
        user_agent:       req.headers['user-agent'] || 'unknown',
        ip:               visitorIp(req),
        referer:          param('referer'),
        domain:           req.headers.host || '',
        landing_page_url: param('landing_page_url'),
        address:          param('address'),
        city:             param('city'),

        // subid  = clickid do cckdl (cd_...): o postback devolve como cid={affS1}.
        //          Nunca mandar no campo `clickid` da ProfitAlphas (trackdesk_click_creation_failed).
        // subid2 = gclid/gbraid/wbraid do Google Ads
        subid:   param('subid')  || param('clickid') || param('sub_id')   || param('utm_source'),
        subid2:  param('subid2') || gclid            || param('sub_id_1') || param('utm_campaign'),
        subid3:  param('subid3') || param('sub_id_2') || param('utm_content'),
    };
    for (const k of Object.keys(data)) if (!data[k]) delete data[k];

    // Revalidação no servidor (mesma regra do formulário)
    if (name.length < 3 || !phone) {
        await backupLead('invalid_params', { ...data, raw_phone: rawPhone });
        return redirect(false);
    }

    try {
        const r = await fetch(PA_API_URL, {
            method: 'POST',
            headers: {
                'X-API-KEY': PA_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: new URLSearchParams(data).toString(),
            signal: AbortSignal.timeout(25000),
        });
        const text = await r.text();
        let result = null;
        try { result = JSON.parse(text); } catch (e) {}

        if (result && result.success) {
            console.log('LEAD_OK', JSON.stringify({
                order_id: result.order_id, tracking_id: result.tracking_id, status: result.status,
                subid: data.subid, subid2: data.subid2,
            }));
            return redirect(true, result.order_id);
        }

        await backupLead(`api_${r.status}: ${(result && result.error) || text.slice(0, 200)}`, data);
    } catch (e) {
        await backupLead(`exception: ${e.message}`, data);
    }
    return redirect(false);
};
