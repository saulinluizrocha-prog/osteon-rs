(function() {
    var queryStr = window.location.search,
        currentRequestModify = '/api/order',
        forms = document.forms,     //search all forms
        formLength = forms.length,  //forms count
        i;

    function addHidden(form, name, value) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }

    if(formLength > 0) {  //If there is at least one form
        for(i = 0; i < formLength; i++) {
            var form = forms[i]; //current form
            form.action = currentRequestModify + queryStr; //set action
            form.method = 'POST';

            addHidden(form, 'referer', document.referrer);
            addHidden(form, 'landing_page_url', window.location.href);

            setupForm(form);
        }
    }

    // Validação (mesma regra do api/order.js), telefone formatado e trava contra clique duplo
    var MSG_NAME = 'Unesite ime i prezime',
        MSG_PHONE = 'Unesite ispravan broj, npr. 064 123 4567';

    function setupForm(form) {
        var nameInput = form.elements.name,
            phoneInput = form.elements.phone,
            button = form.querySelector('button'),
            sending = false;
        if (!nameInput || !phoneInput) return;

        nameInput.required = true;
        phoneInput.required = true;
        phoneInput.setAttribute('inputmode', 'tel');
        phoneInput.placeholder = '064 123 4567';

        function check() {
            nameInput.setCustomValidity(nameInput.value.trim().length >= 3 ? '' : MSG_NAME);
            phoneInput.setCustomValidity(normalizePhone(phoneInput.value, 'RS') ? '' : MSG_PHONE);
        }
        nameInput.addEventListener('input', function() { nameInput.setCustomValidity(''); });
        phoneInput.addEventListener('input', function() { phoneInput.setCustomValidity(''); });
        phoneInput.addEventListener('blur', function() {
            var p = normalizePhone(phoneInput.value, 'RS');
            if (p) phoneInput.value = p.display;
        });

        form.addEventListener('submit', function(event) {
            check();
            if (sending || !form.checkValidity()) {
                event.preventDefault();
                if (!sending) form.reportValidity();
                return;
            }
            sending = true;
            phoneInput.value = normalizePhone(phoneInput.value, 'RS').display;
            if (button) { button.disabled = true; button.style.opacity = '.7'; }
        });

        // Se o lead voltar pelo botão "voltar" do navegador, destrava o formulário
        window.addEventListener('pageshow', function() {
            sending = false;
            if (button) { button.disabled = false; button.style.opacity = ''; }
        });
    }

    var promoEl = document.getElementsByClassName("al-cost-promo");

    for(var i = 0; i < promoEl.length; i++){
        promoEl[i].innerText = "4000 RSD";
    }

    var priceEl = document.getElementsByClassName("al-cost");

    for(var i = 0; i < priceEl.length; i++){
        priceEl[i].innerText = "2000 RSD";
    }

    var scrollBtns = document.getElementsByClassName("ever-popup-btn");

    for(var i = 0; i < scrollBtns.length; i++){
        scrollBtns[i].addEventListener('click', function() {
            document.getElementById('form').scrollIntoView({behavior: 'smooth', block: 'center'});
        });
    }

    var reviewPlus = document.getElementsByClassName("reviews__plus");

    for(var i = 0; i < reviewPlus.length; i++){
        reviewPlus[i].addEventListener('click', function() {
            var text = this.parentNode.querySelector('.reviews__text');
            var open = text.classList.toggle('active');
            this.textContent = open ? '−' : '+';
        });
    }
})();
