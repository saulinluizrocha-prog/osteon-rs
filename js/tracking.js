// Captura gclid/gbraid/wbraid + subid* + utm_* da URL, guarda por 30 dias e preenche campos ocultos no formulário.
// Se o lead voltar depois sem parâmetros na URL, usa o último tracking salvo.
// O clickid do cckdl (cd_...) é colocado pelo próprio script do cckdl e não passa por aqui.
(function () {
    var KEYS = ['gclid', 'gbraid', 'wbraid', 'subid', 'subid2', 'subid3',
        'utm_campaign', 'utm_source', 'utm_medium', 'utm_term', 'utm_content'];
    var STORE = 'os_tracking';
    var TTL = 30 * 24 * 60 * 60 * 1000;

    var q = new URLSearchParams(location.search);
    var fromUrl = {};
    KEYS.forEach(function (k) { if (q.get(k)) fromUrl[k] = q.get(k); });

    var data = fromUrl;
    try {
        if (Object.keys(fromUrl).length) {
            localStorage.setItem(STORE, JSON.stringify({ t: Date.now(), d: fromUrl }));
        } else {
            var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
            if (saved && Date.now() - saved.t < TTL) data = saved.d;
        }
    } catch (e) {}

    function fill() {
        document.querySelectorAll('form').forEach(function (form) {
            KEYS.forEach(function (k) {
                if (!data[k]) return;
                var input = form.querySelector('input[name="' + k + '"]');
                if (!input) {
                    input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = k;
                    form.appendChild(input);
                }
                input.value = data[k];
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
    else fill();
})();
