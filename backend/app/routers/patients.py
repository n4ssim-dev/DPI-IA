import os
import uuid

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import (
    Antecedent,
    Constante,
    Consultation,
    Document,
    JournalAcces,
    Patient,
    TraitementEnCours,
    Utilisateur,
)
from app.schemas import (
    AntecedentCreate,
    AntecedentOut,
    ConstanteCreate,
    ConstanteOut,
    ConsultationCreate,
    ConsultationOut,
    DocumentOut,
    DocumentUpdate,
    PatientCreate,
    PatientDetailOut,
    PatientListOut,
    TendanceOut,
    TraitementEnCoursCreate,
    TraitementEnCoursOut,
)

router = APIRouter(prefix="/patients", tags=["patients"])


def get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable"
        )
    return patient


@router.get("", response_model=list[PatientListOut])
def list_patients(
    q: str | None = None,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    query = select(Patient)

    if q:
        filters = [Patient.nom.ilike(f"%{q}%"), Patient.prenom.ilike(f"%{q}%")]
        if q.isdigit():
            filters.append(Patient.id == int(q))
        query = query.where(or_(*filters))

    query = query.order_by(Patient.nom, Patient.prenom)
    return db.scalars(query).all()


@router.post("", response_model=PatientDetailOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientDetailOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    patient = get_patient_or_404(patient_id, db)

    db.add(
        JournalAcces(
            utilisateur_id=current_user.id,
            patient_id=patient.id,
            action="consultation_dossier",
        )
    )
    db.commit()

    return patient


@router.post(
    "/{patient_id}/antecedents",
    response_model=AntecedentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_antecedent(
    patient_id: int,
    payload: AntecedentCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    get_patient_or_404(patient_id, db)

    antecedent = Antecedent(patient_id=patient_id, **payload.model_dump())
    db.add(antecedent)
    db.commit()
    db.refresh(antecedent)
    return antecedent


@router.post(
    "/{patient_id}/traitements",
    response_model=TraitementEnCoursOut,
    status_code=status.HTTP_201_CREATED,
)
def add_traitement(
    patient_id: int,
    payload: TraitementEnCoursCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    get_patient_or_404(patient_id, db)

    traitement = TraitementEnCours(patient_id=patient_id, **payload.model_dump())
    db.add(traitement)
    db.commit()
    db.refresh(traitement)
    return traitement


@router.post(
    "/{patient_id}/consultations",
    response_model=ConsultationOut,
    status_code=status.HTTP_201_CREATED,
)
def add_consultation(
    patient_id: int,
    payload: ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    get_patient_or_404(patient_id, db)

    data = payload.model_dump()
    if data["date"] is None:
        data.pop("date")

    consultation = Consultation(
        patient_id=patient_id, soignant_id=current_user.id, **data
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


@router.post(
    "/{patient_id}/constantes",
    response_model=ConstanteOut,
    status_code=status.HTTP_201_CREATED,
)
def add_constante(
    patient_id: int,
    payload: ConstanteCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    get_patient_or_404(patient_id, db)

    data = payload.model_dump()
    if data["date_mesure"] is None:
        data.pop("date_mesure")

    constante = Constante(patient_id=patient_id, **data)
    db.add(constante)
    db.commit()
    db.refresh(constante)
    return constante


_SEUIL_DELTA_TOTAL = 0.05
"""Variation relative totale (pente × durée_jours / moyenne) au-dessus de
laquelle on parle de hausse ou de baisse. 5 % sur l'ensemble de la période
observée est cliniquement perceptible."""

_MESSAGES: dict[str, dict[str, str]] = {
    "hausse": {
        "tension_systolique": "Tendance à la hausse de la tension systolique. Surveillance accrue recommandée.",
        "tension_diastolique": "Tendance à la hausse de la tension diastolique. Surveillance accrue recommandée.",
        "frequence_cardiaque": "Fréquence cardiaque en augmentation. Évaluation cardiologique conseillée.",
        "temperature": "Tendance à la hausse de la température. Surveiller l'apparition d'une infection.",
        "glycemie": "Glycémie en hausse. Réévaluation du suivi diabétique recommandée.",
        "saturation_o2": "Saturation en oxygène en légère hausse — tendance favorable.",
        "_defaut": "Tendance à la hausse détectée.",
    },
    "baisse": {
        "tension_systolique": "Tendance à la baisse de la tension systolique. Risque d'hypotension à surveiller.",
        "tension_diastolique": "Tendance à la baisse de la tension diastolique. Évaluation clinique conseillée.",
        "frequence_cardiaque": "Fréquence cardiaque en diminution. Évaluation cardiologique conseillée.",
        "temperature": "Tendance à la baisse de la température. Hypothermie à surveiller.",
        "glycemie": "Glycémie en baisse. Risque hypoglycémique à évaluer.",
        "saturation_o2": "Saturation en oxygène en baisse. Surveillance respiratoire renforcée recommandée.",
        "_defaut": "Tendance à la baisse détectée.",
    },
    "stable": {
        "_defaut": "Les valeurs sont stables sur la période analysée.",
    },
}


def _suggestion(type_cst: str, tendance: str) -> str:
    pool = _MESSAGES.get(tendance, {})
    return pool.get(type_cst, pool.get("_defaut", ""))


@router.get("/{patient_id}/constantes/tendance", response_model=TendanceOut)
def get_tendance(
    patient_id: int,
    type: str,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    get_patient_or_404(patient_id, db)

    rows = (
        db.execute(
            select(Constante)
            .where(Constante.patient_id == patient_id, Constante.type == type)
            .order_by(Constante.date_mesure)
        )
        .scalars()
        .all()
    )

    if len(rows) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Au moins 3 mesures de type '{type}' sont nécessaires pour calculer une tendance (actuellement : {len(rows)}).",
        )

    t0 = rows[0].date_mesure.timestamp()
    X = np.array([(r.date_mesure.timestamp() - t0) / 86400 for r in rows]).reshape(-1, 1)
    y = np.array([r.valeur for r in rows])

    model = LinearRegression().fit(X, y)
    pente: float = float(model.coef_[0])
    y_pred = model.predict(X)
    confiance: float = float(max(0.0, r2_score(y, y_pred)))

    mean_val = float(np.mean(y)) or 1.0
    duree_jours = float(X[-1, 0] - X[0, 0]) or 1.0
    delta_total_relatif = (pente * duree_jours) / mean_val

    if delta_total_relatif > _SEUIL_DELTA_TOTAL:
        tendance = "hausse"
    elif delta_total_relatif < -_SEUIL_DELTA_TOTAL:
        tendance = "baisse"
    else:
        tendance = "stable"

    suggestion = _suggestion(type, tendance)

    from app.models import SuggestionIA

    db.add(
        SuggestionIA(
            patient_id=patient_id,
            type=f"tendance_{type}",
            contenu=suggestion,
            confiance=confiance,
        )
    )
    db.commit()

    return TendanceOut(
        type=type,
        n_points=len(rows),
        pente=pente,
        tendance=tendance,
        confiance=confiance,
        suggestion=suggestion,
        points=[{"date": r.date_mesure, "valeur": r.valeur} for r in rows],
    )


@router.post(
    "/{patient_id}/documents",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
def upload_document(
    patient_id: int,
    type: str,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    get_patient_or_404(patient_id, db)

    patient_dir = os.path.join(settings.documents_dir, str(patient_id))
    os.makedirs(patient_dir, exist_ok=True)

    extension = os.path.splitext(file.filename or "")[1]
    stored_name = f"{uuid.uuid4().hex}{extension}"

    with open(os.path.join(patient_dir, stored_name), "wb") as f:
        f.write(file.file.read())

    document = Document(
        patient_id=patient_id,
        type=type,
        nom_fichier=stored_name,
        nom_original=file.filename or stored_name,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.patch(
    "/{patient_id}/documents/{document_id}",
    response_model=DocumentOut,
)
def update_document_texte(
    patient_id: int,
    document_id: int,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    document = db.get(Document, document_id)
    if document is None or document.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable"
        )

    document.texte_extrait = payload.texte_extrait
    db.commit()
    db.refresh(document)
    return document
