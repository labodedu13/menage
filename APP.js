// ============================================
// CONFIGURATION
// ============================================

// URL de ton Apps Script déployé (Déployer > Gérer les déploiements sur script.google.com)
// ⚠️ Remplace par la tienne, elle ressemble à https://script.google.com/macros/s/AKfycb.../exec
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4kkwm7JSmpHHlMdqKSE6EPM0CeHft7uxWLC-u12oYMP8jSV1Nitd9hrmL-G8GllJW/exec";

// Code secret qui doit être identique à CLE_SECRETE dans le script Google (fichier .gs)
// Sert à empêcher que n'importe qui utilise ton script s'il tombe sur l'URL
const CLE_SECRETE = "of5-x7f9o2q4z-154jdye";

// ============================================
// CHARGEMENT DES TÂCHES (appel réseau vers Google)
// ============================================
async function chargerTaches() {
    const liste = document.getElementById("liste-taches");
    try {
        // On envoie une requête GET à Apps Script, avec la clé secrète en paramètre d'URL
        const response = await fetch(`${APPS_SCRIPT_URL}?cle=${encodeURIComponent(CLE_SECRETE)}`);
        const taches = await response.json(); // la réponse est une liste de tâches au format JSON
        afficherTaches(taches);
    } catch (erreur) {
        // Si l'URL est fausse, le script mal déployé, ou pas de connexion internet
        liste.innerHTML = "<li class='erreur'>Impossible de charger les tâches. Vérifie l'URL du script dans app.js.</li>";
        console.error(erreur);
    }
}


// ============================================
// CALCULS DE DATES
// ============================================

// Calcule le nombre de jours écoulés depuis une date donnée (format "yyyy-MM-dd")
// Retourne null si la tâche n'a jamais été validée (pas de date)
function joursDepuis(dateStr) {
    if (!dateStr) return null;
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Détermine l'ordre d'affichage d'une tâche :
// priorite 0 = en retard (affichée en premier)
// priorite 1 = jamais faite (affichée ensuite)
// priorite 2 = à jour (affichée en dernier)
// "valeur" sert à départager les tâches ayant la même priorité
// (ex: plusieurs tâches en retard sont triées de la plus en retard à la moins en retard)
function calculerPriorite(tache, jours) {
    if (jours === null) return { priorite: 1, valeur: 0 };
    const diff = jours - tache.intervalle;
    if (diff >= 0) return { priorite: 0, valeur: diff };   // en retard : plus "diff" est grand, plus c'est urgent
    return { priorite: 2, valeur: diff };                   // à jour : les plus proches de l'échéance remontent légèrement
}


// ============================================
// AFFICHAGE DES TÂCHES DANS LA PAGE
// ============================================
function afficherTaches(taches) {
    const liste = document.getElementById("liste-taches");
    liste.innerHTML = ""; // on vide la liste avant de la reconstruire

    // Étape 1 : on calcule pour chaque tâche son statut (jours écoulés, priorité de tri)
    const tachesEnrichies = taches.map(tache => {
        const jours = joursDepuis(tache.derniereValidation);
        return { tache, jours, ...calculerPriorite(tache, jours) };
    });

    // Étape 2 : on trie la liste (les tâches en retard remontent en haut)
    tachesEnrichies.sort((a, b) => {
        if (a.priorite !== b.priorite) return a.priorite - b.priorite;
        return b.valeur - a.valeur;
    });

    // Étape 3 : on construit le HTML de chaque tâche et on l'ajoute à la page
    tachesEnrichies.forEach(({ tache, jours }) => {
        const jamaisFaite = jours === null;
        const enRetard = !jamaisFaite && jours >= tache.intervalle;

        // Texte et couleur du badge de statut, selon la situation
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
      <!-- La photo change automatiquement selon enRetard (voir les 2 fichiers dans /images) -->
      <img class="tache-photo"
           src="${enRetard ? 'images/tache-retard.jpeg' : 'images/tache-ok.jpeg'}"
           alt="${enRetard ? 'Tâche en retard' : 'Tâche à jour'}">

      <div class="tache-corps">
        <div class="tache-principal">
          <!-- data-id permet de savoir, lors du clic, à quelle tâche (ligne du Google Sheet) ça correspond -->
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
      </div>
    `;

        liste.appendChild(li);
    });

    // Étape 4 : on rebranche les événements sur les nouveaux éléments créés
    // (obligatoire car innerHTML a tout recréé, les anciens écouteurs ont disparu)
    document.querySelectorAll(".case-validation").forEach(checkbox => {
        checkbox.addEventListener("change", validerTache);
    });
    document.querySelectorAll(".intervalle-input").forEach(input => {
        input.addEventListener("change", modifierIntervalle);
    });
}


// ============================================
// ACTIONS UTILISATEUR (envoi vers Google Apps Script)
// ============================================

// Appelée quand on coche une case : enregistre la date du jour comme "dernière validation"
async function validerTache(e) {
    const id = e.target.dataset.id;
    e.target.disabled = true; // évite un double-clic pendant l'envoi
    await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        // "text/plain" est utilisé volontairement : cela évite un problème technique de sécurité
        // du navigateur (CORS) qui bloquerait la requête avec "application/json"
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "validate", id: id, cle: CLE_SECRETE })
    });
    chargerTaches(); // on recharge la liste pour voir le nouveau statut immédiatement
}

// Appelée quand on modifie le nombre de jours d'une tâche
async function modifierIntervalle(e) {
    const id = e.target.dataset.id;
    const intervalle = e.target.value;
    await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "updateIntervalle", id: id, intervalle: intervalle, cle: CLE_SECRETE })
    });
    // Pas besoin de recharger ici : la valeur affichée est déjà celle tapée par l'utilisateur
}


// ============================================
// DÉMARRAGE : on charge les tâches dès l'ouverture de la page
// ============================================
chargerTaches();