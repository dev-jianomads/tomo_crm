# Workflow creator (orchestrator) — implementation plan

Goal: from **Pipeline → Use in workflow**, let the user optionally **create a custom user-defined workflow** via a **small Tomo chat** that collects **name**, **trigger**, and **action**, then **persists** (mock: localStorage), **links the current pipeline**, shows a **toast**, and offers **Open workflow**.

Non-goals for v1: server-side persistence, editing custom workflows in a separate admin UI, F7-style multi-touch in the custom builder (V1 allows one primary + one optional follow-up per SRS §3.12).

---

## Principles (risk control)

1. **Isolate by surface** — Add `surface: "workflow_creator"` so the orchestrator exposes **only** the creator tool + a narrow system prompt. No changes to tools or prompts for `general`, `workflow`, `drawer`, or `filter` unless strictly necessary.
2. **Feature flag / kill switch** — Gate the dialog UI behind a single constant (e.g. `ENABLE_WORKFLOW_CREATOR_IN_DIALOG` in the pipeline page or a tiny `src/lib/featureFlags.ts`). If behaviour is wrong, set `false` or remove one block from the dialog; no need to revert the API.
3. **Phased delivery** — Ship backend (orchestrator) first behind no UI, then minimal dialog chat, then persistence + CTA. Each phase is testable on its own.
4. **Optional refactor** — Prefer **copy-paste a slim chat panel** first; extract shared chrome with `WorkflowTomoChat` only if duplication hurts.

---

## Architecture summary

| Layer | Responsibility |
|--------|----------------|
| `OrchestratorSurface` | Add `"workflow_creator"`. |
| `OrchestratorContext` | Optional `workflowCreator?: { pipelineId; pipelineName; filterSummary?: string }` injected from the dialog. |
| `buildSystemPrompt` | Branch only when `surface === "workflow_creator"`: elicit name / trigger / action; state pipeline is pre-selected and will be linked on confirm. |
| Tool `create_user_workflow` | Zod: `name`, `trigger`, `action` (strings, min length). `execute`: validate, return JSON payload for the client (no DB). |
| Dialog (pipeline page) | When user picks **Custom**, show compact `useChat` + `DefaultChatTransport` → `/api/tomo/orchestrate` with `context.surface: "workflow_creator"` and `workflowCreator` payload. |
| Client `onToolCall` | On tool name match: generate `pb-` id, append to custom playbooks in localStorage, set pipeline override for that id, `toast.success`, set local state to show **Open workflow** CTA (`router.push` with `playbook` + `pipelineId`). |

---

## Phase 0 — Contract & types (no runtime change)

**Status:** Done — `OrchestratorSurface` / `OrchestratorContext` extended; `buildSystemPrompt` branch for `workflow_creator` so it does not fall through to `general`; tool map stays `{}` for this surface (existing `if` conditions never match `workflow_creator`).

**Files:** `src/app/api/tomo/orchestrate/route.ts` (types only at top), optionally `src/lib/orchestratorTypes.ts` if you prefer extracting shared context types for the client.

- Extend `OrchestratorSurface` with `"workflow_creator"`.
- Extend `OrchestratorContext` with optional `workflowCreator?: { pipelineId: string; pipelineName: string; filterSummary?: string }`.
- Document in comments that **no tools** are registered for this surface until Phase 1.

**Risk:** None (no UI sends this surface yet; safe to test manually via API).

---

## Phase 1 — Orchestrator: prompt + single tool (no UI)

**Status:** Done — `workflow_creator` prompt instructs use of `create_user_workflow`; tool registered only for that surface; returns `{ success, name, trigger, action, pipelineId }` (or `{ success: false, error }` if trimmed fields empty).

**File:** `src/app/api/tomo/orchestrate/route.ts`

1. In `buildSystemPrompt`, add:

   `else if (surface === "workflow_creator") { ... }`

   Content guidelines:

   - You are helping create a **new user workflow** from three fields.
   - **Pipeline is already chosen** — include `pipelineName` (+ optional `filterSummary`) from context in the prompt so the model doesn’t re-ask which list.
   - When you have **name**, **trigger**, and **action**, call **`create_user_workflow`** once with those exact strings (trimmed). If something is missing, ask a short follow-up.
   - Do not claim the workflow was saved on the server; the **client** applies the result.

