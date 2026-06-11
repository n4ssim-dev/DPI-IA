import { apiClient } from "./client";
import type {
  Antecedent,
  Consultation,
  Constante,
  DocumentMedical,
  PatientDetail,
  PatientListItem,
  TraitementEnCours,
  TypeAntecedent,
  TypeConstante,
} from "../types";

export async function listPatients(q?: string): Promise<PatientListItem[]> {
  const res = await apiClient.get<PatientListItem[]>("/patients", {
    params: q ? { q } : undefined,
  });
  return res.data;
}

export async function getPatient(id: number): Promise<PatientDetail> {
  const res = await apiClient.get<PatientDetail>(`/patients/${id}`);
  return res.data;
}

export interface NewPatient {
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
  telephone?: string;
  email?: string;
  adresse?: string;
}

export async function createPatient(payload: NewPatient): Promise<PatientDetail> {
  const res = await apiClient.post<PatientDetail>("/patients", payload);
  return res.data;
}

export async function addAntecedent(
  patientId: number,
  payload: { type: TypeAntecedent; description: string }
): Promise<Antecedent> {
  const res = await apiClient.post<Antecedent>(
    `/patients/${patientId}/antecedents`,
    payload
  );
  return res.data;
}

export async function addTraitement(
  patientId: number,
  payload: {
    nom_medicament: string;
    posologie?: string;
    date_debut?: string;
    date_fin?: string;
  }
): Promise<TraitementEnCours> {
  const res = await apiClient.post<TraitementEnCours>(
    `/patients/${patientId}/traitements`,
    payload
  );
  return res.data;
}

export async function addConsultation(
  patientId: number,
  payload: { motif: string; observations?: string; conclusion?: string }
): Promise<Consultation> {
  const res = await apiClient.post<Consultation>(
    `/patients/${patientId}/consultations`,
    payload
  );
  return res.data;
}

export async function addConstante(
  patientId: number,
  payload: {
    type: TypeConstante;
    valeur: number;
    unite: string;
    consultation_id?: number;
  }
): Promise<Constante> {
  const res = await apiClient.post<Constante>(
    `/patients/${patientId}/constantes`,
    payload
  );
  return res.data;
}

export async function uploadDocument(
  patientId: number,
  type: string,
  file: File
): Promise<DocumentMedical> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiClient.post<DocumentMedical>(
    `/patients/${patientId}/documents`,
    formData,
    { params: { type } }
  );
  return res.data;
}

export async function updateDocumentTexte(
  patientId: number,
  documentId: number,
  texteExtrait: string
): Promise<DocumentMedical> {
  const res = await apiClient.patch<DocumentMedical>(
    `/patients/${patientId}/documents/${documentId}`,
    { texte_extrait: texteExtrait }
  );
  return res.data;
}
