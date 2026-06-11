import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addAntecedent,
  addConsultation,
  addConstante,
  addTraitement,
  getPatient,
  uploadDocument,
} from "../api/patients";
import {
  DISCLAIMER_IA_CONSTANTES,
  evaluerConstante,
  type AlerteConstante,
} from "../ia/constantesIA";
import type {
  PatientDetail,
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
          <ConsultationsTab patient={patient} onChange={refresh} />
        )}
        {tab === "constantes" && (
          <ConstantesTab patient={patient} onChange={refresh} />
        )}
        {tab === "documents" && (
          <DocumentsTab patient={patient} onChange={refresh} />
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
}: {
  patient: PatientDetail;
  onChange: () => void;
}) {
  const [motif, setMotif] = useState("");
  const [observations, setObservations] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <form onSubmit={handleSubmit} className="stack-form">
        <input
          placeholder="Motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          required
        />
        <textarea
          placeholder="Observations"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
        />
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
    </div>
  );
}

function DocumentsTab({
  patient,
  onChange,
}: {
  patient: PatientDetail;
  onChange: () => void;
}) {
  const [type, setType] = useState("ordonnance");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      await uploadDocument(patient.id, type, file);
      setFile(null);
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
          </li>
        ))}
        {patient.documents.length === 0 && <li>Aucun document</li>}
      </ul>

      <form onSubmit={handleSubmit} className="inline-form">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ordonnance">Ordonnance</option>
          <option value="compte_rendu">Compte-rendu</option>
          <option value="resultat_analyse">Résultat d'analyse</option>
          <option value="autre">Autre</option>
        </select>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <button type="submit" disabled={submitting || !file}>
          Envoyer
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
