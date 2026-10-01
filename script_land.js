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
            if (name = form.name)
                name.required = true;  //set required

            if (phone = form.phone)
                phone.required = true;

            if (country = form.country)
                country.style.display = "none";

            addHidden(form, 'referer', document.referrer);
            addHidden(form, 'landing_page_url', window.location.href);

            form.method = 'POST';
        }
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
})();
