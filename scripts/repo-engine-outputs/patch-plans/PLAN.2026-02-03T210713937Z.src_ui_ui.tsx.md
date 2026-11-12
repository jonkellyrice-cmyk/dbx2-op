# Patch plan

- id: `PLAN.2026-02-03T210713937Z.src_ui_ui.tsx`
- generated: 2026-02-03T21:07:13.939Z
- repo: `jon-orchestrator`

## Policy
```json
{
  "mode": "lego-additive",
  "allowRefactor": false,
  "requireSectionAppend": true,
  "requireFingerprintedBlocks": true
}
```

## Inputs
```json
{
  "file": "src/ui/ui.tsx",
  "allBlocks": true
}
```

## Targets (5)

### src/ui/ui.tsx:UI.FILE.001
- file: `src/ui/ui.tsx`
- lines: 1–306 (306)
- contentHash: `4a5e63f28a7fe217f226358900ee29f4ebd019dcbb8502f5cce1e12b0318ff8c`

```
// MDV_BLOCK:BEGIN id="UI.FILE.001" intent="UI boundary: minimal kernel-driven chat UI (threads/messages/composer) with ordered section anchors" kind="file" tags="ui,v0.1,sections"

/**
 * ui/ui.tsx
 * ---------
 * Policy:
 * - UI is a boundary layer (runtime React). It may do runtime work.
 * - UI must not contain domain logic; it dispatches actions to the kernel.
 * - Persistence is executed via storage by applying kernel effects.
 * - New code is inserted only at the end of the appropriate section.
 */

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import type { ISODateString, KernelAction, KernelState, MessageId, ThreadId } from "@/kernel";
import { applyAction, makeKernelInitialState } from "@/kernel";
import { selectActiveThreadId, selectMessagesForThread, selectThreads } from "@/kernel/selectors";
import { applyKernelEffects, loadKernelState } from "@/storage";

// MDV_BLOCK:BEGIN id="UI.SECTION.PRIMITIVES.001" intent="Primitives: minimal UI primitives (time/id helpers, kernel dispatch)" kind="section" tags="ui,primitives"

function nowIso(): ISODateString {
  return new Date().toISOString() as ISODateString;
}

function makeId(): string {
  // Runtime boundary helper; stable enough for v0.1.
  // Uses crypto.randomUUID when available; falls back to timestamp+random.
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function asThreadId(id: string): ThreadId {
  return id as ThreadId;
}

function asMessageId(id: string): MessageId {
  return id as MessageId;
}

type DispatchResult = {
  readonly next: KernelState;
};

function dispatchAndPersist(prev: KernelState, action: KernelAction): DispatchResult {
  const res = applyAction(prev, action);
  applyKernelEffects(res.effects);
  return { next: res.state };
}

// MDV_BLOCK:END id="UI.SECTION.PRIMITIVES.001"


// MDV_BLOCK:BEGIN id="UI.SECTION.HELPERS.001" intent="Helpers: intentionally minimal UI helpers (render/layout helpers only)" kind="section" tags="ui,helpers"

function deriveTitleFromFirstUserMessage(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New Chat";
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return words.length < cleaned.length ? `${words}…` : words;
}

// MDV_BLOCK:END id="UI.SECTION.HELPERS.001"


// MDV_BLOCK:BEGIN id="UI.SECTION.COMPOSITION.001" intent="Composition: main UI component (kernel-driven)" kind="section" tags="ui,composition"

export function AppUI(): JSX.Element {
  const [state, setState] = useState<KernelState | null>(null);
  const [draft, setDraft] = useState<string>("");

  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  // Boot: load persisted state or create a new one.
  useEffect(() => {
    const persisted = loadKernelState();
    if (persisted) {
      setState(persisted);
      return;
    }
    const init = makeKernelInitialState(nowIso());
    applyKernelEffects([{ type: "PERSIST_STATE", state: init }]);
    setState(init);
  }, []);

  const threads = useMemo(() => (state ? selectThreads(state) : []), [state]);
  const activeThreadId = useMemo(() => (state ? selectActiveThreadId(state) : null), [state]);
  const messages = useMemo(() => {
    if (!state || !activeThreadId) return [];
    return selectMessagesForThread(state, activeThreadId);
  }, [state, activeThreadId]);

  // Auto-scroll behavior: stick to bottom unless user has scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!shouldStickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function onScrollMessages(): void {
    const el = listRef.current;
    if (!el) return;
    const thresholdPx = 24;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
    shouldStickToBottomRef.current = atBottom;
  }

  function ensureThread(): ThreadId {
    if (!state) throw new Error("state not ready");
    if (activeThreadId) return activeThreadId;

    const tid = asThreadId(makeId());
    const tNow = nowIso();
    const create: KernelAction = { type: "THREAD_CREATE", threadId: tid, title: "New Chat", now: tNow };
    const r = dispatchAndPersist(state, create);
    setState(r.next);
    return tid;
  }

  function createThread(): void {
    if (!state) return;
    const tid = asThreadId(makeId());
    const tNow = nowIso();
    const action: KernelAction = { type: "THREAD_CREATE", threadId: tid, title: "New Chat", now: tNow };
    const r = dispatchAndPersist(state, action);
    setState(r.next);
  }

  function selectThread(threadId: ThreadId): void {
    if (!state) return;
    const action: KernelAction = { type: "THREAD_SET_ACTIVE", threadId, now: nowIso() };
    const r = dispatchAndPersist(state, action);
    setState(r.next);
  }

  function deleteThread(threadId: ThreadId): void {
    if (!state) return;
    const action: KernelAction = { type: "THREAD_DELETE", threadId, now: nowIso() };
    const r = dispatchAndPersist(state, action);
    setState(r.next);
  }

  function renameThread(threadId: ThreadId): void {
    if (!state) return;
    const current = threads.find((t) => String(t.id) === String(threadId));
    const nextTitle = globalThis.prompt("Rename chat:", current?.title ?? "New Chat");
    if (!nextTitle) return;

    const action: KernelAction = { type: "THREAD_RENAME", threadId, title: nextTitle, now: nowIso() };
    const r = dispatchAndPersist(state, action);
    setState(r.next);
  }

  function sendMessage(): void {
    if (!state) return;

    const content = draft.trimEnd();
    if (!content.trim()) return;

    const tid = ensureThread();
    const tNow = nowIso();

    const userMsgId = asMessageId(makeId());
    const appendUser: KernelAction = {
      type: "MESSAGE_APPEND",
      messageId: userMsgId,
      threadId: tid,
      role: "user",
      content,
      now: tNow,
    };

    let next = dispatchAndPersist(state, appendUser).next;

    // Auto-title after first user message (if title is still default)
    const active = threads.find((t) => String(t.id) === String(tid));
    if (active && (active.title === "New Chat" || !active.title.trim())) {
      const title = deriveTitleFromFirstUserMessage(content);
      next = dispatchAndPersist(next, { type: "THREAD_RENAME", threadId: tid, title, now: tNow }).next;
    }

    setState(next);
    setDraft("");
    shouldStickToBottomRef.current = true;
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return; // newline
    e.preventDefault();
    sendMessage();
  }

  if (!state) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "system-ui, sans-serif" }}>
      {/* Left rail */}
      <div style={{ width: 280, borderRight: "1px solid #ddd", padding: 12, boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={createThread} style={{ flex: 1 }}>
            + New
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {threads.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 13 }}>No chats yet.</div>
          ) : (
            threads.map((t) => {
              const isActive = activeThreadId && String(t.id) === String(activeThreadId);
              return (
                <div
                  key={String(t.id)}
                  style={{
                    border: "1px solid #ddd",
                    padding: 8,
                    borderRadius: 6,
                    background: isActive ? "#f6f6f6" : "transparent",
                  }}
                >
                  <div
                    onClick={() => selectThread(t.id)}
                    style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, marginBottom: 6 }}
                    title={t.title}
                  >
                    {t.title || "New Chat"}
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => renameThread(t.id)} style={{ flex: 1 }}>
                      Rename
                    </button>
                    <button onClick={() => deleteThread(t.id)} style={{ flex: 1 }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main thread */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          ref={listRef}
          onScroll={onScrollMessages}
          style={{ flex: 1, overflow: "auto", padding: 16, boxSizing: "border-box" }}
        >
          {activeThreadId ? (
            messages.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No messages yet.</div>
            ) : (
              messages.map((m) => (
                <div key={String(m.id)} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>{m.role}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))
            )
          ) : (
            <div style={{ opacity: 0.7 }}>Create a chat to begin.</div>
          )}
        </div>

        {/* Composer */}
        <div style={{ borderTop: "1px solid #ddd", padding: 12, boxSizing: "border-box" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Message… (Enter to send, Shift+Enter for newline)"
            rows={3}
            style={{ width: "100%", resize: "none", padding: 8, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={sendMessage} disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// MDV_BLOCK:END id="UI.SECTION.COMPOSITION.001"


// MDV_BLOCK:BEGIN id="UI.SECTION.EXPORTS.001" intent="Exports: explicit public surface for UI domain" kind="section" tags="ui,exports"

// NOTE: exports are defined inline above (AppUI).
// Adapter (index.ts) controls public exposure.

// MDV_BLOCK:END id="UI.SECTION.EXPORTS.001"

// MDV_BLOCK:END id="UI.FILE.001"
```

