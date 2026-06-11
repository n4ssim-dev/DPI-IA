// Brique IA n°2 (Jalon 4) : OCR de documents médicaux.
//
// Utilise Tesseract.js (chargé via CDN, voir frontend/index.html) pour
// extraire le texte d'un document scanné (image) directement côté client,
// sans passer par le backend.

interface TesseractRecognizeResult {
  data: {
    text: string;
  };
}

interface TesseractGlobal {
  recognize(
    image: File | Blob,
    langs: string,
    options?: { logger?: (m: { status: string; progress: number }) => void }
  ): Promise<TesseractRecognizeResult>;
}

declare global {
  interface Window {
    Tesseract?: TesseractGlobal;
  }
}

export const DISCLAIMER_OCR =
  "Texte extrait automatiquement par reconnaissance optique de caractères (OCR), à relire et corriger avant utilisation.";

/**
 * Extrait le texte d'un document image via Tesseract.js (langue française).
 *
 * Retourne `null` si Tesseract.js n'est pas disponible ou si l'extraction
 * échoue (le document reste utilisable, simplement sans texte pré-rempli).
 */
export async function extraireTexte(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  if (!window.Tesseract) return null;

  try {
    const { data } = await window.Tesseract.recognize(file, "fra", {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(m.progress);
        }
      },
    });
    return data.text.trim();
  } catch {
    return null;
  }
}
