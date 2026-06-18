// Brique IA n°1 (Jalon 3) : alerte sur constantes anormales.
//
// Charge le modèle TensorFlow.js entraîné par `ml/train_constantes_model.mjs`
// (exporté dans `frontend/public/models/constantes-model/`) et l'utilise
// pour estimer si une constante vitale est hors plage normale. En cas
// d'échec de chargement (modèle absent, `tf` indisponible...), on retombe
// sur une comparaison directe aux seuils médicaux de référence fournis par
// `meta.json`.
import type { TypeConstante } from "../types";

const MODEL_URL = "/models/constantes-model/model.json";
const META_URL = "/models/constantes-model/meta.json";

export interface PlageConstante {
  label: string;
  unit: string;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
}

interface ConstantesModelMeta {
  types: string[];
  ranges: Record<string, PlageConstante>;
}

export type SourceAlerte = "modele" | "seuils";

export interface AlerteConstante {
  anormal: boolean;
  /** Probabilité estimée par le modèle qu'la valeur soit anormale (null si repli sur seuils). */
  probabilite: number | null;
  source: SourceAlerte;
  plage: PlageConstante;
}

/** Forme minimale de l'objet global `tf` exposé par le script CDN @tensorflow/tfjs. */
interface TfTensor {
  data(): Promise<Float32Array | Int32Array | Uint8Array>;
  dispose(): void;
}
interface TfLayersModel {
  predict(x: TfTensor): TfTensor;
}
interface TfGlobal {
  loadLayersModel(url: string): Promise<TfLayersModel>;
  tensor2d(data: number[][]): TfTensor;
}
declare global {
  interface Window {
    tf?: TfGlobal;
  }
}

let metaPromise: Promise<ConstantesModelMeta | null> | null = null;
let modelPromise: Promise<TfLayersModel | null> | null = null;

function chargerMeta(): Promise<ConstantesModelMeta | null> {
  if (!metaPromise) {
    metaPromise = fetch(META_URL)
      .then((res) => (res.ok ? (res.json() as Promise<ConstantesModelMeta>) : null))
      .catch(() => null);
  }
  return metaPromise;
}

function chargerModele(): Promise<TfLayersModel | null> {
  if (!modelPromise) {
    modelPromise = (async () => {
      if (!window.tf) return null;
      try {
        return await window.tf.loadLayersModel(MODEL_URL);
      } catch {
        return null;
      }
    })();
  }
  return modelPromise;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function evaluerAvecSeuils(valeur: number, plage: PlageConstante): AlerteConstante {
  return {
    anormal: valeur < plage.normalMin || valeur > plage.normalMax,
    probabilite: null,
    source: "seuils",
    plage,
  };
}

/**
 * Évalue si une constante est hors plage normale.
 *
 * Retourne `null` si le type de constante n'est pas couvert par le modèle
 * (ex. poids, taille) — dans ce cas, aucune alerte ne doit être affichée.
 */
export async function evaluerConstante(
  type: TypeConstante,
  valeur: number
): Promise<AlerteConstante | null> {
  const meta = await chargerMeta();
  const plage = meta?.ranges[type];
  if (!meta || !plage || Number.isNaN(valeur)) return null;

  const modele = await chargerModele();
  if (!modele) return evaluerAvecSeuils(valeur, plage);

  try {
    const oneHot = meta.types.map((t) => (t === type ? 1 : 0));
    const normalise = clamp01((valeur - plage.min) / (plage.max - plage.min));
    const entree = window.tf!.tensor2d([[...oneHot, normalise]]);
    const sortie = modele.predict(entree);
    const [probabilite] = await sortie.data();
    entree.dispose();
    sortie.dispose();
    return {
      anormal: probabilite >= 0.5,
      probabilite,
      source: "modele",
      plage,
    };
  } catch {
    return evaluerAvecSeuils(valeur, plage);
  }
}

export const DISCLAIMER_IA_CONSTANTES =
  "Suggestion générée automatiquement par un modèle d'IA, à valider par un professionnel de santé.";
