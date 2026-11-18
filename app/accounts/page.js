"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

function blankRow() {
  return { username: "", niche: "", subcategory: "", type: "creator", limit: 50 };
}

export default function AccountsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

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
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button className="btn" onClick={handleResync} disabled={syncing}>
                {syncing ? "Syncing…" : "Resync accounts"}
              </button>
            </div>

            {saveMsg && (
              <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 10 }}>{saveMsg}</div>
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