2. Tool registration (only when `surface === "workflow_creator"`):

   - `create_user_workflow` with `z.object({ name: z.string().min(1), trigger: z.string().min(1), action: z.string().min(1) })`.
   - `execute`: return `{ success: true, name, trigger, action }` (and optionally echo `pipelineId` from context for client sanity check — **read-only** from context, not from model).

3. **Do not** add `create_user_workflow` to `general`, `workflow`, `drawer`, or `filter`.

4. **Manual test:** `curl` or temporary test page posting messages with `surface: "workflow_creator"` and dummy `workflowCreator` — expect streamed response and tool call in stream.

**Risk:** Low; existing surfaces unchanged if branches are mutually exclusive.

---

## Phase 2 — Persistence schema (client-only, no dialog yet)

**Status:** Done — `src/lib/customPlaybooks.ts`: `CUSTOM_PLAYBOOKS_STORAGE_KEY`, `CustomPlaybookStored`, `loadCustomPlaybooks`, `saveCustomPlaybooks`, `newCustomPlaybookId`, `appendCustomPlaybook` (returns `null` if trimmed fields empty).

**New or existing module:** e.g. `src/lib/customPlaybooks.ts`

- Storage key: e.g. `tomo-custom-playbooks-v1`.
- Shape per entry: `{ id: string; name: string; trigger: string; action: string; createdAt: string }` (ISO).
- Helpers: `loadCustomPlaybooks()`, `appendCustomPlaybook(entry)`, stable id `pb-custom-${nanoid|crypto.randomUUID}`.

**Pipeline override:** Reuse existing `tomo-playbook-pipeline-overrides` — on create, set `[newId] = { pipelineId }` (Phase 4 dialog applies this when calling `appendCustomPlaybook`).

**Risk:** None until something reads this list.

---

## Phase 3 — Workflows page: merge custom playbooks (read path)

**Status:** Done — `usePersistentState(CUSTOM_PLAYBOOKS_STORAGE_KEY)`; list renders built-ins then customs; selection + workflow load via `workflowDefinitionFromCustomStored`; URL `playbook` + `pipelineId` accepts custom ids; pipeline banner + `WorkflowTomoChat` context/chips support custom rows (`CUSTOM_WORKFLOW_CHAT_CHIPS`).

**Files:** `src/app/workflows/page.tsx`, possibly `src/lib/mockPlaybooks.ts` (types only)

- Derive `allUserPlaybooks = useMemo(() => [...suggestedPlaybooks, ...customFromStorage], [customVersion])`.
- Replace **sidebar list** iteration to use `allUserPlaybooks` (or map with stable key `playbook.id`).
- When `selectedPlaybookId` matches a custom id:
  - Load `WorkflowDefinition` from stored `trigger` + `action` (title = `name`, single step).
  - Skip `DEFAULT_TEMPLATES[playbook.type]` for custom rows — use **stored definition** or builder function `minimalWorkflowFromIntake({ name, trigger, action })`.
- `getPlaybookTargetsSummary`: custom + override → pipeline summary; custom + no override → fall back as today (`Global — no CRM audience` or pipeline if you always set override on create from dialog).

- **URL effect** (`pipelineId` + `playbook`): already validates against `suggestedPlaybooks.some` — extend to **also** allow ids present in custom list.

**Risk:** Medium if merged incorrectly — mitigate by **unit-testing** id resolution and by keeping built-in playbooks unchanged.

---

## Phase 4 — Dialog: Custom tab + chat + kill switch

**Status:** Done (orchestrator + chat). **UI wiring (May 2026):** custom build lives on `/workflows` — **New workflow** CTA + `WorkflowBuildModal` + `surfaceContext="workflows"` / `listPreselected`; Lists **Run workflow** modal links existing workflows only (no create tab). See SRS §3.12 / Story 8.7.8.

