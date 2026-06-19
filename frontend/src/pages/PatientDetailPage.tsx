import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import ObservationSection from "../components/ObservationSection";
import {
  addAntecedent,
  addConsultation,
  addConstante,
  addTraitement,
  getPatient,
  getTendance,
  updateDocumentTexte,
  uploadDocument,
} from "../api/patients";
import {
  DISCLAIMER_IA_CONSTANTES,
  evaluerConstante,
  type AlerteConstante,
} from "../ia/constantesIA";
import { DISCLAIMER_OCR, extraireTexte } from "../ia/ocr";
import { useDictee } from "../ia/useDictee";
import type {
  PatientDetail,
  TendanceResult,
  TypeAntecedent,
  TypeConstante,
} from "../types";

const TABS = [
  "identite",
  "antecedents",
  "traitements",
  "consultations",
  "constantes",
  "documents",
] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  identite: "Identité",
  antecedents: "Antécédents",
  traitements: "Traitements",
  consultations: "Consultations",
  constantes: "Constantes",
  documents: "Documents",
};

const TYPES_ANTECEDENT: TypeAntecedent[] = [
  "allergie",
  "pathologie_chronique",
  "autre",
];

const TYPES_CONSTANTE: TypeConstante[] = [
  "tension_systolique",
  "tension_diastolique",
  "frequence_cardiaque",
  "temperature",
  "poids",
  "taille",
  "glycemie",
  "saturation_o2",
];

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [tab, setTab] = useState<Tab>("identite");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocrPrefill, setOcrPrefill] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const data = await getPatient(patientId);
      setPatient(data);
    } catch {
      setError("Impossible de charger le patient");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (loading) return <p className="loading">Chargement...</p>;
  if (error || !patient) return <p className="error">{error ?? "Patient introuvable"}</p>;

  return (
    <div className="patient-detail-page">
      <p>
        <Link to="/">&larr; Retour à la liste</Link>
      </p>
      <h2>
        {patient.prenom} {patient.nom}
      </h2>
      <p className="patient-meta">
        Né(e) le {patient.date_naissance} — {patient.sexe}
      </p>

      <ObservationSection patient={patient} />

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? "tab active" : "tab"}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {tab === "identite" && <IdentiteTab patient={patient} />}
        {tab === "antecedents" && (
          <AntecedentsTab patient={patient} onChange={refresh} />
        )}
        {tab === "traitements" && (
          <TraitementsTab patient={patient} onChange={refresh} />
        )}
        {tab === "consultations" && (
          <ConsultationsTab
            patient={patient}
            onChange={refresh}
            prefillObservations={ocrPrefill}
            onPrefillConsumed={() => setOcrPrefill(null)}
          />
        )}
        {tab === "constantes" && (
          <ConstantesTab patient={patient} onChange={refresh} />
        )}
        {tab === "documents" && (
          <DocumentsTab
            patient={patient}
            onChange={refresh}
            onUtiliserPourConsultation={(texte) => {
              setOcrPrefill(texte);
              setTab("consultations");
            }}
          />
        )}
      </div>
    </div>
  );
}

function IdentiteTab({ patient }: { patient: PatientDetail }) {
  return (
    <dl className="identity-list">
      <dt>Nom</dt>
      <dd>{patient.nom}</dd>
      <dt>Prénom</dt>
      <dd>{patient.prenom}</dd>
      <dt>Date de naissance</dt>
      <dd>{patient.date_naissance}</dd>
      <dt>Sexe</dt>
      <dd>{patient.sexe}</dd>
      <dt>Téléphone</dt>
      <dd>{patient.telephone ?? "—"}</dd>
      <dt>Email</dt>
      <dd>{patient.email ?? "—"}</dd>
      <dt>Adresse</dt>
      <dd>{patient.adresse ?? "—"}</dd>
      <dt>Médecin référent</dt>
      <dd>{patient.medecin_referent ? patient.medecin_referent.nom : "—"}</dd>
    </dl>
  );
}

