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

type Draft = { id: string | null; name: string; content: string };

const emptyDraft: Draft = { id: null, name: "", content: "" };

export default function PromptModal({ prompts, onClose, onSaved, onDeleted }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editing = draft.id ? prompts.find((p) => p.id === draft.id) : null;

  function select(prompt: PromptDTO | null) {
    setDraft(prompt ? { id: prompt.id, name: prompt.name, content: prompt.content } : emptyDraft);
    setError(null);
    setConfirmDelete(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    const content = draft.content.trim();
    if (!name) return setError("Palun sisestage prompti nimi.");
    if (!content) return setError("Palun sisestage prompti tekst.");

    setBusy(true);
    setError(null);
    try {
      const saved = await api<PromptDTO>(draft.id ? `/api/prompts/${draft.id}` : "/api/prompts", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({ name, content }),
      });
      onSaved(saved);
      select(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft.id) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/prompts/${draft.id}`, { method: "DELETE" });
      onDeleted(draft.id);
      select(null);
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
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="prompt-modal-title" className="text-lg font-semibold">
            Halda prompte
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:flex-row">
          <div className="border-b border-slate-200 p-3 sm:w-60 sm:shrink-0 sm:border-b-0 sm:border-r">
            <button
              type="button"
              onClick={() => select(null)}
              className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                draft.id === null ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              + Uus prompt
            </button>
            <ul className="flex gap-2 overflow-x-auto sm:block sm:space-y-1">
              {prompts.map((p) => (
                <li key={p.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => select(p)}
                    className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                      draft.id === p.id ? "bg-slate-200 font-medium" : "hover:bg-slate-100"
                    }`}
                  >
                    {p.name}
                    {p.slug && <span className="ml-1 text-xs text-slate-500">(vaikimisi)</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={save} className="flex flex-1 flex-col gap-4 p-5">
            <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
              Tegemist on demoga: vastused on ettevalmistatud näidisvastused. Kolm vaikimisi prompti muudavad vastuste stiili,
              kuid oma prompti tekst ainult salvestatakse – seda ei tõlgenda päris tehisintellekt.
            </p>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nimi</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                maxLength={LIMITS.promptName}
                placeholder="nt Sõbralik nõustaja"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Prompti tekst</span>
              <textarea
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                maxLength={LIMITS.promptContent}
                rows={7}
                placeholder="Kirjelda, kuidas DigiAbi peaks käituma…"
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {draft.content.length}/{LIMITS.promptContent}
              </span>
            </label>

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
              {draft.id ? (
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
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? "Salvestan…" : draft.id ? "Salvesta muudatused" : "Lisa prompt"}
              </button>
            </div>
            {draft.id && (
              <p className="text-xs text-slate-500">
                Prompti kustutamisel jäävad seda kasutanud vestlused alles – neil lihtsalt ei ole enam prompti valitud.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
