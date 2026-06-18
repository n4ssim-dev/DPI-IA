// Brique IA n°3 (Jalon 5) : dictée vocale via Web Speech API.
//
// Hook React encapsulant SpeechRecognition / webkitSpeechRecognition.
// Retombe gracieusement sur un état `supporte: false` si l'API
// n'est pas disponible dans le navigateur (Firefox sans flag, etc.).

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export interface UseDicteeResult {
  /** L'API est disponible dans ce navigateur. */
  supporte: boolean;
  /** Écoute en cours. */
  ecoute: boolean;
  /** Transcript intermédiaire (non final), affiché en direct. */
  transitoire: string;
  /** Message d'erreur éventuel. */
  erreur: string | null;
  /** Démarre ou arrête l'écoute. */
  basculer: () => void;
}

/**
 * Gère une session de dictée vocale en français.
 *
 * @param onTranscrit - Appelé avec le texte final reconnu à chaque pause
 *                      naturelle ou arrêt manuel.
 */
export function useDictee(onTranscrit: (texte: string) => void): UseDicteeResult {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const supporte = Boolean(SR);

  const recRef = useRef<SpeechRecognition | null>(null);
  const onTranscritRef = useRef(onTranscrit);
  useEffect(() => {
    onTranscritRef.current = onTranscrit;
  }, [onTranscrit]);

  const [ecoute, setEcoute] = useState(false);
  const [transitoire, setTransitoire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const creerInstance = useCallback((): SpeechRecognition | null => {
    if (!SR) return null;
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      setTransitoire(interim);
      if (final.trim()) {
        onTranscritRef.current(final.trim());
        setTransitoire("");
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") return;
      const messages: Record<string, string> = {
        "not-allowed": "Microphone refusé — autorisez l'accès dans votre navigateur.",
        "audio-capture": "Aucun microphone détecté.",
        network: "Erreur réseau lors de la reconnaissance vocale.",
      };
      setErreur(messages[event.error] ?? `Erreur : ${event.error}`);
      setEcoute(false);
      setTransitoire("");
    };

    rec.onend = () => {
      // La reconnaissance peut se couper seule (timeout, réseau…).
      // On ne redémarre pas automatiquement pour éviter les boucles ;
      // l'utilisateur appuie à nouveau si nécessaire.
      setEcoute(false);
      setTransitoire("");
    };

    return rec;
  }, [SR]);

  const basculer = useCallback(() => {
    if (!SR) return;
    setErreur(null);

    if (ecoute) {
      recRef.current?.stop();
      // onend met à jour `ecoute` via l'event
    } else {
      const rec = creerInstance();
      recRef.current = rec;
      try {
        rec?.start();
        setEcoute(true);
      } catch {
        setErreur("Impossible de démarrer la reconnaissance vocale.");
      }
    }
  }, [SR, ecoute, creerInstance]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  return { supporte, ecoute, transitoire, erreur, basculer };
}
