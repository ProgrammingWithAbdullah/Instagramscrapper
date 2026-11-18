"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { csvToObjects } from "../../lib/csv";

function blankRow() {
  return { username: "", niche: "", subcategory: "", type: "creator", limit: 50 };
}

function normalizeUsername(raw) {
  return String(raw || "").trim().replace(/^@/, "");
}

// Flexible header matching so "Account", "Handle", "IG Username" etc. all work,
// not just an exact "username" column.
const HEADER_ALIASES = {
  username: ["username", "account", "handle", "ig", "instagram", "igusername"],
  niche: ["niche", "category"],
  subcategory: ["subcategory", "subcat", "sub"],
  type: ["type", "accounttype", "creatorbrand"],
  limit: ["limit", "postlimit", "posts", "postcount"],
};

function findHeader(headers, field) {
  const aliases = HEADER_ALIASES[field];
  return headers.find((h) => {
    const norm = h.toLowerCase().replace(/[^a-z]/g, "");
    return aliases.some((a) => a === norm);
  });
}

function rowsFromCsv(text) {
  const objects = csvToObjects(text);
  if (objects.length === 0) return [];

  const headers = Object.keys(objects[0]);
  const usernameHeader = findHeader(headers, "username");
  if (!usernameHeader) {
    throw new Error('No "username" column found — check the header row.');
  }
  const nicheHeader = findHeader(headers, "niche");
  const subHeader = findHeader(headers, "subcategory");
  const typeHeader = findHeader(headers, "type");
  const limitHeader = findHeader(headers, "limit");

  // Only include keys for columns that actually exist in the file, so
  // importing a `username,limit` CSV (say) updates just the limit on
  // existing matched rows instead of blanking out their niche/subcategory/type.
  return objects
    .map((obj) => {
      const username = normalizeUsername(obj[usernameHeader]);
      if (!username) return null;

      const entry = { username };
      if (nicheHeader) entry.niche = obj[nicheHeader];
      if (subHeader) entry.subcategory = obj[subHeader];
      if (typeHeader) {
        entry.type = obj[typeHeader].toLowerCase() === "brand" ? "brand" : "creator";
      }
      if (limitHeader) {
        const limitRaw = Number(obj[limitHeader]);
        entry.limit = limitRaw > 0 ? Math.min(limitRaw, 50) : 50;
      }
      return entry;
    })
    .filter(Boolean);
}

function downloadCsvTemplate() {
  const csv =
    "username,niche,subcategory,type,limit\n" +
    "examplecreator,Fitness,Strength,creator,50\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "accounts-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccountsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setRows(data.accounts || []))
      .finally(() => setLoading(false));
  }, []);

  function updateRow(index, field, value) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow()]);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setRows(json.accounts);
      const removedNote = json.removed?.length
        ? ` Removed cached data for: ${json.removed.map((u) => `@${u}`).join(", ")}.`
        : "";
      setSaveMsg(`Saved ${json.accounts.length} accounts.${removedNote}`);
    } catch (err) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setImportMsg("Reading file…");
    try {
      const text = await file.text();
      const imported = rowsFromCsv(text);
      if (imported.length === 0) {
        setImportMsg("No valid rows found (need at least a username column).");
        return;
      }

      // Computed against the current `rows` synchronously (not inside a
      // setRows updater) so the added/updated counts aren't subject to
      // React's updater-timing, which isn't guaranteed to run before this
      // function continues.
      const next = [...rows];
      const indexByUsername = new Map(
        next.map((row, i) => [row.username.toLowerCase(), i])
      );
      let added = 0;
      let updated = 0;
      for (const entry of imported) {
        const key = entry.username.toLowerCase();
        const existingIndex = indexByUsername.get(key);
        if (existingIndex != null) {
          next[existingIndex] = { ...next[existingIndex], ...entry };
          updated += 1;
        } else {
          next.push({ ...blankRow(), ...entry });
          indexByUsername.set(key, next.length - 1);
          added += 1;
        }
      }
      setRows(next);

      setImportMsg(
        `Imported ${imported.length} rows (${added} new, ${updated} updated). Review below, then click Save changes.`
      );
    } catch (err) {
      setImportMsg(`Import failed: ${err.message}`);
    }
  }

  async function handleResync() {
    setSyncing(true);
    setSyncMsg("Syncing — this can take a bit depending on how many accounts you have…");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      setSyncMsg(
        json.ok
          ? `Synced ${json.summary.synced}/${json.summary.total} accounts (${json.summary.failures} failed).`
          : `Sync failed: ${json.error}`
      );
    } catch (err) {
      setSyncMsg(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div className="header-row">
          <h1 className="title">Accounts</h1>
        </div>
        <div style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 10 }}>
          Add or remove the Instagram accounts to track, set each one&apos;s niche/
          subcategory (drives the Library filters) and how many of its recent
          posts to pull per sync (max 50). Save, then Resync to pull fresh data.
          Or import a batch from a CSV file (a `username` column is required;
          `niche`, `subcategory`, `type`, `limit` are optional) —{" "}
          <button
            className="row-remove"
            style={{ textDecoration: "underline", fontSize: 13 }}
            onClick={downloadCsvTemplate}
          >
            download a template
          </button>
          .
        </div>

        {loading ? (
          <div style={{ color: "var(--text-dim)" }}>Loading…</div>
        ) : (
          <>
            <table className="accounts-table">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Username</th>
                  <th style={{ width: "18%" }}>Niche</th>
                  <th style={{ width: "22%" }}>Subcategory</th>
                  <th style={{ width: "14%" }}>Type</th>
                  <th style={{ width: "10%" }}>Post limit</th>
                  <th style={{ width: "6%" }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        type="text"
                        value={row.username}
                        placeholder="username"
                        onChange={(e) => updateRow(i, "username", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.niche}
                        placeholder="e.g. Fitness"
                        onChange={(e) => updateRow(i, "niche", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.subcategory}
                        placeholder="e.g. Strength"
                        onChange={(e) => updateRow(i, "subcategory", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={row.type}
                        onChange={(e) => updateRow(i, "type", e.target.value)}
                      >
                        <option value="creator">Creator</option>
                        <option value="brand">Brand</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={row.limit}
                        onChange={(e) => updateRow(i, "limit", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <button className="row-remove" onClick={() => removeRow(i)} title="Remove">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="toolbar">
              <button className="btn" onClick={addRow}>
                + Add account
              </button>
              <button className="btn" onClick={() => fileInputRef.current?.click()}>
                Import CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button className="btn" onClick={handleResync} disabled={syncing}>
                {syncing ? "Syncing…" : "Resync accounts"}
              </button>
            </div>

            {importMsg && (
              <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 10 }}>{importMsg}</div>
            )}
            {saveMsg && (
              <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6 }}>{saveMsg}</div>
            )}
            {syncMsg && (
              <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6 }}>{syncMsg}</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