**File:** `src/app/pipeline/page.tsx` (or extract `UseInWorkflowDialog` + `WorkflowCreatorChat` to `src/components/`)

1. **Constant:** `const ENABLE_WORKFLOW_CREATOR = true` at top of file (or feature flag module).

2. **UX:**

   - Modes: **Existing** (current radio list) | **Custom** (only if flag on).
   - **Custom** shows compact chat (fixed height, e.g. `min-h-[220px] max-h-[40vh]`).

3. **Chat wiring** (mirror `WorkflowTomoChat`):

   - `useChat` + `DefaultChatTransport({ api: "/api/tomo/orchestrate", body: { context: { surface: "workflow_creator", page: "pipeline", workflowCreator: { pipelineId, pipelineName, filterSummary } } } })`.
   - Per-send: same context + `workflowCreator` so pipeline stays in sync.

4. **`onToolCall`:** if `toolCall.toolName === "create_user_workflow"`:

   - Parse `input` / `output` per AI SDK version (same pattern as `update_workflow` in `WorkflowTomoChat`).
   - Call `appendCustomPlaybook`, set override for `pipelineId`, `toast.success("Workflow created")`, set React state `createdPlaybookId` for CTA.

5. **CTA:** When `createdPlaybookId` set, show button **Open in Workflows** → `router.push(\`/workflows?playbook=${id}&pipelineId=${pipelineId}\`)` and close dialog (or leave open per taste).

6. **Existing flow:** **Open in Workflows** for preset playbooks unchanged.

**Rollback:** Set `ENABLE_WORKFLOW_CREATOR = false` or delete the Custom branch + chat component import.

**Risk:** Low to medium; isolated to dialog + flag.

---

## Phase 5 — Polish (optional)

- Suggestion chips for Custom mode only (“Suggest a name”, “Use 7-day reminder trigger”, etc.) — local strings, no new tools.
- Empty-state copy when no API key / stream errors (toast + retry).
- Dedupe: prevent duplicate **same name** in custom list (soft warn in tool or client).

---

## Testing checklist

| Step | Check |
|------|--------|
| General / workflow / drawer / filter chats | Unchanged behaviour |
| Workflow page built-in playbook | Still loads `DEFAULT_TEMPLATES` |
| Creator surface | Only `create_user_workflow` available |
| Create from dialog | New row appears under User defined, pipeline summary correct |
| Deep link | `/workflows?playbook=pb-custom-…&pipelineId=…` applies override and selects custom |
| Flag off | Dialog matches pre–Phase 4 behaviour |

---

## Files touched (summary)

| File | Phases |
|------|--------|
| `src/app/api/tomo/orchestrate/route.ts` | 0–1 |
| `src/lib/customPlaybooks.ts` (new) | 2 |
| `src/app/workflows/page.tsx` | 3 |
| `src/app/pipeline/page.tsx` (+ optional new components) | 4 |
| `docs/WORKFLOW_CREATOR_ORCHESTRATOR_PLAN.md` | (this doc) |

---

## Open decisions (resolve during implementation)

1. **Tool output vs input for `onToolCall`:** Confirm whether the client reads finalized fields from `toolCall.input` or from streamed `output` (AI SDK v5 patterns) — align with `WorkflowTomoChat` + `update_workflow`.
2. **Custom playbook type:** Store `type: "custom"` only if `PlaybookType` is extended; otherwise use a parallel `CustomPlaybook` type in UI merge (cleaner than overloading `PlaybookType`).
3. **Playbook suggestions / Tomo context** for custom workflows: generic chips + generic `workflowSummary` branch, or skip rich context until Phase 5.

---

## Removal / hide instructions (post-ship)

1. Set **`ENABLE_WORKFLOW_CREATOR`** to `false`, or remove the **Custom** mode UI block from `UseInWorkflowDialog`.
2. Leave orchestrator branch in place (harmless if unused) **or** remove `workflow_creator` surface and tool in one PR if you want zero dead code.
3. Custom playbooks in localStorage can remain; workflows page can keep read support without dialog entry, or filter out `pb-custom-*` if you fully revert Phase 3.