### src/ui/ui.tsx:UI.SECTION.COMPOSITION.001
- file: `src/ui/ui.tsx`
- lines: 69–296 (228)
- contentHash: `a6f1cfd8e00370cbd14fbfb65ed53c7b30a6b85cfddbfc4d44ddfd4e17f150c9`

```
// MDV_BLOCK:BEGIN id="UI.SECTION.COMPOSITION.001" intent="Composition: main UI component (kernel-driven)" kind="section" tags="ui,composition"

export function AppUI(): JSX.Element {
  const [state, setState] = useState<KernelState | null>(null);
  const [draft, setDraft] = useState<string>("");

  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  // Boot: load persisted state or create a new one.
  useEffect(() => {
    const persisted = loadKernelState();
    if (persisted) {
      setState(persisted);
      return;
    }
    const init = makeKernelInitialState(nowIso());
    applyKernelEffects([{ type: "PERSIST_STATE", state: init }]);
    setState(init);
  }, []);

  const threads = useMemo(() => (state ? selectThreads(state) : []), [state]);
  const activeThreadId = useMemo(() => (state ? selectActiveThreadId(state) : null), [state]);
  const messages = useMemo(() => {
    if (!state || !activeThreadId) return [];
    return selectMessagesForThread(state, activeThreadId);
  }, [state, activeThreadId]);

  // Auto-scroll behavior: stick to bottom unless user has scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!shouldStickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function onScrollMessages(): void {
    const el = listRef.current;
    if (!el) return;
    const thresholdPx = 24;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
    shouldStickToBottomRef.current = atBottom;
  }

  function ensureThread(): ThreadId {
    if (!state) throw new Error("state not ready");
    if (activeThreadId) return activeThreadId;

    const tid = asThreadId(makeId());
    const tNow = nowIso();
    const create: KernelAction = { type: "THREAD_CREATE", threadId: tid, title: "New Chat", now: tNow };
    const r = dispatchAndPersist(state, create);
    setState(r.next);
    return tid;
  }

  function createThread(): void {
    if (!state) return;
    const tid = asThreadId(makeId());
    const tNow = nowIso();
    const action: KernelAction = { type: "THREAD_CREATE", threadId: tid, title: "New Chat", now: tNow };
    const r = dispatchAndPersist(state, action);
    setState(r.next);
  }

  function selectThread(threadId: ThreadId): void {
    if (!state) return;
    const action: KernelAction = { type: "THREAD_SET_ACTIVE", threadId, now: nowIso() };
    const r = dispatchAndPersist(state, action);
    setState(r.next);
  }

  function deleteThread(threadId: ThreadId): void {
    if (!state) return;
    const action: KernelAction = { type: "THREAD_DELETE", threadId, now: nowIso() };
    const r = dispatchAndPersist(state, action);
    setState(r.next);
  }

  function renameThread(threadId: ThreadId): void {
    if (!state) return;
    const current = threads.find((t) => String(t.id) === String(threadId));
    const nextTitle = globalThis.prompt("Rename chat:", current?.title ?? "New Chat");
    if (!nextTitle) return;

    const action: KernelAction = { type: "THREAD_RENAME", threadId, title: nextTitle, now: nowIso() };
    const r = dispatchAndPersist(state, action);
    setState(r.next);
  }

  function sendMessage(): void {
    if (!state) return;

    const content = draft.trimEnd();
    if (!content.trim()) return;

    const tid = ensureThread();
    const tNow = nowIso();

    const userMsgId = asMessageId(makeId());
    const appendUser: KernelAction = {
      type: "MESSAGE_APPEND",
      messageId: userMsgId,
      threadId: tid,
      role: "user",
      content,
      now: tNow,
    };

    let next = dispatchAndPersist(state, appendUser).next;

    // Auto-title after first user message (if title is still default)
    const active = threads.find((t) => String(t.id) === String(tid));
    if (active && (active.title === "New Chat" || !active.title.trim())) {
      const title = deriveTitleFromFirstUserMessage(content);
      next = dispatchAndPersist(next, { type: "THREAD_RENAME", threadId: tid, title, now: tNow }).next;
    }

    setState(next);
    setDraft("");
    shouldStickToBottomRef.current = true;
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return; // newline
    e.preventDefault();
    sendMessage();
  }

  if (!state) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "system-ui, sans-serif" }}>
      {/* Left rail */}
      <div style={{ width: 280, borderRight: "1px solid #ddd", padding: 12, boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={createThread} style={{ flex: 1 }}>
            + New
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {threads.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 13 }}>No chats yet.</div>
          ) : (
            threads.map((t) => {
              const isActive = activeThreadId && String(t.id) === String(activeThreadId);
              return (
                <div
                  key={String(t.id)}
                  style={{
                    border: "1px solid #ddd",
                    padding: 8,
                    borderRadius: 6,
                    background: isActive ? "#f6f6f6" : "transparent",
                  }}
                >
                  <div
                    onClick={() => selectThread(t.id)}
                    style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, marginBottom: 6 }}
                    title={t.title}
                  >
                    {t.title || "New Chat"}
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => renameThread(t.id)} style={{ flex: 1 }}>
                      Rename
                    </button>
                    <button onClick={() => deleteThread(t.id)} style={{ flex: 1 }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main thread */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          ref={listRef}
          onScroll={onScrollMessages}
          style={{ flex: 1, overflow: "auto", padding: 16, boxSizing: "border-box" }}
        >
          {activeThreadId ? (
            messages.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No messages yet.</div>
            ) : (
              messages.map((m) => (
                <div key={String(m.id)} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>{m.role}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))
            )
          ) : (
            <div style={{ opacity: 0.7 }}>Create a chat to begin.</div>
          )}
        </div>

        {/* Composer */}
        <div style={{ borderTop: "1px solid #ddd", padding: 12, boxSizing: "border-box" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Message… (Enter to send, Shift+Enter for newline)"
            rows={3}
            style={{ width: "100%", resize: "none", padding: 8, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={sendMessage} disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// MDV_BLOCK:END id="UI.SECTION.COMPOSITION.001"
```

