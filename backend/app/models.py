import enum
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class RoleUtilisateur(str, enum.Enum):
    medecin = "medecin"
    coordinateur = "coordinateur"
    admin = "admin"


class TypeAntecedent(str, enum.Enum):
    allergie = "allergie"
    pathologie_chronique = "pathologie_chronique"
    autre = "autre"


class TypeConstante(str, enum.Enum):
    tension_systolique = "tension_systolique"
    tension_diastolique = "tension_diastolique"
    frequence_cardiaque = "frequence_cardiaque"
    temperature = "temperature"
    poids = "poids"
    taille = "taille"
    glycemie = "glycemie"
    saturation_o2 = "saturation_o2"


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    mot_de_passe_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleUtilisateur] = mapped_column(
        Enum(RoleUtilisateur, name="role_utilisateur"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    prenom: Mapped[str] = mapped_column(String(255), nullable=False)
    date_naissance: Mapped[date] = mapped_column(Date, nullable=False)
    sexe: Mapped[str] = mapped_column(String(1), nullable=False)
    telephone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    adresse: Mapped[str | None] = mapped_column(Text)
    medecin_referent_id: Mapped[int | None] = mapped_column(
        ForeignKey("utilisateurs.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    medecin_referent: Mapped["Utilisateur | None"] = relationship()
    antecedents: Mapped[list["Antecedent"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    traitements: Mapped[list["TraitementEnCours"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    consultations: Mapped[list["Consultation"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    constantes: Mapped[list["Constante"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class Antecedent(Base):
    __tablename__ = "antecedents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    type: Mapped[TypeAntecedent] = mapped_column(
        Enum(TypeAntecedent, name="type_antecedent"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient: Mapped["Patient"] = relationship(back_populates="antecedents")


class TraitementEnCours(Base):
    __tablename__ = "traitements_en_cours"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    nom_medicament: Mapped[str] = mapped_column(String(255), nullable=False)
    posologie: Mapped[str | None] = mapped_column(String(255))
    date_debut: Mapped[date | None] = mapped_column(Date)
    date_fin: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient: Mapped["Patient"] = relationship(back_populates="traitements")


class Consultation(Base):
    __tablename__ = "consultations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    soignant_id: Mapped[int] = mapped_column(
        ForeignKey("utilisateurs.id"), nullable=False
    )
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    motif: Mapped[str] = mapped_column(String(255), nullable=False)
    observations: Mapped[str | None] = mapped_column(Text)
    conclusion: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient: Mapped["Patient"] = relationship(back_populates="consultations")
    soignant: Mapped["Utilisateur"] = relationship()
    constantes: Mapped[list["Constante"]] = relationship(back_populates="consultation")


class Constante(Base):
    __tablename__ = "constantes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    consultation_id: Mapped[int | None] = mapped_column(
        ForeignKey("consultations.id")
    )
    type: Mapped[TypeConstante] = mapped_column(
        Enum(TypeConstante, name="type_constante"), nullable=False
    )
    valeur: Mapped[float] = mapped_column(Float, nullable=False)
    unite: Mapped[str] = mapped_column(String(20), nullable=False)
    date_mesure: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    patient: Mapped["Patient"] = relationship(back_populates="constantes")
    consultation: Mapped["Consultation | None"] = relationship(back_populates="constantes")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    nom_fichier: Mapped[str] = mapped_column(String(255), nullable=False)
    nom_original: Mapped[str] = mapped_column(String(255), nullable=False)
    texte_extrait: Mapped[str | None] = mapped_column(Text)
    date_upload: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient: Mapped["Patient"] = relationship(back_populates="documents")


class SuggestionIA(Base):
    __tablename__ = "suggestions_ia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    consultation_id: Mapped[int | None] = mapped_column(
        ForeignKey("consultations.id")
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    contenu: Mapped[str] = mapped_column(Text, nullable=False)
    confiance: Mapped[float | None] = mapped_column(Float)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient: Mapped["Patient"] = relationship()
    consultation: Mapped["Consultation | None"] = relationship()


class JournalAcces(Base):
    __tablename__ = "journal_acces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    utilisateur_id: Mapped[int] = mapped_column(
        ForeignKey("utilisateurs.id"), nullable=False
    )
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    date_acces: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
