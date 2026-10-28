"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, formatTime } from "@/lib/client";
import { LIMITS, MODELS } from "@/lib/constants";
import type { ConversationDTO, ConversationSummaryDTO, MessageDTO, PromptDTO } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import FormattedText from "./FormattedText";
import PromptModal from "./PromptModal";

type Confirm = { kind: "delete"; id: string } | { kind: "clear" } | null;
type Settings = Pick<ConversationDTO, "promptId" | "model" | "temperature" | "topP">;

const EXAMPLES = [
  "Milliseid koolitusi te pakute?",
  "Olen arvutiga algaja, kust alustada?",
  "Kui palju maksab Exceli koolitus?",
  "Tahan õppida digiturundust",
];

function readConversationParam() {
  return new URLSearchParams(window.location.search).get("c");
}

function writeConversationParam(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("c", id);
  else url.searchParams.delete("c");
  window.history.replaceState(null, "", url);
}

export default function ChatApp() {
  const [conversations, setConversations] = useState<ConversationSummaryDTO[]>([]);
  const [prompts, setPrompts] = useState<PromptDTO[]>([]);
  const [active, setActive] = useState<ConversationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const openConversation = useCallback(async (id: string | null) => {
    setSidebarOpen(false);
    setError(null);
    writeConversationParam(id);
    if (!id) return setActive(null);
    setLoadingConversation(true);
    try {
      setActive(await api<ConversationDTO>(`/api/conversations/${id}`));
    } catch (err) {
      setActive(null);
      writeConversationParam(null);
      setError((err as Error).message);
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  // Initial load: shared conversation list, prompts and the conversation from the URL (if any).
  useEffect(() => {
    (async () => {
      try {
        const [convs, prms] = await Promise.all([
          api<ConversationSummaryDTO[]>("/api/conversations"),
          api<PromptDTO[]>("/api/prompts"),
        ]);
        setConversations(convs);
        setPrompts(prms);
        const id = readConversationParam();
        if (id) await openConversation(id);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [openConversation]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages.length, sending]);

  async function refreshConversations() {
    try {
      setConversations(await api<ConversationSummaryDTO[]>("/api/conversations"));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function createConversation(): Promise<ConversationDTO | null> {
    try {
      const conv = await api<ConversationDTO>("/api/conversations", { method: "POST" });
      setConversations((list) => [{ id: conv.id, title: conv.title, createdAt: conv.createdAt }, ...list]);
      setActive(conv);
      writeConversationParam(conv.id);
      setSidebarOpen(false);
      setError(null);
      return conv;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    if (content.length > LIMITS.message) {
      setError(`Sõnum võib olla kuni ${LIMITS.message} tähemärki pikk.`);
      return;
    }

    const conv = active ?? (await createConversation());
    if (!conv) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageDTO = {
      id: tempId,
      role: "user",
      content,
      attachmentName: attachment,
      createdAt: new Date().toISOString(),
    };
    const sentAttachment = attachment;
    setActive((c) => (c && c.id === conv.id ? { ...c, messages: [...c.messages, optimistic] } : c));
    setInput("");
    setAttachment(null);
    setSending(true);
    setError(null);

    try {
      const result = await api<{ userMessage: MessageDTO; assistantMessage: MessageDTO; title: string }>(
        `/api/conversations/${conv.id}/messages`,
        { method: "POST", body: JSON.stringify({ content, attachmentName: sentAttachment }) },
      );
      setActive((c) =>
        c && c.id === conv.id
          ? {
              ...c,
              title: result.title,
              messages: [...c.messages.filter((m) => m.id !== tempId), result.userMessage, result.assistantMessage],
            }
          : c,
      );
      setConversations((list) => list.map((item) => (item.id === conv.id ? { ...item, title: result.title } : item)));
    } catch (err) {
      setActive((c) => (c && c.id === conv.id ? { ...c, messages: c.messages.filter((m) => m.id !== tempId) } : c));
      setInput(content);
      setAttachment(sentAttachment);
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function updateSettings(patch: Partial<Settings>, immediate = true) {
    if (!active) return;
    const id = active.id;
    const previous: Settings = { promptId: active.promptId, model: active.model, temperature: active.temperature, topP: active.topP };
    setActive({ ...active, ...patch });

    const save = async () => {
      try {
        await api(`/api/conversations/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      } catch (err) {
        setActive((c) => (c && c.id === id ? { ...c, ...previous } : c));
        setError((err as Error).message);
      }
    };
    // Sliders save after a short pause; one pending timer per setting.
    const key = Object.keys(patch).join(",");
    clearTimeout(saveTimers.current[key]);
    if (immediate) save();
    else saveTimers.current[key] = setTimeout(save, 400);
  }

  async function handleConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      if (confirm.kind === "delete") {
        await api(`/api/conversations/${confirm.id}`, { method: "DELETE" });
        setConversations((list) => list.filter((c) => c.id !== confirm.id));
        if (active?.id === confirm.id) await openConversation(null);
      } else if (active) {
        await api(`/api/conversations/${active.id}/messages`, { method: "DELETE" });
        setActive({ ...active, messages: [] });
      }
      setConfirm(null);
    } catch (err) {
      setError((err as Error).message);
      setConfirm(null);
      if (confirm.kind === "delete") refreshConversations();
    } finally {
      setConfirmBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const activePrompt = prompts.find((p) => p.id === active?.promptId) ?? null;

  return (
    <div className="flex h-dvh flex-col">
      {/* Public demo notice */}
      <div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 sm:text-sm">
        <strong>Avalik demo:</strong> kõik vestlused on kõigile nähtavad. Ärge sisestage isikuandmeid ega muud tundlikku
        teavet.
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-slate-900/30 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform md:static md:z-auto md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Vestlused"
        >
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <div className="text-lg font-bold text-slate-900">
                Digi<span className="text-blue-600">Abi</span>
              </div>
              <div className="text-xs text-slate-500">DigiStarti koolitusnõustaja</div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Sulge vestluste loend"
            >
              ✕
            </button>
          </div>
          <div className="px-3">
            <button
              type="button"
              onClick={createConversation}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Uus vestlus
            </button>
          </div>
          <div className="mt-4 px-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Vestlused</div>
          <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {loading ? (
              <p className="px-2 text-sm text-slate-400">Laen…</p>
            ) : conversations.length === 0 ? (
              <p className="px-2 text-sm text-slate-400">Vestlusi veel ei ole.</p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((c) => (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className={`w-full rounded-lg py-2 pl-3 pr-9 text-left ${
                        active?.id === c.id ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block truncate text-sm">{c.title ?? "Uus vestlus"}</span>
                      <span className="block text-xs text-slate-400">{formatTime(c.createdAt)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "delete", id: c.id })}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                      aria-label={`Kustuta vestlus ${c.title ?? "Uus vestlus"}`}
                      title="Kustuta vestlus"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>

        {/* Main chat area */}
        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2 px-3 py-3 sm:px-5">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Ava vestluste loend"
              >
                ☰
              </button>
              <h1 className="min-w-0 flex-1 truncate font-semibold text-slate-900">
                {active ? (active.title ?? "Uus vestlus") : "DigiAbi"}
              </h1>
              {active && (
                <>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen((v) => !v)}
                    aria-expanded={settingsOpen}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      settingsOpen ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    ⚙ Seaded
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "clear" })}
                    disabled={active.messages.length === 0 || sending}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Tühjenda vestlus
                  </button>
                </>
              )}
            </div>

            {active && settingsOpen && (
              <div className="grid gap-4 border-t border-slate-100 px-3 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
                <div>
                  <label htmlFor="prompt-select" className="text-xs font-medium text-slate-600">
                    Süsteemiprompt
                  </label>
                  <div className="mt-1 flex gap-2">
                    <select
                      id="prompt-select"
                      value={active.promptId ?? ""}
                      onChange={(e) => updateSettings({ promptId: e.target.value || null })}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="">— Prompt puudub —</option>
                      {prompts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromptModalOpen(true)}
                    className="mt-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    Halda prompte
                  </button>
                </div>

                <div>
                  <label htmlFor="model-select" className="text-xs font-medium text-slate-600">
                    Mudel <span className="text-slate-400">(demo)</span>
                  </label>
                  <select
                    id="model-select"
                    value={active.model}
                    onChange={(e) => updateSettings({ model: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                  >
                    {MODELS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="temperature" className="flex justify-between text-xs font-medium text-slate-600">
                    <span>
                      Temperature <span className="text-slate-400">(demo)</span>
                    </span>
                    <span className="tabular-nums">{active.temperature.toFixed(2)}</span>
                  </label>
                  <input
                    id="temperature"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={active.temperature}
                    onChange={(e) => updateSettings({ temperature: Number(e.target.value) }, false)}
                    className="mt-2 w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="top-p" className="flex justify-between text-xs font-medium text-slate-600">
                    <span>
                      Top-P <span className="text-slate-400">(demo)</span>
                    </span>
                    <span className="tabular-nums">{active.topP.toFixed(2)}</span>
                  </label>
                  <input
                    id="top-p"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={active.topP}
                    onChange={(e) => updateSettings({ topP: Number(e.target.value) }, false)}
                    className="mt-2 w-full accent-blue-600"
                  />
                </div>

                <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">
                  ℹ Need on demoseaded: vastused on ettevalmistatud näidisvastused, mitte päris tehisintellekt. Mudel,
                  Temperature ja Top-P salvestatakse vestluse juurde, kuid vastuseid ei muuda. Kolm vaikimisi prompti
                  muudavad vastuste stiili; oma prompti tekst salvestatakse, kuid seda ei tõlgendata.
                </p>
              </div>
            )}

            {active && !settingsOpen && (
              <div className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500 sm:px-5">
                Prompt: <span className="font-medium text-slate-700">{activePrompt?.name ?? "puudub (neutraalne stiil)"}</span>
                {" · "}Mudel: <span className="font-medium text-slate-700">{active.model}</span>
                <span className="text-slate-400"> (simuleeritud)</span>
              </div>
            )}
          </header>

          {error && (
            <div role="alert" className="mx-3 mt-3 flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} className="font-medium hover:underline" aria-label="Sulge teade">
                ✕
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-5">
            {loading || loadingConversation ? (
              <p className="text-center text-sm text-slate-400">Laen…</p>
            ) : !active || active.messages.length === 0 ? (
              <div className="mx-auto flex max-w-xl flex-col items-center pt-6 text-center sm:pt-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">👋</div>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">Tere! Mina olen DigiAbi.</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Aitan teil leida sobiva DigiStarti digioskuste koolituse. Kirjutage oma küsimus või valige mõni näide.
                </p>
                <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => sendMessage(example)}
                      disabled={sending}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
                    >
                      {example}
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-xs text-slate-400">DigiStart on väljamõeldud ettevõte ja vastused on näidisvastused.</p>
              </div>
            ) : (
              <ul className="mx-auto max-w-3xl space-y-4">
                {active.messages.map((m) => (
                  <li key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                          m.role === "user"
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        {m.attachmentName && (
                          <div className={`mb-1 text-xs ${m.role === "user" ? "text-blue-100" : "text-slate-500"}`}>
                            📎 {m.attachmentName}
                          </div>
                        )}
                        <FormattedText text={m.content} />
                      </div>
                      <span className="mt-1 px-1 text-[11px] text-slate-400">
                        {m.role === "assistant" ? "DigiAbi · " : ""}
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
                {sending && (
                  <li className="flex justify-start" aria-live="polite">
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                      <span className="sr-only">DigiAbi kirjutab…</span>
                      <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                      <span className="typing-dot h-2 w-2 rounded-full bg-slate-400 [animation-delay:0.15s]" />
                      <span className="typing-dot h-2 w-2 rounded-full bg-slate-400 [animation-delay:0.3s]" />
                    </div>
                  </li>
                )}
              </ul>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="border-t border-slate-200 bg-white px-3 py-3 sm:px-5"
          >
            <div className="mx-auto max-w-3xl">
              {attachment && (
                <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  <span className="truncate">📎 {attachment}</span>
                  <button type="button" onClick={() => setAttachment(null)} aria-label="Eemalda fail" className="text-slate-500 hover:text-slate-900">
                    ✕
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setAttachment(file ? file.name : null);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="shrink-0 rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Lisa fail (demo: kuvatakse ainult faili nimi)"
                  title="Lisa fail (demo: faili ei laadita üles, kuvatakse ainult nimi)"
                >
                  📎
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  maxLength={LIMITS.message}
                  placeholder="Kirjutage oma küsimus…"
                  aria-label="Sõnum"
                  className="max-h-40 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="submit"
                  disabled={sending || input.trim().length === 0}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Saada
                </button>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-slate-400">
                Näidisvastused, mitte päris tehisintellekt · Ärge jagage isikuandmeid
              </p>
            </div>
          </form>
        </main>
      </div>

      {promptModalOpen && (
        <PromptModal
          prompts={prompts}
          onClose={() => setPromptModalOpen(false)}
          onSaved={(saved) =>
            setPrompts((list) => (list.some((p) => p.id === saved.id) ? list.map((p) => (p.id === saved.id ? saved : p)) : [...list, saved]))
          }
          onDeleted={(id) => {
            setPrompts((list) => list.filter((p) => p.id !== id));
            // The server set promptId to null for conversations using it.
            setActive((c) => (c && c.promptId === id ? { ...c, promptId: null } : c));
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "delete" ? "Kustuta vestlus?" : "Tühjenda vestlus?"}
          message={
            confirm.kind === "delete"
              ? "Vestlus ja kõik selle sõnumid kustutatakse jäädavalt. Seda ei saa tagasi võtta."
              : "Kõik selle vestluse sõnumid kustutatakse. Vestlus ja selle seaded jäävad alles."
          }
          confirmLabel={confirm.kind === "delete" ? "Kustuta" : "Tühjenda"}
          busy={confirmBusy}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