### src/ui/ui.tsx:UI.SECTION.EXPORTS.001
- file: `src/ui/ui.tsx`
- lines: 299–304 (6)
- contentHash: `89b401d2b1264f54feb3fa18c9f0d11fb1ff6f9a32584fa8ebdb2edf65166892`

```
// MDV_BLOCK:BEGIN id="UI.SECTION.EXPORTS.001" intent="Exports: explicit public surface for UI domain" kind="section" tags="ui,exports"

// NOTE: exports are defined inline above (AppUI).
// Adapter (index.ts) controls public exposure.

// MDV_BLOCK:END id="UI.SECTION.EXPORTS.001"
```

### src/ui/ui.tsx:UI.SECTION.HELPERS.001
- file: `src/ui/ui.tsx`
- lines: 57–66 (10)
- contentHash: `9322ee0de18b0e7b11ebc03295c0b6424c30d42b5f7dd7b8da6241d10e0df168`

```
// MDV_BLOCK:BEGIN id="UI.SECTION.HELPERS.001" intent="Helpers: intentionally minimal UI helpers (render/layout helpers only)" kind="section" tags="ui,helpers"

function deriveTitleFromFirstUserMessage(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New Chat";
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return words.length < cleaned.length ? `${words}…` : words;
}

// MDV_BLOCK:END id="UI.SECTION.HELPERS.001"
```

