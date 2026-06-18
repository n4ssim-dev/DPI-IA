import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createPatient, listPatients, type NewPatient } from "../api/patients";
import type { PatientListItem } from "../types";

const emptyForm: NewPatient = {
  nom: "",
  prenom: "",
  date_naissance: "",
  sexe: "F",
  telephone: "",
  email: "",
  adresse: "",
};

export default function PatientsListPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewPatient>(emptyForm);
  const [creating, setCreating] = useState(false);

  async function fetchPatients(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await listPatients(q);
      setPatients(data);
    } catch {
      setError("Impossible de charger les patients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPatients();
  }, []);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    fetchPatients(search || undefined);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const patient = await createPatient(form);
      setShowForm(false);
      setForm(emptyForm);
      navigate(`/patients/${patient.id}`);
    } catch {
      setError("Impossible de créer le patient");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="patients-list-page">
      <div className="page-header">
        <h2>Patients</h2>
        <button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "Nouveau patient"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="patient-form">
          <div className="form-row">
            <label>
              Nom
              <input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
              />
            </label>
            <label>
              Prénom
              <input
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Date de naissance
              <input
                type="date"
                value={form.date_naissance}
                onChange={(e) =>
                  setForm({ ...form, date_naissance: e.target.value })
                }
                required
              />
            </label>
            <label>
              Sexe
              <select
                value={form.sexe}
                onChange={(e) => setForm({ ...form, sexe: e.target.value })}
              >
                <option value="F">F</option>
                <option value="M">M</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Téléphone
              <input
                value={form.telephone}
                onChange={(e) =>
                  setForm({ ...form, telephone: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <label>
            Adresse
            <input
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            />
          </label>
          <button type="submit" disabled={creating}>
            {creating ? "Création..." : "Créer le patient"}
          </button>
        </form>
      )}

      <form onSubmit={handleSearchSubmit} className="search-form">
        <input
          type="search"
          placeholder="Rechercher un patient (nom, prénom...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Rechercher</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading">Chargement...</p>
      ) : (
        <table className="patients-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Date de naissance</th>
              <th>Sexe</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)}>
                <td>{p.nom}</td>
                <td>{p.prenom}</td>
                <td>{p.date_naissance}</td>
                <td>{p.sexe}</td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={4}>Aucun patient trouvé</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
