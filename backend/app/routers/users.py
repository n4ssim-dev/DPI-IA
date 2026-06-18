from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import Utilisateur
from app.schemas import UtilisateurCreate, UtilisateurOut
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[UtilisateurOut])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(Utilisateur).order_by(Utilisateur.nom)).all()


@router.post("", response_model=UtilisateurOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UtilisateurCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(Utilisateur).where(Utilisateur.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un utilisateur avec cet email existe déjà",
        )

    user = Utilisateur(
        nom=payload.nom,
        email=payload.email,
        role=payload.role,
        mot_de_passe_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
