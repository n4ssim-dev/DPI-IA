# Scénario de démonstration — NovaSanté Lab DPI-IA

Ce document décrit le parcours de démonstration par rôle. Toutes les données
sont fictives et anonymisées.

## Démarrage rapide

```bash
cp .env.example .env
docker compose up
```

Ouvrir **http://localhost:5173** dans Chrome ou Edge (requis pour la dictée
vocale et optimal pour les fonctions IA).

---

## Comptes de démonstration

| Rôle          | Email                            | Mot de passe  |
|---------------|----------------------------------|---------------|
| Médecin       | martin@novasante-lab.fr          | medecin123    |
| Coordinateur  | coordination@novasante-lab.fr    | coord123      |
| Admin         | admin@novasante-lab.fr           | admin123      |

---

## Parcours 1 — Médecin (Dr Martin)

### 1.1 Connexion et liste patients
1. Se connecter avec le compte **médecin**.
2. La liste affiche Jean Dupont, Marie Lefevre, Lucas Bernard.
3. Utiliser la recherche pour trouver « Marie » — filtrage en temps réel.

### 1.2 Vue d'ensemble — Timeline et courbes (Jalon 8)

1. Ouvrir la fiche de **Jean Dupont**.
2. En haut du dossier, avant les onglets, la section **Vue d'ensemble**
   apparaît avec deux visualisations vis.js :
   - **Timeline** : les consultations (bleu), antécédents (orange) et
     traitements (vert) sont positionnés sur la frise. Zoomer/dézoomer
     avec la molette ou en pinçant.
   - **Graph2d** : les courbes de tension systolique et de saturation O₂
     sont visibles sur la même fenêtre temporelle.
3. Cliquer sur une consultation dans la Timeline → un panneau de détail
   s'affiche en bas : date, soignant, motif, observations, constantes liées.
4. Désactiver la courbe `TAS` via le bouton toggle → la courbe disparaît
   du Graph2d. La réactiver.
5. Naviguer (glisser) sur la Timeline → le Graph2d se déplace en synchrone.

### 1.3 Dossier Jean Dupont — alertes et tendance (Jalons 3 & 6)

**Onglet Constantes**

1. Ouvrir la fiche de **Jean Dupont**.
2. Aller dans l'onglet **Constantes**.
3. Les constantes des 5 derniers mois s'affichent. Deux valeurs apparaissent
   déjà avec une alerte ⚠️ (tension 172/105 mmHg, saturation 91 %).
4. Saisir une nouvelle constante : type `saturation_o2`, valeur `90`, unité `%`.
   → L'alerte IA s'affiche immédiatement sous le formulaire, **avant** même
   la sauvegarde, avec le disclaimer obligatoire.
5. Soumettre la constante.

**Section Analyse de tendance**

6. Dans la section « Analyse de tendance », sélectionner `tension_systolique`
   et cliquer **Analyser**.
   → Un graphique linéaire apparaît (142 → 172 mmHg sur 5 mois).
   → Message : *Tendance à la hausse de la tension systolique. Surveillance
   accrue recommandée.* (R² ≈ 0.99).
7. Répéter avec `saturation_o2`.
   → Tendance baisse visible (97 → 91 %), message d'alerte respiratoire.

### 1.4 Dossier Jean Dupont — document OCR (Jalon 4)

**Onglet Documents**

1. Deux documents sont déjà présents avec un texte extrait (simulation OCR) :
   l'ordonnance et le bilan biologique.
2. Cliquer **Utiliser pour une consultation** sous le bilan biologique.
   → L'application bascule automatiquement vers l'onglet **Consultations**
   et pré-remplit le champ Observations avec le texte du document.
3. Compléter le formulaire (Motif : « Bilan de suivi ») et soumettre.

**Upload et OCR en direct**

4. Cliquer **Parcourir** et sélectionner une image PNG/JPG contenant du texte
   (ordonnance scannée, photo d'une feuille d'examen).
   → La barre de progression OCR s'affiche (Tesseract.js, 100 % client).
   → Le texte extrait apparaît dans une zone éditable avec le disclaimer.
5. Soumettre → le texte est persisté en base.

### 1.5 Dictée vocale (Jalon 5) — onglet Consultations

1. Ouvrir l'onglet **Consultations**.
2. Remplir le champ Motif : « Contrôle ».
3. Cliquer **🎙 Dicter** à côté de Observations.
   → Le bouton passe en rouge, le point rouge pulse.
4. Dicter : *« Tension toujours élevée, patient se plaint de céphalées. »*
5. Le texte apparaît dans le champ Observations en temps réel.
6. Cliquer **Arrêter**. Le texte reste éditable avant soumission.

### 1.6 Dossier Marie Lefevre — glycémie et fièvre

1. Ouvrir la fiche de **Marie Lefevre**, onglet **Constantes**.
2. Deux alertes IA sont visibles : glycémie 1.58 g/L et température 38.4 °C.
3. Lancer l'analyse de tendance sur `glycemie`.
   → Hausse franche (0.82 → 1.58 g/L sur 4 mois, R² ≈ 0.97).
4. Onglet **Documents** : le compte-rendu d'endocrinologie a un texte OCR
   pré-rempli. Cliquer **Utiliser pour une consultation**.

---

## Parcours 2 — Coordinateur (Sophie)

1. Se connecter avec le compte **coordinateur**.
2. La liste patients est identique (même accès lecture).
3. Ouvrir la fiche de **Lucas Bernard**, onglet **Constantes**.
   → Alertes visibles : température 38.8 °C et 39.2 °C.
4. Analyser la tendance `temperature` : hausse confirmée (R² ≈ 0.92).
5. Onglet **Documents** : carnet de vaccination avec texte OCR pré-rempli.
6. Onglet **Consultations** : vérifier l'historique des 4 consultations.

> **Note** : le coordinateur peut consulter les dossiers mais n'a pas accès
> à la gestion des comptes (réservée à l'admin).

---

## Parcours 3 — Admin

1. Se connecter avec le compte **admin**.
2. Naviguer vers **Gestion des utilisateurs** (menu admin).
3. Vérifier les trois comptes existants (médecin, coordinateur, admin).
4. *(Optionnel en démo)* Créer un nouveau compte coordinateur.

---

## Points clés à mettre en avant

| Fonctionnalité | Emplacement | Ce qu'on démontre |
|---|---|---|
| Vue d'ensemble Timeline + Graph2d | En tête du dossier patient | vis-timeline CDN, synchronisation, panneau de détail |
| Alerte constante anormale | Onglet Constantes, fiche Jean | TF.js, inférence client, disclaimer |
| Analyse de tendance | Section Tendance, onglet Constantes | Régression linéaire, graphique Chart.js |
| OCR de document | Onglet Documents | Tesseract.js, pré-remplissage, disclaimer |
| Dictée vocale | Onglet Consultations | Web Speech API, retour visuel, repli navigateur |
| Pré-remplissage OCR→Consultation | Bouton "Utiliser" | Liaison Documents ↔ Consultations |

---

## Réinitialiser la base de données

Pour repartir d'un état vierge (données seed fraîches) :

```bash
docker compose down -v && docker compose up
```

---

## Retours à collecter

Après la démonstration, documenter les retours dans
[FEEDBACK.md](FEEDBACK.md) (à créer) selon les axes :
- Ce qui fonctionne bien
- Ce qui manque ou déroute
- Priorités pour la V2 (voir [SPEC.md section 14](SPEC.md#14-extensions-futures-v2))
