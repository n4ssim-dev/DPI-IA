from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models import RoleUtilisateur, TypeAntecedent, TypeConstante


# --- Auth ---


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# --- Utilisateur ---


class UtilisateurOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    email: EmailStr
    role: RoleUtilisateur


class UtilisateurCreate(BaseModel):
    nom: str
    email: EmailStr
    password: str
    role: RoleUtilisateur


# --- Antecedent ---


class AntecedentCreate(BaseModel):
    type: TypeAntecedent
    description: str


class AntecedentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: TypeAntecedent
    description: str
    created_at: datetime


# --- Traitement en cours ---


class TraitementEnCoursCreate(BaseModel):
    nom_medicament: str
    posologie: str | None = None
    date_debut: date | None = None
    date_fin: date | None = None


class TraitementEnCoursOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom_medicament: str
    posologie: str | None
    date_debut: date | None
    date_fin: date | None


# --- Constante ---


class ConstanteCreate(BaseModel):
    type: TypeConstante
    valeur: float
    unite: str
    date_mesure: datetime | None = None
    consultation_id: int | None = None


class ConstanteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: TypeConstante
    valeur: float
    unite: str
    date_mesure: datetime
    consultation_id: int | None


# --- Document ---


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    nom_fichier: str
    nom_original: str
    texte_extrait: str | None
    date_upload: datetime


class DocumentUpdate(BaseModel):
    texte_extrait: str


# --- Consultation ---


class ConsultationCreate(BaseModel):
    motif: str
    observations: str | None = None
    conclusion: str | None = None
    date: datetime | None = None


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: datetime
    motif: str
    observations: str | None
    conclusion: str | None
    soignant: UtilisateurOut
    constantes: list[ConstanteOut] = []


# --- Patient ---


class PatientCreate(BaseModel):
    nom: str
    prenom: str
    date_naissance: date
    sexe: str
    telephone: str | None = None
    email: EmailStr | None = None
    adresse: str | None = None
    medecin_referent_id: int | None = None


class PatientListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    prenom: str
    date_naissance: date
    sexe: str


class PatientDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    prenom: str
    date_naissance: date
    sexe: str
    telephone: str | None
    email: str | None
    adresse: str | None
    medecin_referent: UtilisateurOut | None
    antecedents: list[AntecedentOut] = []
    traitements: list[TraitementEnCoursOut] = []
    consultations: list[ConsultationOut] = []
    constantes: list[ConstanteOut] = []
    documents: list[DocumentOut] = []
