window.addEventListener("load", function() {
    window.location.hash = "";
    window.scrollTo(0, 0);
});





emailjs.init({
    publicKey: "T1krdtfXGRmWcPnPS"
});

const SUPABASE_URL = "https://cnprfkuepnbicjgogioz.supabase.co";
const SUPABASE_KEY = "sb_publishable_e4pLKphkXb8oG1lGbVYe_g_d8rpUzuI";

const formulier = document.querySelector("form");
const datum = document.querySelector("#datum");
const tijd = document.querySelector("#tijd");

datum.min = new Date().toISOString().split("T")[0];
datum.addEventListener("change", function() {
    const gekozenDatum = new Date(this.value + "T00:00:00");
    const dag = gekozenDatum.getDay();

    if (dag === 0 || dag === 1 || dag === 3) {
        alert("Op deze dag is Kwaffeur Francois gesloten. Kies een andere dag.");
        this.value = "";
        return;
    }

    tijd.innerHTML = '<option value="">Kies een uur</option>';

    let einduur = 18;

    if (dag === 6) {
        einduur = 12;
    }

    for (let uur = 8; uur < einduur; uur++) {
        tijd.innerHTML += `<option>${String(uur).padStart(2, "0")}:00</option>`;
        tijd.innerHTML += `<option>${String(uur).padStart(2, "0")}:30</option>`;
    }
});

formulier.addEventListener("submit", async function(event) {
    event.preventDefault();

    const naam = document.querySelector("#naam").value;
    const telefoon = document.querySelector("#telefoon").value;
    const gekozenDatum = datum.value;
    const gekozenTijd = tijd.value;

    // Controleer of het uur al bezet is
    const controle = await fetch(
        `${SUPABASE_URL}/rest/v1/booked_slots?date=eq.${gekozenDatum}&time=eq.${gekozenTijd}&select=id`,
        {
            headers: {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY
}
        }
    );

if (!controle.ok) {
    const fout = await controle.text();
    console.log("SUPABASE FOUT:", controle.status, fout);
    alert("SUPABASE FOUT " + controle.status + ": " + fout);
    return;
}

    const bestaandeAfspraken = await controle.json();

    if (bestaandeAfspraken.length > 0) {
        alert("Dit uur is al bezet. Kies een ander uur.");
        return;
    }

    // Sla de afspraak op in appointments
    const opslaan = await fetch(
        `${SUPABASE_URL}/rest/v1/appointments`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({
                name: naam,
                phone: telefoon,
                date: gekozenDatum,
                time: gekozenTijd
            })
        }
    );

    if (!opslaan.ok) {
        alert("Er ging iets mis met de afspraak. Probeer opnieuw.");
        return;
    }

    // Zet het uur op bezet
    const bezet = await fetch(
        `${SUPABASE_URL}/rest/v1/booked_slots`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({
                date: gekozenDatum,
                time: gekozenTijd
            })
        }
    );

    if (!bezet.ok) {
        alert("De afspraak is opgeslagen, maar het uur kon niet als bezet worden gemarkeerd.");
        return;
    }

    // Stuur e-mail naar je opa
    emailjs.send("service_qdtdvde", "template_yqbyskv", {
        name: naam,
        time: gekozenDatum + " om " + gekozenTijd,
        message: "Telefoonnummer: " + telefoon
    })
    .then(function() {
        alert("Je afspraakaanvraag is verzonden!");
        formulier.reset();
    })
    .catch(function(error) {
        console.log(error);
        alert("De afspraak is opgeslagen, maar de e-mail kon niet worden verzonden.");
    });
});// STATUS VANDAAG

const statusVandaag = document.querySelector("#status-vandaag");

function toonStatusVandaag() {
    const nu = new Date();
    const dag = nu.getDay();
    const uur = nu.getHours() + nu.getMinutes() / 60;

    let open = false;
    let sluituur = "";

    if (dag === 2 || dag === 4 || dag === 5) {
        if (uur >= 8 && uur < 18) {
            open = true;
            sluituur = "18:00";
        }
    }

    if (dag === 6) {
        if (uur >= 8 && uur < 12) {
            open = true;
            sluituur = "12:00";
        }
    }

    if (open) {
        statusVandaag.innerHTML = "🟢 Vandaag geopend · tot " + sluituur;
    } else {
        statusVandaag.innerHTML = "🔴 Vandaag gesloten";
    }
}

toonStatusVandaag();
// WINKELMANDJE OPENEN EN SLUITEN

const winkelmandjeKnop = document.querySelector("#winkelmandje-knop");
const winkelmandje = document.querySelector("#winkelmandje");
const mandjeSluiten = document.querySelector("#mandje-sluiten");

winkelmandjeKnop.addEventListener("click", function() {
    winkelmandje.classList.add("open");
});

