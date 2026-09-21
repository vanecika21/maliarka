"use client";

import { useEffect, useState } from "react";
import { loadFleetData, saveFleetData } from "../lib/supabaseClient";

/* ================== ICONIȚE ================== */

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.5 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h-2v-5l2-5h11l3 5h1a1 1 0 0 1 1 1v4h-2" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
      <path d="M9.3 17.5h5.4" />
    </svg>
  );
}

function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 15.5c.5.7 1.4 1.2 2.5 1.2 1.6 0 2.8-.9 2.8-2.1s-1.1-1.7-2.8-2.1c-1.7-.4-2.8-.9-2.8-2.1S10.4 8.3 12 8.3c1.1 0 2 .5 2.5 1.2" />
      <path d="M12 7v1.3M12 15.7V17" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/* ================== HELPERE ================== */

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

// suma costurilor materialelor folosite la o lucrare
function jobTotal(m) {
  return (m.materiale_folosite || []).reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
}

function isLow(m) {
  return (
    m.prag_minim !== null &&
    m.prag_minim !== undefined &&
    m.prag_minim !== "" &&
    Number(m.cantitate) <= Number(m.prag_minim)
  );
}

// aduna inapoi in stoc cantitatea consumata de un set de randuri (editare/stergere lucrare)
function restoreStock(materiale, rows) {
  let next = materiale;
  for (const row of rows) {
    if (!row.material_id) continue;
    next = next.map((mat) =>
      mat.id === row.material_id
        ? { ...mat, cantitate: Number(mat.cantitate) + Number(row.cantitate) }
        : mat
    );
  }
  return next;
}

// scade din stoc si calculeaza costul (pe baza pretului TOTAL / cantitatea TOTALA a materialului)
function consumeStock(materiale, rows) {
  let next = materiale;
  const rowsWithCost = [];

  for (const row of rows) {
    const cantitateFolosita = Number(row.cantitate);
    const mat = next.find((m) => m.id === row.material_id);

    let cost = null;
    if (mat) {
      const pretUnitar = Number(mat.cantitate) > 0 && mat.pret != null ? Number(mat.pret) / Number(mat.cantitate) : 0;
      cost = Math.round(pretUnitar * cantitateFolosita * 100) / 100;
      next = next.map((m) =>
        m.id === row.material_id ? { ...m, cantitate: Number(m.cantitate) - cantitateFolosita } : m
      );
    }

    rowsWithCost.push({ material_id: row.material_id, cantitate: cantitateFolosita, cost });
  }

  return { materiale: next, rows: rowsWithCost };
}

/* ================== DIALOG DE CONFIRMARE ================== */

function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 380, width: "100%" }}>
        <h1 style={{ fontSize: 17, marginBottom: 8 }}>{title || "Confirmă"}</h1>
        <p className="subtitle" style={{ marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn secondary" onClick={onCancel}>
            Anulează
          </button>
          <button className="btn danger" style={{ borderColor: "var(--danger)" }} onClick={onConfirm}>
            Șterge
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================== TABURI ================== */

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard },
  { id: "materiale", label: "Materiale", icon: IconBox },
  { id: "masini", label: "Mașini", icon: IconCar },
];

