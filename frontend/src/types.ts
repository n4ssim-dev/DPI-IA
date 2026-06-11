export type Role = "medecin" | "coordinateur" | "admin";

export type TypeAntecedent = "allergie" | "pathologie_chronique" | "autre";

export type TypeConstante =
  | "tension_systolique"
  | "tension_diastolique"
  | "frequence_cardiaque"
  | "temperature"
  | "poids"
  | "taille"
  | "glycemie"
  | "saturation_o2";

export interface Utilisateur {
  id: number;
  nom: string;
  email: string;
  role: Role;
}

export interface Antecedent {
  id: number;
  type: TypeAntecedent;
  description: string;
  created_at: string;
}

export interface TraitementEnCours {
  id: number;
  nom_medicament: string;
  posologie: string | null;
  date_debut: string | null;
  date_fin: string | null;
}

export interface Constante {
  id: number;
  type: TypeConstante;
  valeur: number;
  unite: string;
  date_mesure: string;
  consultation_id: number | null;
}

export interface DocumentMedical {
  id: number;
  type: string;
  nom_fichier: string;
  nom_original: string;
  texte_extrait: string | null;
  date_upload: string;
}

export interface Consultation {
  id: number;
  date: string;
  motif: string;
  observations: string | null;
  conclusion: string | null;
  soignant: Utilisateur;
  constantes: Constante[];
}

export interface PatientListItem {
  id: number;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
}

export interface PatientDetail extends PatientListItem {
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  medecin_referent: Utilisateur | null;
  antecedents: Antecedent[];
  traitements: TraitementEnCours[];
  consultations: Consultation[];
  constantes: Constante[];
  documents: DocumentMedical[];
}