mandjeSluiten.addEventListener("click", function() {
    winkelmandje.classList.remove("open");
});

// PRODUCTEN IN WINKELMANDJE

let productenInMandje = [];

const productKnoppen = document.querySelectorAll(".bestel-product");
const mandjeInhoud = document.querySelector("#mandje-inhoud");
const mandjeAantal = document.querySelector("#mandje-aantal");
const mandjeTotaal = document.querySelector("#mandje-totaal");

function toonWinkelmandje() {
    mandjeInhoud.innerHTML = "";

    if (productenInMandje.length === 0) {
        mandjeInhoud.innerHTML = "<p>Je winkelmandje is leeg.</p>";
        mandjeAantal.textContent = "0";
        mandjeTotaal.textContent = "0";
        return;
    }

    let totaal = 0;
    let aantal = 0;

    productenInMandje.forEach(function(product, index) {
        totaal += product.prijs * product.aantal;
        aantal += product.aantal;

        const productRegel = document.createElement("div");

        productRegel.innerHTML = `
            <h3>${product.naam}</h3>
            <p>€${product.prijs} × ${product.aantal}</p>

            <button type="button" onclick="verlaagAantal(${index})">−</button>
            <button type="button" onclick="verhoogAantal(${index})">+</button>
            <button type="button" onclick="verwijderProduct(${index})">Verwijderen</button>
        `;

        mandjeInhoud.appendChild(productRegel);
    });

    mandjeAantal.textContent = aantal;
    mandjeTotaal.textContent = totaal;
}

productKnoppen.forEach(function(knop) {
    knop.addEventListener("click", function() {

        const naam = knop.dataset.naam;
        const prijs = Number(knop.dataset.prijs);

        const bestaandProduct = productenInMandje.find(function(product) {
            return product.naam === naam;
        });

        if (bestaandProduct) {
            bestaandProduct.aantal++;
        } else {
            productenInMandje.push({
                naam: naam,
                prijs: prijs,
                aantal: 1
            });
        }

        toonWinkelmandje();
        winkelmandje.classList.add("open");
    });
});

function verhoogAantal(index) {
    productenInMandje[index].aantal++;
    toonWinkelmandje();
}

function verlaagAantal(index) {
    productenInMandje[index].aantal--;

    if (productenInMandje[index].aantal <= 0) {
        productenInMandje.splice(index, 1);
    }

    toonWinkelmandje();
}

function verwijderProduct(index) {
    productenInMandje.splice(index, 1);
    toonWinkelmandje();
}

toonWinkelmandje();
const bestellenKnop = document.querySelector("#bestellen-knop");
const bestellingFormulier = document.querySelector("#bestelling-formulier");

bestellenKnop.addEventListener("click", function() {
    bestellingFormulier.style.display = "block";
});
const bestellingVersturen = document.querySelector("#bestelling-versturen");

bestellingVersturen.addEventListener("click", function() {

    const naam = document.querySelector("#bestel-naam").value;
    const telefoon = document.querySelector("#bestel-telefoon").value;

    if (naam === "" || telefoon === "") {
        alert("Vul eerst je naam en telefoonnummer in.");
        return;
    }

    let productenTekst = "";
    let totaal = 0;

    productenInMandje.forEach(function(product) {
        productenTekst += product.naam + " × " + product.aantal + "\n";
        totaal += product.prijs * product.aantal;
    });

    emailjs.send("service_qdtdvde", "template_yqbyskv", {
        name: naam,
        time: "Bestelling - ophalen in het salon",
        message:
            "Telefoonnummer: " + telefoon +
            "\n\nProducten:\n" + productenTekst +
            "\nTotaal: €" + totaal
    })
    .then(function() {

        alert("Je bestelling is verzonden! ❤️");

        productenInMandje = [];
        toonWinkelmandje();

        document.querySelector("#bestel-naam").value = "";
        document.querySelector("#bestel-telefoon").value = "";

        bestellingFormulier.style.display = "none";

    })
    .catch(function(error) {

        console.log(error);
        alert("Er ging iets mis. Probeer opnieuw.");

    });
});
const kapselFotos = document.querySelectorAll(".kapsel-fotos img, .salon-fotos img");
const fotoPopup = document.querySelector("#foto-popup");
const groteFoto = document.querySelector("#grote-foto");
const fotoPopupSluiten = document.querySelector("#foto-popup-sluiten");

kapselFotos.forEach(function(foto) {
    foto.addEventListener("click", function() {
        groteFoto.src = foto.src;
        fotoPopup.classList.add("open");
    });
});

fotoPopupSluiten.addEventListener("click", function() {
    fotoPopup.classList.remove("open");
});

fotoPopup.addEventListener("click", function(event) {
    if (event.target === fotoPopup) {
        fotoPopup.classList.remove("open");
    }
});