function AntecedentsTab({
  patient,
  onChange,
}: {
  patient: PatientDetail;
  onChange: () => void;
}) {
  const [type, setType] = useState<TypeAntecedent>("allergie");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addAntecedent(patient.id, { type, description });
      setDescription("");
      onChange();
    } catch {
      setError("Impossible d'ajouter l'antécédent");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ul className="record-list">
        {patient.antecedents.map((a) => (
          <li key={a.id}>
            <strong>{a.type}</strong> — {a.description}
          </li>
        ))}
        {patient.antecedents.length === 0 && <li>Aucun antécédent</li>}
      </ul>

      <form onSubmit={handleSubmit} className="inline-form">
        <select value={type} onChange={(e) => setType(e.target.value as TypeAntecedent)}>
          {TYPES_ANTECEDENT.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          Ajouter
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function TraitementsTab({
  patient,
  onChange,
}: {
  patient: PatientDetail;
  onChange: () => void;
}) {
  const [nom, setNom] = useState("");
  const [posologie, setPosologie] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addTraitement(patient.id, {
        nom_medicament: nom,
        posologie: posologie || undefined,
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined,
      });
      setNom("");
      setPosologie("");
      setDateDebut("");
      setDateFin("");
      onChange();
    } catch {
      setError("Impossible d'ajouter le traitement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ul className="record-list">
        {patient.traitements.map((t) => (
          <li key={t.id}>
            <strong>{t.nom_medicament}</strong>
            {t.posologie && ` — ${t.posologie}`}
            {t.date_debut && ` — depuis le ${t.date_debut}`}
            {t.date_fin && ` jusqu'au ${t.date_fin}`}
          </li>
        ))}
        {patient.traitements.length === 0 && <li>Aucun traitement en cours</li>}
      </ul>

      <form onSubmit={handleSubmit} className="inline-form">
        <input
          placeholder="Médicament"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
        />
        <input
          placeholder="Posologie"
          value={posologie}
          onChange={(e) => setPosologie(e.target.value)}
        />
        <label>
          Début
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
        </label>
        <label>
          Fin
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
          />
        </label>
        <button type="submit" disabled={submitting}>
          Ajouter
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function ConsultationsTab({
  patient,
  onChange,
  prefillObservations,
  onPrefillConsumed,
}: {
  patient: PatientDetail;
  onChange: () => void;
  prefillObservations: string | null;
  onPrefillConsumed: () => void;
}) {
  const [motif, setMotif] = useState("");
  const [observations, setObservations] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dictee = useDictee((texte) =>
    setObservations((prev) => (prev ? `${prev} ${texte}` : texte))
  );

  useEffect(() => {
    if (prefillObservations === null) return;
    setObservations((prev) =>
      prev ? `${prev}\n${prefillObservations}` : prefillObservations
    );
    onPrefillConsumed();
  }, [prefillObservations, onPrefillConsumed]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addConsultation(patient.id, {
        motif,
        observations: observations || undefined,
        conclusion: conclusion || undefined,
      });
      setMotif("");
      setObservations("");
      setConclusion("");
      onChange();
    } catch {
      setError("Impossible d'ajouter la consultation");
    } finally {
      setSubmitting(false);
    }
  }

  const sorted = [...patient.consultations].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      <ul className="record-list">
        {sorted.map((c) => (
          <li key={c.id}>
            <strong>{new Date(c.date).toLocaleString("fr-FR")}</strong> —{" "}
            {c.motif} ({c.soignant.nom})
            {c.observations && <div>Observations : {c.observations}</div>}
            {c.conclusion && <div>Conclusion : {c.conclusion}</div>}
            {c.constantes.length > 0 && (
              <div>
                Constantes :{" "}
                {c.constantes
                  .map((cst) => `${cst.type} = ${cst.valeur} ${cst.unite}`)
                  .join(", ")}
              </div>
            )}
          </li>
        ))}
        {sorted.length === 0 && <li>Aucune consultation</li>}
      </ul>

      {!dictee.supporte && (
        <p className="dictee-indisponible">
          La dictée vocale n'est pas disponible dans ce navigateur. Essayez
          Chrome ou Edge.
        </p>
      )}

      <form onSubmit={handleSubmit} className="stack-form">
        <input
          placeholder="Motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          required
        />

        <div className="dictee-field">
          <div className="dictee-header">
            <span>Observations</span>
            {dictee.supporte && (
              <button
                type="button"
                className={dictee.ecoute ? "dictee-btn dictee-btn--actif" : "dictee-btn"}
                onClick={dictee.basculer}
                aria-label={dictee.ecoute ? "Arrêter la dictée" : "Dicter les observations"}
              >
                <span className="dictee-micro">🎙</span>
                {dictee.ecoute ? " Arrêter" : " Dicter"}
              </button>
            )}
          </div>
          <textarea
            placeholder="Observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
          {dictee.ecoute && (
            <p className="dictee-ecoute">
              <span className="dictee-pulse" /> Enregistrement en cours…
              {dictee.transitoire && (
                <em className="dictee-transitoire"> {dictee.transitoire}</em>
              )}
            </p>
          )}
          {dictee.erreur && <p className="error">{dictee.erreur}</p>}
        </div>

        <textarea
          placeholder="Conclusion"
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
        />
        <button type="submit" disabled={submitting}>
          Ajouter la consultation
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

// ---- Chart.js (CDN) minimal global declaration ----
interface ChartInstance {
  destroy(): void;
}
declare global {
  interface Window {
    Chart: new (
      ctx: HTMLCanvasElement,
      config: {
        type: string;
        data: object;
        options?: object;
      }
    ) => ChartInstance;
  }
}

const DISCLAIMER_TENDANCE =
  "Analyse générée automatiquement par régression linéaire, à interpréter par un professionnel de santé.";

const TENDANCE_LABEL: Record<string, string> = {
  hausse: "↑ Tendance à la hausse",
  baisse: "↓ Tendance à la baisse",
  stable: "→ Valeurs stables",
};

function TendancePanel({
  patientId,
  typesDisponibles,
}: {
  patientId: number;
  typesDisponibles: TypeConstante[];
}) {
  const [type, setType] = useState<TypeConstante>(typesDisponibles[0]);
  const [resultat, setResultat] = useState<TendanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartInstance | null>(null);

  const analyser = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    setResultat(null);
    try {
      const data = await getTendance(patientId, type);
      setResultat(data);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErreur(detail ?? "Impossible de calculer la tendance.");
    } finally {
      setLoading(false);
    }
  }, [patientId, type]);

  useEffect(() => {
    if (!resultat || !canvasRef.current || !window.Chart) return;

    chartRef.current?.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: resultat.points.map((p) =>
          new Date(p.date).toLocaleDateString("fr-FR")
        ),
        datasets: [
          {
            label: resultat.type,
            data: resultat.points.map((p) => p.valeur),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.08)",
            tension: 0.3,
            pointRadius: 4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 6 } },
          y: { beginAtZero: false },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [resultat]);

  if (typesDisponibles.length === 0) return null;

  const tendanceCouleur =
    resultat?.tendance === "hausse"
      ? "#d97706"
      : resultat?.tendance === "baisse"
        ? "#2563eb"
        : "#16a34a";

  return (
    <div className="tendance-panel">
      <h4>Analyse de tendance</h4>
      <div className="inline-form">
        <select value={type} onChange={(e) => setType(e.target.value as TypeConstante)}>
          {typesDisponibles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="button" onClick={analyser} disabled={loading}>
          {loading ? "Analyse…" : "Analyser"}
        </button>
      </div>

      {erreur && <p className="error">{erreur}</p>}

      {resultat && (
        <div className="tendance-resultat">
          <canvas ref={canvasRef} height={160} />
          <p className="tendance-verdict" style={{ color: tendanceCouleur }}>
            <strong>{TENDANCE_LABEL[resultat.tendance]}</strong>
            {" — "}
            {resultat.n_points} mesure{resultat.n_points > 1 ? "s" : ""}, confiance{" "}
            {Math.round(resultat.confiance * 100)}%
          </p>
          <p className="tendance-suggestion">{resultat.suggestion}</p>
          <p className="ia-disclaimer">{DISCLAIMER_TENDANCE}</p>
        </div>
      )}
    </div>
  );
}

function ConstanteAlerte({ alerte }: { alerte: AlerteConstante }) {
  const { plage } = alerte;
  return (
    <div className="ia-alert">
      <p>
        ⚠️ Valeur hors plage normale ({plage.normalMin}–{plage.normalMax}{" "}
        {plage.unit})
        {alerte.source === "modele" && alerte.probabilite !== null && (
          <> — confiance du modèle : {Math.round(alerte.probabilite * 100)}%</>
        )}
      </p>
      <p className="ia-disclaimer">{DISCLAIMER_IA_CONSTANTES}</p>
    </div>
  );
}

function ConstantesTab({
  patient,
  onChange,
}: {
  patient: PatientDetail;
  onChange: () => void;
}) {
  const [type, setType] = useState<TypeConstante>("tension_systolique");
  const [valeur, setValeur] = useState("");
  const [unite, setUnite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertes, setAlertes] = useState<Record<number, AlerteConstante>>({});
  const [previewAlerte, setPreviewAlerte] = useState<AlerteConstante | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addConstante(patient.id, {
        type,
        valeur: Number(valeur),
        unite,
      });
      setValeur("");
      setUnite("");
      setPreviewAlerte(null);
      onChange();
    } catch {
      setError("Impossible d'ajouter la constante");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      patient.constantes.map(async (c) => {
        const alerte = await evaluerConstante(c.type, c.valeur);
        return [c.id, alerte] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<number, AlerteConstante> = {};
      for (const [id, alerte] of entries) {
        if (alerte) next[id] = alerte;
      }
      setAlertes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [patient.constantes]);

  useEffect(() => {
    const valeurNum = Number(valeur);
    if (valeur.trim() === "" || Number.isNaN(valeurNum)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewAlerte(null);
      return;
    }
    let cancelled = false;
    evaluerConstante(type, valeurNum).then((alerte) => {
      if (!cancelled) setPreviewAlerte(alerte);
    });
    return () => {
      cancelled = true;
    };
  }, [type, valeur]);

  const sorted = [...patient.constantes].sort(
    (a, b) => new Date(b.date_mesure).getTime() - new Date(a.date_mesure).getTime()
  );

  return (
    <div>
      <ul className="record-list">
        {sorted.map((c) => {
          const alerte = alertes[c.id];
          return (
            <li key={c.id}>
              <strong>{c.type}</strong> : {c.valeur} {c.unite} —{" "}
              {new Date(c.date_mesure).toLocaleString("fr-FR")}
              {alerte?.anormal && <ConstanteAlerte alerte={alerte} />}
            </li>
          );
        })}
        {sorted.length === 0 && <li>Aucune constante enregistrée</li>}
      </ul>

      <form onSubmit={handleSubmit} className="inline-form">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TypeConstante)}
        >
          {TYPES_CONSTANTE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="any"
          placeholder="Valeur"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          required
        />
        <input
          placeholder="Unité"
          value={unite}
          onChange={(e) => setUnite(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          Ajouter
        </button>
      </form>
      {previewAlerte?.anormal && <ConstanteAlerte alerte={previewAlerte} />}
      {error && <p className="error">{error}</p>}

      <TendancePanel
        patientId={patient.id}
        typesDisponibles={[
          ...new Set(patient.constantes.map((c) => c.type)),
        ] as TypeConstante[]}
      />
    </div>
  );
}

function DocumentsTab({
  patient,
  onChange,
  onUtiliserPourConsultation,
}: {
  patient: PatientDetail;
  onChange: () => void;
  onUtiliserPourConsultation: (texte: string) => void;
}) {
  const [type, setType] = useState("ordonnance");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText, setOcrText] = useState("");

  function handleFileChange(selected: File | null) {
    setFile(selected);
    setOcrText("");
    setOcrProgress(0);
    if (!selected || !selected.type.startsWith("image/")) return;

    setOcrLoading(true);
    extraireTexte(selected, setOcrProgress).then((texte) => {
      setOcrText(texte ?? "");
      setOcrLoading(false);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const document = await uploadDocument(patient.id, type, file);
      if (ocrText.trim()) {
        await updateDocumentTexte(patient.id, document.id, ocrText.trim());
      }
      setFile(null);
      setOcrText("");
      setOcrProgress(0);
      onChange();
    } catch {
      setError("Impossible d'envoyer le document");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ul className="record-list">
        {patient.documents.map((d) => (
          <li key={d.id}>
            <strong>{d.type}</strong> — {d.nom_original} —{" "}
            {new Date(d.date_upload).toLocaleString("fr-FR")}
            {d.texte_extrait && (
              <div className="ia-alert">
                <p>Texte extrait : {d.texte_extrait}</p>
                <p className="ia-disclaimer">{DISCLAIMER_OCR}</p>
                <button
                  type="button"
                  onClick={() => onUtiliserPourConsultation(d.texte_extrait!)}
                >
                  Utiliser pour une consultation
                </button>
              </div>
            )}
          </li>
        ))}
        {patient.documents.length === 0 && <li>Aucun document</li>}
      </ul>

      <form onSubmit={handleSubmit} className="stack-form">
        <div className="inline-form">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ordonnance">Ordonnance</option>
            <option value="compte_rendu">Compte-rendu</option>
            <option value="resultat_analyse">Résultat d'analyse</option>
            <option value="autre">Autre</option>
          </select>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            required
          />
          <button type="submit" disabled={submitting || !file || ocrLoading}>
            Envoyer
          </button>
        </div>

        {ocrLoading && (
          <p>Reconnaissance du texte en cours… {Math.round(ocrProgress * 100)}%</p>
        )}

        {!ocrLoading && ocrText && (
          <div className="ia-alert">
            <label htmlFor="ocr-texte">Texte extrait (modifiable)</label>
            <textarea
              id="ocr-texte"
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              rows={5}
            />
            <p className="ia-disclaimer">{DISCLAIMER_OCR}</p>
            <button type="button" onClick={() => onUtiliserPourConsultation(ocrText)}>
              Utiliser pour une consultation
            </button>
          </div>
        )}
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
