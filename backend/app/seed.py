"""Jeu de données de démonstration (fictif, anonymisé).

Exécuté au démarrage du backend (voir entrypoint.sh). Idempotent : ne fait
rien si des utilisateurs existent déjà en base.

Couvre tous les cas d'usage IA :
  - Constantes anormales → alertes TensorFlow.js (Jalon 3)
  - Historique OCR pré-rempli → texte_extrait dans les documents (Jalon 4)
  - Tendance hausse/baisse/stable sur ≥ 3 mesures (Jalon 6)
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.database import SessionLocal
from app.models import (
    Antecedent,
    Constante,
    Consultation,
    Document,
    Patient,
    RoleUtilisateur,
    TraitementEnCours,
    TypeAntecedent,
    TypeConstante,
    Utilisateur,
)
from app.security import hash_password


def _c(patient_id, consultation_id, type_, valeur, unite, date_mesure):
    return Constante(
        patient_id=patient_id,
        consultation_id=consultation_id,
        type=type_,
        valeur=valeur,
        unite=unite,
        date_mesure=date_mesure,
    )


def run() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(Utilisateur)) is not None:
            return  # déjà initialisé

        # ------------------------------------------------------------------ #
        # Utilisateurs                                                         #
        # ------------------------------------------------------------------ #
        admin = Utilisateur(
            nom="Admin NovaSanté",
            email="admin@novasante-lab.fr",
            mot_de_passe_hash=hash_password("admin123"),
            role=RoleUtilisateur.admin,
        )
        dr_martin = Utilisateur(
            nom="Dr Martin",
            email="martin@novasante-lab.fr",
            mot_de_passe_hash=hash_password("medecin123"),
            role=RoleUtilisateur.medecin,
        )
        coordinateur = Utilisateur(
            nom="Sophie Coordinatrice",
            email="coordination@novasante-lab.fr",
            mot_de_passe_hash=hash_password("coord123"),
            role=RoleUtilisateur.coordinateur,
        )
        db.add_all([admin, dr_martin, coordinateur])
        db.flush()

        now = datetime.now(timezone.utc)

        # ------------------------------------------------------------------ #
        # Patients                                                             #
        # ------------------------------------------------------------------ #
        jean = Patient(
            nom="Dupont",
            prenom="Jean",
            date_naissance=date(1960, 5, 12),
            sexe="M",
            telephone="0600000001",
            email="jean.dupont@example.com",
            adresse="1 rue de la Santé, 75000 Paris",
            medecin_referent_id=dr_martin.id,
        )
        marie = Patient(
            nom="Lefevre",
            prenom="Marie",
            date_naissance=date(1985, 9, 23),
            sexe="F",
            telephone="0600000002",
            email="marie.lefevre@example.com",
            adresse="2 avenue des Lilas, 75000 Paris",
            medecin_referent_id=dr_martin.id,
        )
        lucas = Patient(
            nom="Bernard",
            prenom="Lucas",
            date_naissance=date(2015, 3, 2),
            sexe="M",
            telephone="0600000003",
            adresse="3 impasse des Roses, 75000 Paris",
            medecin_referent_id=dr_martin.id,
        )
        db.add_all([jean, marie, lucas])
        db.flush()

        # ------------------------------------------------------------------ #
        # Antécédents                                                          #
        # ------------------------------------------------------------------ #
        db.add_all(
            [
                Antecedent(
                    patient_id=jean.id,
                    type=TypeAntecedent.allergie,
                    description="Allergie à la pénicilline",
                ),
                Antecedent(
                    patient_id=jean.id,
                    type=TypeAntecedent.pathologie_chronique,
                    description="Hypertension artérielle",
                ),
                Antecedent(
                    patient_id=jean.id,
                    type=TypeAntecedent.pathologie_chronique,
                    description="Insuffisance veineuse chronique",
                ),
                Antecedent(
                    patient_id=marie.id,
                    type=TypeAntecedent.pathologie_chronique,
                    description="Diabète de type 2",
                ),
                Antecedent(
                    patient_id=marie.id,
                    type=TypeAntecedent.allergie,
                    description="Allergie aux sulfamides",
                ),
                Antecedent(
                    patient_id=lucas.id,
                    type=TypeAntecedent.autre,
                    description="Asthme léger, traitement de fond depuis 2021",
                ),
            ]
        )

        # ------------------------------------------------------------------ #
        # Traitements                                                          #
        # ------------------------------------------------------------------ #
        db.add_all(
            [
                TraitementEnCours(
                    patient_id=jean.id,
                    nom_medicament="Amlodipine 5 mg",
                    posologie="1 comprimé par jour le matin",
                    date_debut=date(2023, 1, 10),
                ),
                TraitementEnCours(
                    patient_id=jean.id,
                    nom_medicament="Périndopril 4 mg",
                    posologie="1 comprimé par jour le soir",
                    date_debut=date(2024, 3, 15),
                ),
                TraitementEnCours(
                    patient_id=marie.id,
                    nom_medicament="Metformine 500 mg",
                    posologie="2 comprimés par jour au repas",
                    date_debut=date(2022, 6, 1),
                ),
                TraitementEnCours(
                    patient_id=marie.id,
                    nom_medicament="Sitagliptine 100 mg",
                    posologie="1 comprimé par jour",
                    date_debut=date(2024, 9, 1),
                ),
                TraitementEnCours(
                    patient_id=lucas.id,
                    nom_medicament="Fluticasone spray nasal",
                    posologie="2 bouffées matin et soir",
                    date_debut=date(2021, 5, 20),
                ),
            ]
        )

        # ------------------------------------------------------------------ #
        # Jean Dupont — 6 consultations sur 5 mois                           #
        # Tendances : tension hausse franche, saturation baisse, FC légère   #
        # Valeurs anormales : tension élevée, saturation basse, glycémie     #
        # ------------------------------------------------------------------ #
        jean_series = [
            # (jours_avant, sys, dia, fc, sat_o2, glycemie, motif, obs, conc)
            (
                150, 142, 88, 72, 97, None,
                "Contrôle hypertension",
                "Patient bien équilibré, tension légèrement haute.",
                "Maintien du traitement, contrôle à 4 semaines.",
            ),
            (
                120, 146, 91, 74, 95, None,
                "Suivi tension artérielle",
                "Légère hausse de la systolique, observance vérifiée.",
                "Rappel des règles hygiéno-diététiques.",
            ),
            (
                90, 152, 94, 77, 94, None,
                "Suivi tension artérielle",
                "Progression de la tension, patient peu symptomatique.",
                "Ajout Périndopril envisagé.",
            ),
            (
                60, 158, 97, 80, 93, None,
                "Suivi tension artérielle — bilan",
                "Résistance partielle au traitement actuel.",
                "Ajout Périndopril 4 mg. Bilan rénal prévu.",
            ),
            (
                30, 165, 101, 84, 92, 1.42,
                "Bilan complet — hypertension résistante",
                "Tension toujours élevée malgré bithérapie. Glycémie élevée découverte fortuitement.",
                "Consultation endocrinologie recommandée. Saturation à surveiller.",
            ),
            (
                3, 172, 105, 88, 91, 1.78,
                "Urgence relative — poussée hypertensive",
                "Tension très élevée (172/105). Malaise léger signalé. Saturation à 91 % (anormale). Glycémie à 1.78 g/L.",
                "Hospitalisation courte durée envisagée. Bilan cardiologique urgent.",
            ),
        ]

        for days_ago, sys_t, dia_t, fc, sat, glyc, motif, obs, conc in jean_series:
            d = now - timedelta(days=days_ago)
            consult = Consultation(
                patient_id=jean.id,
                soignant_id=dr_martin.id,
                date=d,
                motif=motif,
                observations=obs,
                conclusion=conc,
            )
            db.add(consult)
            db.flush()
            mesures = [
                _c(jean.id, consult.id, TypeConstante.tension_systolique, sys_t, "mmHg", d),
                _c(jean.id, consult.id, TypeConstante.tension_diastolique, dia_t, "mmHg", d),
                _c(jean.id, consult.id, TypeConstante.frequence_cardiaque, fc, "bpm", d),
                _c(jean.id, consult.id, TypeConstante.saturation_o2, sat, "%", d),
            ]
            if glyc is not None:
                mesures.append(_c(jean.id, consult.id, TypeConstante.glycemie, glyc, "g/L", d))
            db.add_all(mesures)

        # ------------------------------------------------------------------ #
        # Marie Lefevre — 5 consultations sur 4 mois                         #
        # Tendances : glycémie hausse franche, température légère hausse      #
        # Valeurs anormales : glycémie élevée, température > 37.8 °C         #
        # ------------------------------------------------------------------ #
        marie_series = [
            (
                120, 0.82, 36.9, 68,
                "Bilan glycémique trimestriel",
                "Glycémie à jeun dans la norme haute. Patient observante.",
                "Maintien traitement, règles diéto.",
            ),
            (
                90, 0.95, 37.1, 70,
                "Suivi diabète",
                "Légère hausse glycémique.",
                "Renforcement activité physique conseillé.",
            ),
            (
                60, 1.10, 37.4, 69,
                "Suivi diabète",
                "Glycémie à la limite haute de la normale.",
                "Ajustement diéto, suivi rapproché.",
            ),
            (
                30, 1.35, 37.9, 74,
                "Suivi diabète — déséquilibre",
                "Glycémie nettement élevée. Légère fièvre non expliquée.",
                "Augmentation dose Metformine. Bilan infectieux demandé.",
            ),
            (
                5, 1.58, 38.4, 80,
                "Urgence diabète — glycémie élevée",
                "Glycémie très élevée (1.58 g/L). Fièvre à 38.4 °C. Tachycardie légère.",
                "Bilan infectieux urgent. Ajout Sitagliptine. Hospitalisation non retenue.",
            ),
        ]

        for days_ago, glyc, temp, fc, motif, obs, conc in marie_series:
            d = now - timedelta(days=days_ago)
            consult = Consultation(
                patient_id=marie.id,
                soignant_id=dr_martin.id,
                date=d,
                motif=motif,
                observations=obs,
                conclusion=conc,
            )
            db.add(consult)
            db.flush()
            db.add_all(
                [
                    _c(marie.id, consult.id, TypeConstante.glycemie, glyc, "g/L", d),
                    _c(marie.id, consult.id, TypeConstante.temperature, temp, "°C", d),
                    _c(marie.id, consult.id, TypeConstante.frequence_cardiaque, fc, "bpm", d),
                ]
            )

        # ------------------------------------------------------------------ #
        # Lucas Bernard — 4 consultations sur 3 mois                         #
        # Tendances : poids/taille stables (croissance), température hausse   #
        # Valeurs anormales : température fébrile > 37.8 °C                  #
        # ------------------------------------------------------------------ #
        lucas_series = [
            (
                90, 18.0, 106, 36.5,
                "Bilan pédiatrique annuel",
                "Bonne croissance, vaccinations à jour.",
                "Prochain bilan dans 1 an.",
            ),
            (
                60, 18.5, 107, 36.7,
                "Consultation asthme — suivi",
                "Asthme bien contrôlé, pas de crise.",
                "Maintien du traitement de fond.",
            ),
            (
                30, 19.0, 108, 38.1,
                "Consultation fièvre",
                "Fièvre à 38.1 °C depuis 2 jours. Rhinopharyngite.",
                "Paracétamol, repos, contrôle à J3.",
            ),
            (
                7, 19.2, 109, 39.2,
                "Réévaluation fièvre persistante",
                "Fièvre à 39.2 °C persistante malgré antipyrétiques.",
                "Bilan biologique prescrit. Angine bactérienne suspectée. Amoxicilline 10 jours.",
            ),
        ]

        for days_ago, poids, taille, temp, motif, obs, conc in lucas_series:
            d = now - timedelta(days=days_ago)
            consult = Consultation(
                patient_id=lucas.id,
                soignant_id=dr_martin.id,
                date=d,
                motif=motif,
                observations=obs,
                conclusion=conc,
            )
            db.add(consult)
            db.flush()
            db.add_all(
                [
                    _c(lucas.id, consult.id, TypeConstante.poids, poids, "kg", d),
                    _c(lucas.id, consult.id, TypeConstante.taille, taille, "cm", d),
                    _c(lucas.id, consult.id, TypeConstante.temperature, temp, "°C", d),
                ]
            )

        # ------------------------------------------------------------------ #
        # Documents avec texte OCR pré-rempli                                 #
        # Illustre la fonctionnalité texte_extrait (Jalon 4)                  #
        # ------------------------------------------------------------------ #
        db.add_all(
            [
                Document(
                    patient_id=jean.id,
                    type="ordonnance",
                    nom_fichier="ordonnance_jean_dupont_2024.jpg",
                    nom_original="Ordonnance Dr Martin – Jean Dupont.jpg",
                    texte_extrait=(
                        "ORDONNANCE MÉDICALE\n"
                        "Dr Martin – 1 rue de la Paix, 75001 Paris\n"
                        "Patient : Jean Dupont, né le 12/05/1960\n"
                        "Date : 15/04/2025\n\n"
                        "Amlodipine 5 mg – 1 cp/j le matin – 3 mois\n"
                        "Périndopril 4 mg – 1 cp/j le soir – 3 mois\n"
                        "Surveillance tensionnelle hebdomadaire.\n"
                        "Non substituable."
                    ),
                ),
                Document(
                    patient_id=jean.id,
                    type="resultat_analyse",
                    nom_fichier="bilan_biologique_jean_2025.jpg",
                    nom_original="Bilan biologique – Jean Dupont – Mars 2025.jpg",
                    texte_extrait=(
                        "LABORATOIRE BIOANALYSE\n"
                        "Patient : Dupont Jean – 12/05/1960\n"
                        "Prescripteur : Dr Martin\n\n"
                        "Glycémie à jeun : 1.42 g/L  [N: 0.70 – 1.10]  ÉLEVÉ ↑\n"
                        "Créatininémie : 92 µmol/L  [N: 60 – 110]  normale\n"
                        "Natrémie : 139 mmol/L  [N: 136 – 145]  normale\n"
                        "Kaliémie : 4.1 mmol/L  [N: 3.5 – 5.0]  normale\n"
                        "HbA1c : 6.8 %  [N: < 6.0]  ÉLEVÉ ↑"
                    ),
                ),
                Document(
                    patient_id=marie.id,
                    type="compte_rendu",
                    nom_fichier="cr_endocrino_marie_lefevre.jpg",
                    nom_original="CR consultation endocrinologie – Marie Lefevre.jpg",
                    texte_extrait=(
                        "COMPTE-RENDU DE CONSULTATION – ENDOCRINOLOGIE\n"
                        "Hôpital Saint-Louis, Service Endocrinologie\n"
                        "Patient : Lefevre Marie, née le 23/09/1985\n"
                        "Adressée par : Dr Martin pour déséquilibre diabétique\n\n"
                        "Antécédents : Diabète type 2 depuis 2022. Allergie sulfamides.\n"
                        "Traitement actuel : Metformine 500 mg x2/j + Sitagliptine 100 mg.\n\n"
                        "HbA1c : 7.9 % (objectif < 7 %). Glycémie veineuse : 1.58 g/L.\n"
                        "Pas de complications micro-angiopathiques à ce stade.\n\n"
                        "Conduite : Renforcer l'éducation thérapeutique. Envisager insuline\n"
                        "basale si HbA1c > 8 % au prochain contrôle. RDV dans 3 mois."
                    ),
                ),
                Document(
                    patient_id=lucas.id,
                    type="compte_rendu",
                    nom_fichier="carnet_vaccinations_lucas.jpg",
                    nom_original="Carnet de vaccination – Lucas Bernard.jpg",
                    texte_extrait=(
                        "CARNET DE VACCINATION\n"
                        "Nom : Bernard Lucas – né le 02/03/2015\n\n"
                        "Vaccinations réalisées :\n"
                        "  • DTPolio (rappel) : 06/03/2019\n"
                        "  • ROR 2e dose      : 15/04/2019\n"
                        "  • Méningocoque C   : 12/06/2019\n"
                        "  • DTPolio (rappel) : 10/09/2024\n\n"
                        "Prochaine échéance : DTPolio 11-13 ans (2026).\n"
                        "Statut vaccinal : À JOUR au 10/09/2024."
                    ),
                ),
            ]
        )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
