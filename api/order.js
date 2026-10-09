// ===== CONFIG PROFIT ALPHAS =====
const PA_API_URL  = 'https://api.profitalphas.com/api/v1/nutra/orders';
const PA_API_KEY  = process.env.PA_API_KEY || 'pa_live_b4ROMeCeWi69or9HNZ_t6687JHOxLxAdOH6UQ_ZlXiQ';
const PA_OFFER_ID = process.env.PA_OFFER_ID || 'PA-0VPA'; // Osteon (Sérvia)
// =================================

function redirect(res, location) {
    res.statusCode = 303;
    res.setHeader('Location', location);
    res.end();
}

function visitorIp(req) {
    const h = req.headers;
    const raw = h['x-real-ip'] || h['x-forwarded-for'] || req.socket?.remoteAddress || '';
    return String(raw).split(',')[0].trim();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return redirect(res, '/');

    let body = req.body || {};
    if (typeof body === 'string') body = Object.fromEntries(new URLSearchParams(body));
    const query = req.query || {};
    const param = (key) => String(body[key] ?? query[key] ?? '').trim();

    const name = param('name');
    const phone = param('phone');
    if (!name || !phone) return redirect(res, req.headers.referer || '/');

    const data = {
        offer_id:         PA_OFFER_ID,
        name,
        phone,
        user_agent:       req.headers['user-agent'] || 'unknown',
        ip:               visitorIp(req),
        referer:          param('referer'),
        domain:           req.headers.host || '',
        landing_page_url: param('landing_page_url'),
        address:          param('address'),
        city:             param('city'),

        // tracking: aceita os nomes da ProfitAlphas ou os antigos (sub_id / utm)
        // clickid do rastreador cckdl (cd_...) vai no subid: o postback devolve
        // ele como cid={affS1}. Nunca mandar no campo `clickid` da ProfitAlphas.
        subid:   param('subid')   || param('clickid')  || param('sub_id')   || param('utm_source'),
        subid2:  param('subid2')  || param('sub_id_1') || param('utm_campaign'),
        subid3:  param('subid3')  || param('sub_id_2') || param('utm_content'),
    };
    for (const k of Object.keys(data)) if (!data[k]) delete data[k];

    let status = 0, text = '', result = null;
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
        status = r.status;
        text = await r.text();
        try { result = JSON.parse(text); } catch (e) {}
    } catch (e) {
        text = 'fetch error: ' + e.message;
    }

    if (result && result.success) {
        console.log('LEAD_OK', JSON.stringify({ order_id: result.order_id, status: result.status, subid: data.subid }));
        return redirect(res, '/success.html?id=' + encodeURIComponent(result.order_id || ''));
    }

    // Falhou: lead + erro ficam nos logs da Vercel (Project > Logs) para não perder o pedido
    console.error('LEAD_ERROR', JSON.stringify({ http: status, response: text, lead: data }));
    return redirect(res, '/success.html');
};
