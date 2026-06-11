"""Jeu de données de démonstration (fictif, anonymisé).

Exécuté au démarrage du backend (voir entrypoint.sh). Idempotent : ne fait
rien si des utilisateurs existent déjà en base.
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.database import SessionLocal
from app.models import (
    Antecedent,
    Constante,
    Consultation,
    Patient,
    RoleUtilisateur,
    TraitementEnCours,
    TypeAntecedent,
    TypeConstante,
    Utilisateur,
)
from app.security import hash_password


def run() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(Utilisateur)) is not None:
            return  # déjà initialisé

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
                    patient_id=marie.id,
                    type=TypeAntecedent.pathologie_chronique,
                    description="Diabète de type 2",
                ),
            ]
        )

        db.add_all(
            [
                TraitementEnCours(
                    patient_id=jean.id,
                    nom_medicament="Amlodipine 5mg",
                    posologie="1 comprimé par jour",
                    date_debut=date(2023, 1, 10),
                ),
                TraitementEnCours(
                    patient_id=marie.id,
                    nom_medicament="Metformine 500mg",
                    posologie="2 comprimés par jour",
                    date_debut=date(2022, 6, 1),
                ),
            ]
        )

        # Trois consultations pour Jean Dupont avec une tension qui dérive
        # vers le haut (utile pour la démo de détection de tendance).
        consult_dates = [now - timedelta(days=90), now - timedelta(days=45), now - timedelta(days=2)]
        tensions = [(145, 92), (150, 95), (158, 98)]
        frequences = [78, 80, 82]

        for c_date, (sys_t, dia_t), fc in zip(consult_dates, tensions, frequences):
            consultation = Consultation(
                patient_id=jean.id,
                soignant_id=dr_martin.id,
                date=c_date,
                motif="Contrôle tension artérielle",
                observations="Patient asymptomatique, suivi de routine.",
                conclusion="Poursuite du traitement, contrôle dans 6 semaines.",
            )
            db.add(consultation)
            db.flush()

            db.add_all(
                [
                    Constante(
                        patient_id=jean.id,
                        consultation_id=consultation.id,
                        type=TypeConstante.tension_systolique,
                        valeur=sys_t,
                        unite="mmHg",
                        date_mesure=c_date,
                    ),
                    Constante(
                        patient_id=jean.id,
                        consultation_id=consultation.id,
                        type=TypeConstante.tension_diastolique,
                        valeur=dia_t,
                        unite="mmHg",
                        date_mesure=c_date,
                    ),
                    Constante(
                        patient_id=jean.id,
                        consultation_id=consultation.id,
                        type=TypeConstante.frequence_cardiaque,
                        valeur=fc,
                        unite="bpm",
                        date_mesure=c_date,
                    ),
                ]
            )

        # Consultation pour Marie Lefevre
        consultation_marie = Consultation(
            patient_id=marie.id,
            soignant_id=dr_martin.id,
            date=now - timedelta(days=10),
            motif="Bilan glycémique",
            observations="Glycémie à jeun légèrement élevée.",
            conclusion="Renforcement des règles hygiéno-diététiques.",
        )
        db.add(consultation_marie)
        db.flush()
        db.add(
            Constante(
                patient_id=marie.id,
                consultation_id=consultation_marie.id,
                type=TypeConstante.glycemie,
                valeur=1.4,
                unite="g/L",
                date_mesure=now - timedelta(days=10),
            )
        )

        # Consultation pour Lucas Bernard (enfant)
        consultation_lucas = Consultation(
            patient_id=lucas.id,
            soignant_id=dr_martin.id,
            date=now - timedelta(days=20),
            motif="Vaccination de routine",
            observations="Bonne tolérance, pas de réaction.",
            conclusion="Prochain rappel dans 1 an.",
        )
        db.add(consultation_lucas)
        db.flush()
        db.add_all(
            [
                Constante(
                    patient_id=lucas.id,
                    consultation_id=consultation_lucas.id,
                    type=TypeConstante.poids,
                    valeur=18.5,
                    unite="kg",
                    date_mesure=now - timedelta(days=20),
                ),
                Constante(
                    patient_id=lucas.id,
                    consultation_id=consultation_lucas.id,
                    type=TypeConstante.taille,
                    valeur=108,
                    unite="cm",
                    date_mesure=now - timedelta(days=20),
                ),
                Constante(
                    patient_id=lucas.id,
                    consultation_id=consultation_lucas.id,
                    type=TypeConstante.temperature,
                    valeur=36.8,
                    unite="°C",
                    date_mesure=now - timedelta(days=20),
                ),
            ]
        )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