function TopNav({ tab, setTab }) {
  return (
    <div className="topnav">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className={`tab${active ? " active" : ""}`}
            style={active ? { background: "var(--accent)", color: "var(--accent-text)" } : undefined}
            onClick={() => setTab(t.id)}
          >
            <Icon />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================== DASHBOARD ================== */

function Dashboard({ materiale, masini, loading }) {
  const totalMateriale = materiale.length;
  const stocRedus = materiale.filter(isLow);
  const valoareStoc = materiale.reduce((sum, m) => sum + (Number(m.pret) || 0), 0);

  const azi = new Date();
  const inceputSaptamana = new Date(azi);
  inceputSaptamana.setDate(azi.getDate() - azi.getDay() + 1);
  inceputSaptamana.setHours(0, 0, 0, 0);
  const lucrariSaptamanaAsta = masini.filter((m) => new Date(m.data) >= inceputSaptamana).length;

  const ultimeleLucrari = [...masini].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 6);

  function numeMaterial(id) {
    return materiale.find((m) => m.id === id)?.nume;
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Privire de ansamblu asupra stocului și lucrărilor de vopsire.</p>
        </div>
        <a href="/Formular_Maliarka.pdf" download className="btn secondary" style={{ flexShrink: 0 }}>
          <IconDownload /> Formular PDF
        </a>
      </div>

      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-top">
            Materiale <IconBox />
          </div>
          <div className="stat-value">{loading ? "—" : totalMateriale}</div>
          <div className="stat-sub">în stoc</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            Stoc redus <IconAlert />
          </div>
          <div className="stat-value">{loading ? "—" : stocRedus.length}</div>
          <div className={`stat-sub ${stocRedus.length > 0 ? "danger" : ""}`}>
            {stocRedus.length > 0 ? "necesită comandă" : "totul e ok"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            Lucrări săpt. <IconCar />
          </div>
          <div className="stat-value">{loading ? "—" : lucrariSaptamanaAsta}</div>
          <div className="stat-sub">mașini vopsite</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            Valoare stoc <IconCoin />
          </div>
          <div className="stat-value">{loading ? "—" : `${valoareStoc.toFixed(0)}`}</div>
          <div className="stat-sub">MDL, estimat</div>
        </div>
      </div>

      {!loading && stocRedus.length > 0 && (
        <div className="alert danger">
          <div className="alert-left">
            <IconAlert />
            {stocRedus.length} {stocRedus.length === 1 ? "material are" : "materiale au"} stoc redus.
          </div>
        </div>
      )}

      <div className="section-title" style={{ marginTop: 28 }}>
        Ultimele lucrări
      </div>
      <div className="card">
        {loading ? (
          <div className="empty">Se încarcă...</div>
        ) : ultimeleLucrari.length === 0 ? (
          <div className="empty">Nicio lucrare înregistrată încă.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mașină</th>
                <th>Data</th>
                <th>Lucrare</th>
                <th>Materiale</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ultimeleLucrari.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 700 }}>
                    {m.numar_inmatriculare}
                    {m.model && <span style={{ color: "var(--text-muted)", fontWeight: 500 }}> · {m.model}</span>}
                  </td>
                  <td>{new Date(m.data).toLocaleDateString("ro-RO")}</td>
                  <td>{m.lucrare || "—"}</td>
                  <td>
                    {m.materiale_folosite?.length > 0
                      ? m.materiale_folosite.map((r) => numeMaterial(r.material_id)).filter(Boolean).join(", ")
                      : "—"}
                  </td>
                  <td>{jobTotal(m) > 0 ? `${jobTotal(m).toFixed(2)} MDL` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ================== MATERIALE ================== */

const UNITATI = ["l", "kg", "buc", "ml", "g", "m"];

const EMPTY_MATERIAL_FORM = {
  nume: "",
  cod_culoare: "",
  cantitate: "",
  unitate: "l",
  prag_minim: "",
  pret: "",
  furnizor: "",
};

function Materiale({ fleet, materiale, persist, saving, loading }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_MATERIAL_FORM);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function openNewForm() {
    setForm(EMPTY_MATERIAL_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(m) {
    setForm({
      nume: m.nume || "",
      cod_culoare: m.cod_culoare || "",
      cantitate: m.cantitate ?? "",
      unitate: m.unitate || "l",
      prag_minim: m.prag_minim ?? "",
      pret: m.pret ?? "",
      furnizor: m.furnizor || "",
    });
    setEditingId(m.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_MATERIAL_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nume.trim()) return;

    const payload = {
      nume: form.nume.trim(),
      cod_culoare: form.cod_culoare.trim() || null,
      cantitate: form.cantitate === "" ? 0 : Number(form.cantitate),
      unitate: form.unitate,
      prag_minim: form.prag_minim === "" ? null : Number(form.prag_minim),
      pret: form.pret === "" ? null : Number(form.pret),
      furnizor: form.furnizor.trim() || null,
    };

    let nextMateriale;
    if (editingId) {
      nextMateriale = materiale.map((m) => (m.id === editingId ? { ...m, ...payload } : m));
    } else {
      nextMateriale = [...materiale, { id: newId(), ...payload }];
    }

    await persist({ ...fleet, materiale: nextMateriale });
    closeForm();
  }

  async function handleDelete(id) {
    const nextMateriale = materiale.filter((m) => m.id !== id);
    await persist({ ...fleet, materiale: nextMateriale });
  }

  const filtered = materiale.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.nume?.toLowerCase().includes(q) ||
      m.cod_culoare?.toLowerCase().includes(q) ||
      m.furnizor?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <h1>Materiale pentru vopsire</h1>
      <p className="subtitle">Stocul complet — vopsele, diluanți, lac, consumabile.</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Caută după nume, cod culoare sau furnizor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <button className="btn" onClick={openNewForm}>
          + Material nou
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="field">
                <label>Nume material *</label>
                <input
                  value={form.nume}
                  onChange={(e) => setForm({ ...form, nume: e.target.value })}
                  placeholder="ex: Vopsea bază Sikkens"
                />
              </div>
              <div className="field">
                <label>Cod / culoare</label>
                <input
                  value={form.cod_culoare}
                  onChange={(e) => setForm({ ...form, cod_culoare: e.target.value })}
                  placeholder="ex: #1C1C1C sau RAL 9005"
                />
              </div>
              <div className="field">
                <label>Cantitate</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.cantitate}
                  onChange={(e) => setForm({ ...form, cantitate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Unitate</label>
                <select value={form.unitate} onChange={(e) => setForm({ ...form, unitate: e.target.value })}>
                  {UNITATI.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Prag minim (alertă stoc)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.prag_minim}
                  onChange={(e) => setForm({ ...form, prag_minim: e.target.value })}
                  placeholder="opțional"
                />
              </div>
              <div className="field">
                <label>Preț total (pentru toată cantitatea)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.pret}
                  onChange={(e) => setForm({ ...form, pret: e.target.value })}
                  placeholder="ex: 70 pentru toate cele 10 bucăți"
                />
              </div>
              <div className="field">
                <label>Furnizor</label>
                <input value={form.furnizor} onChange={(e) => setForm({ ...form, furnizor: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Se salvează..." : editingId ? "Salvează modificările" : "Adaugă material"}
              </button>
              <button className="btn secondary" type="button" onClick={closeForm}>
                Anulează
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty">Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Niciun material găsit.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Cod / culoare</th>
                <th>Cantitate</th>
                <th>Preț total</th>
                <th>Furnizor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>{m.nume}</td>
                  <td>
                    {m.cod_culoare && m.cod_culoare.startsWith("#") && (
                      <span className="swatch" style={{ background: m.cod_culoare }} />
                    )}
                    {m.cod_culoare || "—"}
                  </td>
                  <td>
                    {m.cantitate} {m.unitate} {isLow(m) && <span className="pill danger">stoc redus</span>}
                  </td>
                  <td>{m.pret != null ? `${m.pret} MDL` : "—"}</td>
                  <td>{m.furnizor || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn secondary small" onClick={() => openEditForm(m)}>
                        Editează
                      </button>
                      <button className="btn danger" onClick={() => setConfirmDeleteId(m.id)}>
                        Șterge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Ștergi materialul?"
        message="Această acțiune este permanentă și nu poate fi anulată."
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          handleDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </>
  );
}

/* ================== MAȘINI ================== */

const EMPTY_MASINA_FORM = {
  numar_inmatriculare: "",
  model: "",
  data: new Date().toISOString().slice(0, 10),
  lucrare: "",
};

function Masini({ fleet, materiale, masini, persist, saving, loading }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_MASINA_FORM);
  const [materialeFolosite, setMaterialeFolosite] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function openNewForm() {
    setForm(EMPTY_MASINA_FORM);
    setEditingId(null);
    setMaterialeFolosite([]);
    setShowForm(true);
  }

  function openEditForm(m) {
    setForm({
      numar_inmatriculare: m.numar_inmatriculare || "",
      model: m.model || "",
      data: m.data,
      lucrare: m.lucrare || "",
    });
    setMaterialeFolosite(
      (m.materiale_folosite || []).map((r) => ({
        material_id: r.material_id || "",
        cantitate: r.cantitate ?? "",
      }))
    );
    setEditingId(m.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_MASINA_FORM);
    setMaterialeFolosite([]);
  }

  function addMaterialRow() {
    setMaterialeFolosite([...materialeFolosite, { material_id: "", cantitate: "" }]);
  }

  function updateMaterialRow(index, field, value) {
    const next = [...materialeFolosite];
    next[index][field] = value;
    setMaterialeFolosite(next);
  }

  function removeMaterialRow(index) {
    setMaterialeFolosite(materialeFolosite.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.numar_inmatriculare.trim()) return;

    const rows = materialeFolosite.filter((r) => r.material_id && r.cantitate !== "");

    let nextMateriale = materiale;
    let nextMasini = masini;

    if (editingId) {
      const oldJob = masini.find((m) => m.id === editingId);
      nextMateriale = restoreStock(nextMateriale, oldJob?.materiale_folosite || []);
    }

    const { materiale: materialeDupaConsum, rows: rowsWithCost } = consumeStock(nextMateriale, rows);
    nextMateriale = materialeDupaConsum;

    const jobPayload = {
      numar_inmatriculare: form.numar_inmatriculare.trim().toUpperCase(),
      model: form.model.trim() || null,
      data: form.data,
      lucrare: form.lucrare.trim() || null,
      materiale_folosite: rowsWithCost,
    };

    if (editingId) {
      nextMasini = nextMasini.map((m) => (m.id === editingId ? { ...m, ...jobPayload } : m));
    } else {
      nextMasini = [...nextMasini, { id: newId(), ...jobPayload }];
    }

    await persist({ ...fleet, materiale: nextMateriale, masini: nextMasini });
    closeForm();
  }

  async function handleDelete(id) {
    const job = masini.find((m) => m.id === id);
    const nextMateriale = restoreStock(materiale, job?.materiale_folosite || []);
    const nextMasini = masini.filter((m) => m.id !== id);
    await persist({ ...fleet, materiale: nextMateriale, masini: nextMasini });
  }

  function materialInfo(id) {
    return materiale.find((m) => m.id === id);
  }

  const masiniList = [...masini].sort((a, b) => new Date(b.data) - new Date(a.data));

  return (
    <>
      <h1>Mașini vopsite</h1>
      <p className="subtitle">Evidența lucrărilor: pe ce mașină, ce s-a făcut și ce materiale s-au consumat.</p>

      <button className="btn" onClick={openNewForm} style={{ marginBottom: 16 }}>
        + Lucrare nouă
      </button>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="field">
                <label>Număr înmatriculare *</label>
                <input
                  value={form.numar_inmatriculare}
                  onChange={(e) => setForm({ ...form, numar_inmatriculare: e.target.value })}
                  placeholder="ex: C AA 123"
                />
              </div>
              <div className="field">
                <label>Model mașină</label>
                <input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="ex: Toyota Prius"
                />
              </div>
              <div className="field">
                <label>Data</label>
                <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Ce lucrare s-a făcut</label>
              <textarea
                rows={3}
                value={form.lucrare}
                onChange={(e) => setForm({ ...form, lucrare: e.target.value })}
                placeholder="ex: vopsit aripă stânga față + lăcuit"
              />
            </div>

            <div className="section-title">Materiale folosite</div>
            {materialeFolosite.map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                <div className="field" style={{ flex: 2, marginBottom: 0 }}>
                  <label>Material</label>
                  <select value={row.material_id} onChange={(e) => updateMaterialRow(i, "material_id", e.target.value)}>
                    <option value="">Alege...</option>
                    {materiale.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nume} (stoc: {m.cantitate} {m.unitate})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Cantitate folosită</label>
                  <input
                    type="number"
                    step="0.01"
                    value={row.cantitate}
                    onChange={(e) => updateMaterialRow(i, "cantitate", e.target.value)}
                  />
                </div>
                <button type="button" className="btn danger" onClick={() => removeMaterialRow(i)}>
                  Scoate
                </button>
              </div>
            ))}
            <button type="button" className="btn secondary small" onClick={addMaterialRow}>
              + Adaugă material
            </button>

            {editingId && (
              <p className="subtitle" style={{ marginTop: 12, marginBottom: 0 }}>
                La salvare, stocul se recalculează automat (se anulează consumul vechi și se aplică cel nou).
              </p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Se salvează..." : editingId ? "Salvează modificările" : "Salvează lucrarea"}
              </button>
              <button className="btn secondary" type="button" onClick={closeForm}>
                Anulează
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty">Se încarcă...</div>
      ) : masiniList.length === 0 ? (
        <div className="card empty">Nicio lucrare înregistrată încă.</div>
      ) : (
        masiniList.map((m) => (
          <div className="job-card" key={m.id}>
            <div className="job-top">
              <span className="plate">
                {m.numar_inmatriculare}
                {m.model && <span style={{ color: "var(--text-muted)", fontWeight: 500 }}> · {m.model}</span>}
              </span>
              <span className="date">{new Date(m.data).toLocaleDateString("ro-RO")}</span>
            </div>
            {m.lucrare && <div className="lucrare">{m.lucrare}</div>}
            <div>
              {m.materiale_folosite?.length > 0 ? (
                m.materiale_folosite.map((r, i) => {
                  const mat = materialInfo(r.material_id);
                  return (
                    <span className="material-pill" key={i}>
                      {mat?.nume || "material șters"} — {r.cantitate} {mat?.unitate}
                    </span>
                  );
                })
              ) : (
                <span className="tag">fără materiale înregistrate</span>
              )}
            </div>
            {jobTotal(m) > 0 && (
              <div style={{ marginTop: 10, fontSize: 14 }}>
                <strong>Total: {jobTotal(m).toFixed(2)} MDL</strong>
              </div>
            )}
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button className="btn secondary small" onClick={() => openEditForm(m)}>
                <PencilIcon /> Editează
              </button>
              <button className="btn danger" onClick={() => setConfirmDeleteId(m.id)}>
                Șterge lucrarea
              </button>
            </div>
          </div>
        ))
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Ștergi lucrarea?"
        message="Stocul consumat de această lucrare va fi returnat automat în materiale. Acțiunea este permanentă."
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          handleDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </>
  );
}

/* ================== PAGINA PRINCIPALĂ ================== */

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [fleet, setFleet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadFleetData();
      setFleet(data);
      setError("");
    } catch (e) {
      setError("Nu am putut încărca datele: " + e.message);
    }
    setLoading(false);
  }

  async function persist(nextFleet) {
    setSaving(true);
    try {
      await saveFleetData(nextFleet);
      setFleet(nextFleet);
      setError("");
    } catch (e) {
      setError("Eroare la salvare: " + e.message);
    }
    setSaving(false);
  }

  const materiale = fleet?.materiale || [];
  const masini = fleet?.masini || [];

  return (
    <div className="shell">
      <TopNav tab={tab} setTab={setTab} />

      {error && <div className="error-msg">{error}</div>}

      {tab === "dashboard" && <Dashboard materiale={materiale} masini={masini} loading={loading} />}
      {tab === "materiale" && (
        <Materiale fleet={fleet} materiale={materiale} persist={persist} saving={saving} loading={loading} />
      )}
      {tab === "masini" && (
        <Masini fleet={fleet} materiale={materiale} masini={masini} persist={persist} saving={saving} loading={loading} />
      )}
    </div>
  );
}
