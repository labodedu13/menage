# 🏠 Ménage — Suivi des tâches ménagères

## Présentation

Ce site permet de suivre les tâches ménagères d'un foyer et de savoir en un coup d'œil lesquelles sont à jour et lesquelles doivent être refaites.

**Comment ça marche, concrètement :**

1. Le site affiche une liste de tâches (ex: *passer l'aspirateur*, *faire la vaisselle*...), chacune associée à une pièce et à un **intervalle en jours** (ex: tous les 7 jours).
2. Quand une tâche est faite, on coche la case correspondante : la date du jour est alors enregistrée comme "dernière fois où c'était fait".
3. Le site calcule automatiquement, pour chaque tâche, le nombre de jours écoulés depuis sa dernière validation. Si ce nombre dépasse l'intervalle prévu, la tâche est marquée **"en retard"**, remonte en haut de la liste, et sa photo change pour le signaler visuellement.
4. Chaque jour, indépendamment de si quelqu'un ouvre le site ou non, un programme vérifie automatiquement toutes les tâches et **envoie un mail de rappel** si certaines sont en retard.
5. L'intervalle (le nombre de jours) est **modifiable individuellement pour chaque tâche** directement depuis le site.

**Point technique important :** le site en lui-même (hébergé sur GitHub Pages) est une simple page web statique — il ne peut ni stocker de données ni envoyer de mails tout seul. Ces deux fonctions sont donc déléguées à un **Google Sheet** (qui sert de base de données) et un script **Google Apps Script** associé (qui gère la lecture/écriture des données et l'envoi automatique des mails, en tournant sur les serveurs de Google).

## Architecture générale

```
Visiteur du site
      │
      ▼
index.html + style.css + app.js   (hébergés sur GitHub Pages)
      │
      │  requêtes GET / POST (avec une clé secrète)
      ▼
Google Apps Script (doGet / doPost)
      │
      ▼
Google Sheet   (stocke : nom de la tâche, pièce, intervalle, date de dernière validation)

Chaque jour, indépendamment des visites :
Google Apps Script (déclencheur programmé) → vérifie les dates → envoie un mail si besoin
```

## Description des fichiers

### `index.html`
Le squelette de la page. Il ne contient presque pas de contenu en dur : juste un titre, une description, et une liste vide (`<ul id="liste-taches">`) qui sera **remplie automatiquement par `app.js`** une fois la page chargée. Il charge aussi `style.css` (l'apparence) et `app.js` (le comportement).

### `style.css`
Toute l'apparence visuelle du site : couleurs, espacements, coins arrondis, dégradé de l'en-tête, mise en page des cartes de tâches (photo à gauche + informations à droite), et les couleurs des badges de statut (vert = à jour, rouge = en retard, orange = jamais faite).

### `app.js`
Le "cerveau" côté site. Il :
- appelle le script Google (via `fetch`) pour récupérer la liste des tâches au chargement de la page ;
- calcule pour chaque tâche si elle est en retard, et trie la liste pour remonter les plus urgentes en haut ;
- construit dynamiquement le HTML de chaque tâche (photo, nom, pièce, statut, réglage de l'intervalle) ;
- envoie une requête au script Google quand on coche une case (validation) ou qu'on change l'intervalle d'une tâche.

Il contient une **clé secrète** (`CLE_SECRETE`) et l'**URL du script Google** (`APPS_SCRIPT_URL`), qui doivent correspondre exactement à ce qui est configuré côté Google Apps Script.

### `code-google-apps-script.gs`
⚠️ Ce fichier n'est pas hébergé sur GitHub Pages — il est à coller dans l'éditeur **Google Apps Script**, lié au Google Sheet qui sert de base de données. Il contient trois fonctions :
- **`doGet`** : répond quand `app.js` demande la liste des tâches (au chargement du site).
- **`doPost`** : répond quand `app.js` envoie une validation de tâche ou un changement d'intervalle, et met à jour le Google Sheet en conséquence.
- **`verifierEtEnvoyerRappels`** : ne communique pas avec le site. Elle est déclenchée **automatiquement chaque jour** (via un déclencheur programmé configuré dans Apps Script) et envoie un mail de rappel si des tâches sont en retard.

Toutes les fonctions vérifient une **clé secrète** avant d'agir, pour empêcher que quelqu'un d'autre que le site n'utilise ce script.

### `images/`
Dossier contenant les deux photos utilisées à côté de chaque tâche :
- `tache-ok.jpeg` : affichée quand la tâche est à jour ou jamais faite.
- `tache-retard.jpeg` : affichée à la place dès que la tâche est en retard.

## Le Google Sheet (non présent dans ce repository)

Un Google Sheet séparé sert de base de données, avec les colonnes suivantes :

| Colonne | Contenu |
|---|---|
| A | ID de la tâche |
| B | Nom de la tâche |
| C | Pièce concernée |
| D | Intervalle en jours (modifiable depuis le site) |
| E | Date de dernière validation |

C'est ce Google Sheet, combiné au script Apps Script, qui remplace une vraie base de données et un vrai serveur, sans avoir besoin d'en héberger un soi-même.