### src/ui/ui.tsx:UI.SECTION.PRIMITIVES.001
- file: `src/ui/ui.tsx`
- lines: 22–54 (33)
- contentHash: `1fc6327ce722890f5654f649756be3d08170586c65cbc81d47bd710a78c70f60`

```
// MDV_BLOCK:BEGIN id="UI.SECTION.PRIMITIVES.001" intent="Primitives: minimal UI primitives (time/id helpers, kernel dispatch)" kind="section" tags="ui,primitives"

function nowIso(): ISODateString {
  return new Date().toISOString() as ISODateString;
}

function makeId(): string {
  // Runtime boundary helper; stable enough for v0.1.
  // Uses crypto.randomUUID when available; falls back to timestamp+random.
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function asThreadId(id: string): ThreadId {
  return id as ThreadId;
}

function asMessageId(id: string): MessageId {
  return id as MessageId;
}

type DispatchResult = {
  readonly next: KernelState;
};

function dispatchAndPersist(prev: KernelState, action: KernelAction): DispatchResult {
  const res = applyAction(prev, action);
  applyKernelEffects(res.effects);
  return { next: res.state };
}

// MDV_BLOCK:END id="UI.SECTION.PRIMITIVES.001"
```

## Recommended ops
```json
[
  {
    "op": "append_to_block_section_end",
    "blockKey": "src/ui/ui.tsx:UI.FILE.001",
    "sectionId": "UI.SECTION.PRIMITIVES.001",
    "expectedContentHash": "4a5e63f28a7fe217f226358900ee29f4ebd019dcbb8502f5cce1e12b0318ff8c",
    "newText": "__FILL__"
  },
  {
    "op": "append_to_block_section_end",
    "blockKey": "src/ui/ui.tsx:UI.SECTION.COMPOSITION.001",
    "sectionId": "UI.SECTION.COMPOSITION.001",
    "expectedContentHash": "a6f1cfd8e00370cbd14fbfb65ed53c7b30a6b85cfddbfc4d44ddfd4e17f150c9",
    "newText": "__FILL__"
  },
  {
    "op": "append_to_block_section_end",
    "blockKey": "src/ui/ui.tsx:UI.SECTION.EXPORTS.001",
    "sectionId": "UI.SECTION.EXPORTS.001",
    "expectedContentHash": "89b401d2b1264f54feb3fa18c9f0d11fb1ff6f9a32584fa8ebdb2edf65166892",
    "newText": "__FILL__"
  },
  {
    "op": "append_to_block_section_end",
    "blockKey": "src/ui/ui.tsx:UI.SECTION.HELPERS.001",
    "sectionId": "UI.SECTION.HELPERS.001",
    "expectedContentHash": "9322ee0de18b0e7b11ebc03295c0b6424c30d42b5f7dd7b8da6241d10e0df168",
    "newText": "__FILL__"
  },
  {
    "op": "append_to_block_section_end",
    "blockKey": "src/ui/ui.tsx:UI.SECTION.PRIMITIVES.001",
    "sectionId": "UI.SECTION.PRIMITIVES.001",
    "expectedContentHash": "1fc6327ce722890f5654f649756be3d08170586c65cbc81d47bd710a78c70f60",
    "newText": "__FILL__"
  }
]
```

