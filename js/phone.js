// Normalização de telefone por GEO — usado no formulário (navegador) e no api/order.js (Node).
// Aceita +CC / 00CC / CC / número local, com ou sem espaços, traços, parênteses e zero inicial.
(function (root) {
    var GEOS = {
        // Sérvia: +381, celular 6X + 6 a 7 dígitos (064 123 4567), fixo 1X–3X + 6 a 7 dígitos (011 123 4567)
        RS: { cc: '381', nsn: /^(6\d{7,8}|[1-3]\d{7,8})$/, example: '064 123 4567' }
    };

    function normalizePhone(raw, geo) {
        var g = GEOS[geo];
        if (!g) return null;

        var d = String(raw || '').trim().replace(/^\+/, '00').replace(/\D/g, '');

        if (d.indexOf('00' + g.cc) === 0) d = d.slice(2 + g.cc.length);
        else if (d.indexOf(g.cc) === 0 && d.length > g.cc.length + 7) d = d.slice(g.cc.length);
        d = d.replace(/^0+/, '');

        if (!g.nsn.test(d)) return null;

        return {
            national: d,                                   // 641234567
            intl: g.cc + d,                                // 381641234567 (enviado para a ProfitAlphas)
            e164: '+' + g.cc + d,                          // +381641234567
            display: '0' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5) // 064 123 4567
        };
    }

    var api = { normalizePhone: normalizePhone, PHONE_GEOS: GEOS };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else { root.normalizePhone = normalizePhone; root.PHONE_GEOS = GEOS; }
})(this);
