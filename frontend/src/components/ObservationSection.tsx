import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – vis-timeline types are bundled but the path alias isn't always resolved
import { Timeline, Graph2d, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import type { Antecedent, Consultation, PatientDetail, TraitementEnCours, TypeConstante } from '../types';

type SelectedItem =
  | { kind: 'consultation'; data: Consultation }
  | { kind: 'antecedent'; data: Antecedent }
  | { kind: 'traitement'; data: TraitementEnCours };

const CONSTANTE_COLORS: Partial<Record<TypeConstante, string>> = {
  tension_systolique: '#ef4444',
  tension_diastolique: '#f97316',
  frequence_cardiaque: '#8b5cf6',
  temperature: '#14b8a6',
  poids: '#3b82f6',
  taille: '#6b7280',
  glycemie: '#f59e0b',
  saturation_o2: '#10b981',
};

const CONSTANTE_LABELS: Partial<Record<TypeConstante, string>> = {
  tension_systolique: 'TAS',
  tension_diastolique: 'TAD',
  frequence_cardiaque: 'FC',
  temperature: 'Temp.',
  poids: 'Poids',
  taille: 'Taille',
  glycemie: 'Glycémie',
  saturation_o2: 'SpO₂',
};

export default function ObservationSection({ patient }: { patient: PatientDetail }) {
  const tlContainerRef = useRef<HTMLDivElement>(null);
  const g2dContainerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<InstanceType<typeof Timeline> | null>(null);
  const g2dRef = useRef<InstanceType<typeof Graph2d> | null>(null);
  const g2dItemsDs = useRef<InstanceType<typeof DataSet> | null>(null);

  const [selected, setSelected] = useState<SelectedItem | null>(null);

  const availableTypes = [
    ...new Set(patient.constantes.map((c) => c.type)),
  ] as TypeConstante[];

  const [visibleTypes, setVisibleTypes] = useState<Set<TypeConstante>>(
    () => new Set(availableTypes),
  );

  // Rebuild vis instances when patient data changes
  useEffect(() => {
    if (!tlContainerRef.current) return;

    // ── Timeline items ──────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tlItems: any[] = [];

    for (const c of patient.consultations) {
      tlItems.push({
        id: `c-${c.id}`,
        group: 'consultations',
        content: c.motif,
        start: new Date(c.date),
        type: 'point',
        title: `${c.motif} — ${c.soignant.nom}`,
      });
    }
    for (const a of patient.antecedents) {
      const label = a.description.length > 28 ? a.description.slice(0, 28) + '…' : a.description;
      tlItems.push({
        id: `a-${a.id}`,
        group: 'antecedents',
        content: label,
        start: new Date(a.created_at),
        type: 'point',
        title: `${a.type} — ${a.description}`,
      });
    }
    for (const t of patient.traitements) {
      if (!t.date_debut) continue;
      tlItems.push({
        id: `t-${t.id}`,
        group: 'traitements',
        content: t.nom_medicament,
        start: new Date(t.date_debut),
        end: t.date_fin ? new Date(t.date_fin) : new Date(),
        type: 'range',
        title: t.posologie ? `${t.nom_medicament} — ${t.posologie}` : t.nom_medicament,
      });
    }

    const tlGroups = new DataSet([
      { id: 'consultations', content: 'Consultations' },
      { id: 'antecedents', content: 'Antécédents' },
      { id: 'traitements', content: 'Traitements' },
    ]);

    tlRef.current?.destroy();
    const tl: InstanceType<typeof Timeline> = new Timeline(
      tlContainerRef.current,
      new DataSet(tlItems),
      tlGroups,
      {
        height: '220px',
        stack: false,
        showMajorLabels: true,
        showCurrentTime: true,
        zoomMin: 1000 * 60 * 60 * 24,
      },
    );
    tlRef.current = tl;

    // ── Graph2d ─────────────────────────────────────────────────────────
    const currentAvailableTypes = [
      ...new Set(patient.constantes.map((c) => c.type)),
    ] as TypeConstante[];

    if (g2dContainerRef.current && patient.constantes.length > 0) {
      const itemsForGraph = patient.constantes.map((c) => ({
        id: `const-${c.id}`,
        x: new Date(c.date_mesure),
        y: c.valeur,
        group: c.type,
      }));

      const ds = new DataSet(itemsForGraph);
      g2dItemsDs.current = ds;

      const g2dGroups = new DataSet(
        currentAvailableTypes.map((type) => ({
          id: type,
          content: CONSTANTE_LABELS[type] ?? type,
          options: {
            drawPoints: { style: 'circle', size: 5 },
            shaded: false,
            style: `stroke: ${CONSTANTE_COLORS[type] ?? '#6b7280'}`,
          },
        })),
      );

      g2dRef.current?.destroy();
      const g2d: InstanceType<typeof Graph2d> = new Graph2d(
        g2dContainerRef.current,
        ds,
        g2dGroups,
        {
          height: '200px',
          legend: false,
          dataAxis: { showMinorLabels: true },
          zoomMin: 1000 * 60 * 60 * 24,
        },
      );
      g2dRef.current = g2d;

      // Sync time windows between the two charts
      let syncing = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tl.on('rangechanged', (props: any) => {
        if (syncing) return;
        syncing = true;
        g2d.setWindow(props.start, props.end, { animation: false });
        syncing = false;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      g2d.on('rangechanged', (props: any) => {
        if (syncing) return;
        syncing = true;
        tl.setWindow(props.start, props.end, { animation: false });
        syncing = false;
      });
    }

    // Select handler: deselect when clicking empty space (items = [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tl.on('select', (props: any) => {
      const itemId = props.items[0] as string | undefined;
      if (!itemId) {
        setSelected(null);
        return;
      }
      if (itemId.startsWith('c-')) {
        const found = patient.consultations.find((c) => c.id === parseInt(itemId.slice(2)));
        if (found) setSelected({ kind: 'consultation', data: found });
      } else if (itemId.startsWith('a-')) {
        const found = patient.antecedents.find((a) => a.id === parseInt(itemId.slice(2)));
        if (found) setSelected({ kind: 'antecedent', data: found });
      } else if (itemId.startsWith('t-')) {
        const found = patient.traitements.find((t) => t.id === parseInt(itemId.slice(2)));
        if (found) setSelected({ kind: 'traitement', data: found });
      }
    });

    return () => {
      tl.destroy();
      g2dRef.current?.destroy();
      tlRef.current = null;
      g2dRef.current = null;
      g2dItemsDs.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  // Update Graph2d items when visibility toggles change
  useEffect(() => {
    if (!g2dItemsDs.current) return;
    const filtered = patient.constantes
      .filter((c) => visibleTypes.has(c.type))
      .map((c) => ({ id: `const-${c.id}`, x: new Date(c.date_mesure), y: c.valeur, group: c.type }));
    g2dItemsDs.current.clear();
    g2dItemsDs.current.add(filtered);
  }, [visibleTypes, patient.constantes]);

  function toggleType(type: TypeConstante) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const hasTimelineData =
    patient.consultations.length > 0 ||
    patient.antecedents.length > 0 ||
    patient.traitements.some((t) => t.date_debut);

  return (
    <section className="obs-section">
      <h3 className="obs-title">Vue d'ensemble</h3>

      {!hasTimelineData ? (
        <p className="obs-empty">Aucune donnée clinique à afficher.</p>
      ) : (
        <>
          <div ref={tlContainerRef} className="obs-timeline" />

          {availableTypes.length > 0 && (
            <>
              <div className="obs-toggles">
                {availableTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`obs-toggle${visibleTypes.has(type) ? ' obs-toggle--active' : ''}`}
                    style={
                      {
                        '--toggle-color': CONSTANTE_COLORS[type] ?? '#6b7280',
                      } as React.CSSProperties
                    }
                    onClick={() => toggleType(type)}
                  >
                    {CONSTANTE_LABELS[type] ?? type}
                  </button>
                ))}
              </div>
              <div ref={g2dContainerRef} className="obs-graph2d" />
            </>
          )}
        </>
      )}

      {selected && (
        <DetailPanel item={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ item, onClose }: { item: SelectedItem; onClose: () => void }) {
  return (
    <div className="obs-detail">
      <div className="obs-detail-header">
        <strong className="obs-detail-kind">
          {item.kind === 'consultation' && 'Consultation'}
          {item.kind === 'antecedent' && 'Antécédent'}
          {item.kind === 'traitement' && 'Traitement'}
        </strong>
        <button type="button" className="obs-detail-close" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>
      {item.kind === 'consultation' && <ConsultationDetail data={item.data} />}
      {item.kind === 'antecedent' && <AntecedentDetail data={item.data} />}
      {item.kind === 'traitement' && <TraitementDetail data={item.data} />}
    </div>
  );
}

function ConsultationDetail({ data }: { data: Consultation }) {
  return (
    <dl className="obs-dl">
      <dt>Date</dt>
      <dd>{new Date(data.date).toLocaleString('fr-FR')}</dd>
      <dt>Soignant</dt>
      <dd>{data.soignant.nom}</dd>
      <dt>Motif</dt>
      <dd>{data.motif}</dd>
      {data.observations && (
        <>
          <dt>Observations</dt>
          <dd>{data.observations}</dd>
        </>
      )}
      {data.conclusion && (
        <>
          <dt>Conclusion</dt>
          <dd>{data.conclusion}</dd>
        </>
      )}
      {data.constantes.length > 0 && (
        <>
          <dt>Constantes</dt>
          <dd>
            <ul className="obs-dl-constantes">
              {data.constantes.map((c) => (
                <li key={c.id}>
                  {c.type} : {c.valeur} {c.unite}
                </li>
              ))}
            </ul>
          </dd>
        </>
      )}
    </dl>
  );
}

function AntecedentDetail({ data }: { data: Antecedent }) {
  return (
    <dl className="obs-dl">
      <dt>Type</dt>
      <dd>{data.type}</dd>
      <dt>Description</dt>
      <dd>{data.description}</dd>
      <dt>Enregistré le</dt>
      <dd>{new Date(data.created_at).toLocaleDateString('fr-FR')}</dd>
    </dl>
  );
}

function TraitementDetail({ data }: { data: TraitementEnCours }) {
  return (
    <dl className="obs-dl">
      <dt>Médicament</dt>
      <dd>{data.nom_medicament}</dd>
      {data.posologie && (
        <>
          <dt>Posologie</dt>
          <dd>{data.posologie}</dd>
        </>
      )}
      <dt>Période</dt>
      <dd>
        {data.date_debut ?? '—'} → {data.date_fin ?? 'en cours'}
      </dd>
    </dl>
  );
}
