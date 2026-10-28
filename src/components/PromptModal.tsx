"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { LIMITS } from "@/lib/constants";
import type { PromptDTO } from "@/lib/types";

type Props = {
  prompts: PromptDTO[];
  onClose: () => void;
  onSaved: (prompt: PromptDTO) => void;
  onDeleted: (id: string) => void;
};

// "list" shows all prompts; "form" adds a new prompt (id null) or edits an existing one.
type View = { kind: "list" } | { kind: "form"; id: string | null; name: string; content: string };

export default function PromptModal({ prompts, onClose, onSaved, onDeleted }: Props) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editing = view.kind === "form" && view.id ? prompts.find((p) => p.id === view.id) : null;

  function openForm(prompt: PromptDTO | null) {
    setView({ kind: "form", id: prompt?.id ?? null, name: prompt?.name ?? "", content: prompt?.content ?? "" });
    setError(null);
    setNotice(null);
    setConfirmDelete(false);
  }

  function backToList(message: string | null = null) {
    setView({ kind: "list" });
    setError(null);
    setNotice(message);
    setConfirmDelete(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (view.kind !== "form") return;
    const name = view.name.trim();
    const content = view.content.trim();
    if (!name) return setError("Palun sisestage prompti nimi.");
    if (!content) return setError("Palun sisestage prompti tekst.");

    setBusy(true);
    setError(null);
    try {
      const saved = await api<PromptDTO>(view.id ? `/api/prompts/${view.id}` : "/api/prompts", {
        method: view.id ? "PATCH" : "POST",
        body: JSON.stringify({ name, content }),
      });
      onSaved(saved);
      backToList(view.id ? `Prompt „${saved.name}“ on salvestatud.` : `Uus prompt „${saved.name}“ on lisatud.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (view.kind !== "form" || !view.id) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/prompts/${view.id}`, { method: "DELETE" });
      onDeleted(view.id);
      backToList("Prompt on kustutatud.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-modal-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <h2 id="prompt-modal-title" className="text-lg font-semibold">
            {view.kind === "list" ? "Halda prompte" : view.id ? "Muuda prompti" : "Lisa uus prompt"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sulge"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        {view.kind === "list" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            <button
              type="button"
              onClick={() => openForm(null)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Lisa uus prompt
            </button>

            {notice && (
              <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                {notice}
              </p>
            )}

            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {prompts.length === 0 && <li className="p-4 text-sm text-slate-500">Prompte veel ei ole.</li>}
              {prompts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {p.name}
                      {p.slug && <span className="ml-1 text-xs font-normal text-slate-500">(vaikimisi)</span>}
                    </div>
                    <div className="truncate text-xs text-slate-500">{p.content}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openForm(p)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    Muuda
                  </button>
                </li>
              ))}
            </ul>

            <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
              Tegemist on demoga: vastused on ettevalmistatud näidisvastused. Kolm vaikimisi prompti muudavad vastuste stiili,
              kuid oma prompti tekst ainult salvestatakse – seda ei tõlgenda päris tehisintellekt.
            </p>
          </div>
        ) : (
          <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nimi</span>
              <input
                value={view.name}
                onChange={(e) => setView({ ...view, name: e.target.value })}
                maxLength={LIMITS.promptName}
                placeholder="nt Sõbralik nõustaja"
                autoFocus
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Prompti tekst</span>
              <textarea
                value={view.content}
                onChange={(e) => setView({ ...view, content: e.target.value })}
                maxLength={LIMITS.promptContent}
                rows={7}
                placeholder="Kirjelda, kuidas DigiAbi peaks käituma…"
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {view.content.length}/{LIMITS.promptContent}
              </span>
            </label>

            {view.id === null && (
              <p className="text-xs text-slate-500">
                Uus prompt salvestatakse ja ilmub promptide valikusse. Selle teksti ei tõlgenda päris tehisintellekt –
                vastused tulevad neutraalses stiilis.
              </p>
            )}
            {editing?.slug && (
              <p className="text-xs text-slate-500">
                See on vaikimisi prompt. Muudatused salvestatakse ja vastuste stiil jääb samaks. Kustutatud vaikimisi prompt
                luuakse serveri taaskäivitamisel uuesti.
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
              {view.id ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-700">Kustutada?</span>
                    <button
                      type="button"
                      onClick={remove}
                      disabled={busy}
                      className="rounded-lg bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Jah, kustuta
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-2 hover:bg-slate-100">
                      Ei
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Kustuta prompt
                  </button>
                )
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => backToList()}
                  disabled={busy}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Tühista
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {busy ? "Salvestan…" : "Salvesta"}
                </button>
              </div>
            </div>
            {view.id && (
              <p className="text-xs text-slate-500">
                Prompti kustutamisel jäävad seda kasutanud vestlused alles – neil lihtsalt ei ole enam prompti valitud.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
