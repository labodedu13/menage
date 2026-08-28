// ⚠️ Remplace cette URL par celle obtenue après le déploiement de ton Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4kkwm7JSmpHHlMdqKSE6EPM0CeHft7uxWLC-u12oYMP8jSV1Nitd9hrmL-G8GllJW/exec";
// ⚠️ Doit être exactement la même valeur que CLE_SECRETE dans le script Google
const CLE_SECRETE = "of5-x7f9o2q4z-154jdye";

async function chargerTaches() {
    const liste = document.getElementById("liste-taches");
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?cle=${encodeURIComponent(CLE_SECRETE)}`);
        const taches = await response.json();
        afficherTaches(taches);
    } catch (erreur) {
        liste.innerHTML = "<li class='erreur'>Impossible de charger les tâches. Vérifie l'URL du script dans app.js.</li>";
        console.error(erreur);
    }
}

function joursDepuis(dateStr) {
    if (!dateStr) return null;
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function afficherTaches(taches) {
    const liste = document.getElementById("liste-taches");
    liste.innerHTML = "";

    taches.forEach(tache => {
        const jours = joursDepuis(tache.derniereValidation);
        const jamaisFaite = jours === null;
        const enRetard = !jamaisFaite && jours >= tache.intervalle;

        let texteStatut;
        let classeStatut;
        if (jamaisFaite) {
            texteStatut = "Jamais faite";
            classeStatut = "jamais-faite";
        } else if (enRetard) {
            texteStatut = `En retard (${jours} j.)`;
            classeStatut = "en-retard";
        } else {
            texteStatut = `Faite il y a ${jours} j.`;
            classeStatut = "a-jour";
        }

        const li = document.createElement("li");
        li.className = "tache";
        li.innerHTML = `
      <div class="tache-principal">
        <input type="checkbox" class="case-validation" data-id="${tache.id}">
        <div class="tache-infos">
          <span class="nom-tache">${tache.nom}</span>
          <span class="piece">${tache.piece}</span>
        </div>
      </div>
      <div class="tache-details">
        <span class="statut ${classeStatut}">${texteStatut}</span>
        <label class="intervalle-label">
          Refaire tous les
          <input type="number" min="1" class="intervalle-input" data-id="${tache.id}" value="${tache.intervalle}">
          jours
        </label>
      </div>
    `;

        liste.appendChild(li);
    });

    document.querySelectorAll(".case-validation").forEach(checkbox => {
        checkbox.addEventListener("change", validerTache);
    });
    document.querySelectorAll(".intervalle-input").forEach(input => {
        input.addEventListener("change", modifierIntervalle);
    });
}

async function validerTache(e) {
    const id = e.target.dataset.id;
    e.target.disabled = true;
    await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "validate", id: id, cle: CLE_SECRETE })
    });
    chargerTaches();
}

async function modifierIntervalle(e) {
    const id = e.target.dataset.id;
    const intervalle = e.target.value;
    await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "updateIntervalle", id: id, intervalle: intervalle, cle: CLE_SECRETE })
    });
}

chargerTaches();