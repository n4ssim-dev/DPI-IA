import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
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
