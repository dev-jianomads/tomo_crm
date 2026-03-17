# Workflows → CRM Migration Plan

**Goal:** Migrate workflows from TargetList to Pipeline (CRM-based). Workflows run against pipelines (saved filters over relationships), not legacy target lists.

---

## Step 1: Update Playbook Type

**File:** `src/lib/mockPlaybooks.ts`

### 1.1 Add imports

```ts
import type { StructuredFilterCriteria } from "./relationshipFilters";
```

### 1.2 Update Playbook type

**Before:**
```ts
export type Playbook = {
  id: string;
  name: string;
  type: PlaybookType;
  description: string;
  summary: string;
  enabled: boolean;
  targetCount?: number;
  targetListId?: string;
  targetFilters?: Partial<TargetFilter>;
};
```

**After:**
```ts
export type Playbook = {
  id: string;
  name: string;
  type: PlaybookType;
  description: string;
  summary: string;
  enabled: boolean;
  targetCount?: number;
  /** @deprecated Use pipelineId. Kept for backward compatibility. */
  targetListId?: string;
  /** @deprecated Use filterCriteria. Kept for backward compatibility. */
  targetFilters?: Partial<TargetFilter>;
  /** Link to saved pipeline (CRM filter) */
  pipelineId?: string;
  /** Inline filter criteria when no pipeline is linked */
  filterCriteria?: Partial<StructuredFilterCriteria>;
};
```

### 1.3 Update suggestedPlaybooks

Replace `targetFilters` with `filterCriteria` for each playbook. Map legacy values:

| Legacy targetFilters | New filterCriteria |
|----------------------|---------------------|
| `{ tier: "Tier 1", stage: "Heating" }` | `{ tier: "Tier 1", band: "Heating Up" }` |
| `{ tier: "Tier 1-2", stage: "Active" }` | `{ tier: ["Tier 1", "Tier 2"], band: "Active-Stable" }` |
| `{ tier: "Tier 1-2" }` | `{ tier: ["Tier 1", "Tier 2"] }` |

Example for first playbook:
```ts
{
  id: "pb-intro-tracker",
  name: "Warm Intro Tracker",
  type: "intro_tracker",
  // ...
  filterCriteria: { tier: "Tier 1", band: "Heating Up" },
},
```

Remove `targetFilters` from all playbooks (or keep both during transition).

---

## Step 2: Update Override Type and Storage Key

**File:** `src/app/workflows/page.tsx`

### 2.1 Change override type

**Before:**
```ts
type PlaybookTargetOverrides = Record<string, { targetListId?: string }>;
```

**After:**
```ts
type PlaybookPipelineOverrides = Record<string, { pipelineId?: string }>;
```

### 2.2 Change storage key

**Before:**
```ts
"tomo-playbook-target-overrides"
```

**After:**
```ts
"tomo-playbook-pipeline-overrides"
```

---

## Step 3: Replace TargetList with Pipeline Data

**File:** `src/app/workflows/page.tsx`

### 3.1 Update imports

**Remove:**
```ts
import { TargetList, TARGET_LISTS_STORAGE_KEY } from "@/lib/targets";
```

**Add:**
```ts
import { usePipelines } from "@/lib/pipelines";
import { useFunds } from "@/components/fund-provider";
import { relationships } from "@/lib/mockData";
import { applyFilters, formatFilterSummary } from "@/lib/relationshipFilters";
```

### 3.2 Replace state hooks

**Before:**
```ts
const [targetLists] = usePersistentState<TargetList[]>(TARGET_LISTS_STORAGE_KEY, []);
const [playbookOverrides, setPlaybookOverrides] = usePersistentState<PlaybookTargetOverrides>(
  "tomo-playbook-target-overrides",
  {}
);
```

**After:**
```ts
const { activeFundId } = useFunds();
const { pipelines } = usePipelines(activeFundId);
const [playbookOverrides, setPlaybookOverrides] = usePersistentState<PlaybookPipelineOverrides>(
  "tomo-playbook-pipeline-overrides",
  {}
);
```

---

## Step 4: Update getPlaybookTargetsSummary

**File:** `src/app/workflows/page.tsx`

### 4.1 Replace logic

**Before:**
```ts
const getPlaybookTargetsSummary = useMemo(() => {
  return (playbook: Playbook): string => {
    const override = playbookOverrides[playbook.id];
    const targetListId = override?.targetListId ?? playbook.targetListId;
    if (targetListId) {
      const list = targetLists.find((l) => l.id === targetListId);
      return list ? `List: ${list.name} (${list.members.length} members)` : "List (not found)";
    }
    const filters = playbook.targetFilters;
    if (filters && Object.keys(filters).length > 0) {
      const parts = Object.entries(filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`);
      return parts.length ? `Filters: ${parts.join(", ")}` : "No targets set";
    }
    return "No targets set";
  };
}, [playbookOverrides, targetLists]);
```

**After:**
```ts
const getPlaybookTargetsSummary = useMemo(() => {
  return (playbook: Playbook): string => {
    const override = playbookOverrides[playbook.id];
    const pipelineId = override?.pipelineId ?? playbook.pipelineId;
    if (pipelineId) {
      const pipeline = pipelines.find((p) => p.id === pipelineId);
      if (!pipeline) return "Pipeline (not found)";
      const count = applyFilters(relationships, pipeline.filterCriteria).length;
      const summary = formatFilterSummary(pipeline.filterCriteria);
      return summary
        ? `Pipeline: ${pipeline.name} (${count}) — ${summary}`
        : `Pipeline: ${pipeline.name} (${count})`;
    }
    const criteria = playbook.filterCriteria;
    if (criteria && Object.keys(criteria).length > 0) {
      const count = applyFilters(relationships, criteria).length;
      const summary = formatFilterSummary(criteria);
      return summary ? `${count} targets — ${summary}` : `${count} targets`;
    }
    return "No targets set";
  };
}, [playbookOverrides, pipelines]);
```

---

## Step 5: Update handleUseInPlaybook

**File:** `src/app/workflows/page.tsx`

### 5.1 Change signature and logic

**Before:**
```ts
const handleUseInPlaybook = (list: TargetList) => {
  if (!selectedPlaybookId) return;
  setPlaybookOverrides((prev) => ({
    ...prev,
    [selectedPlaybookId]: { targetListId: list.id },
  }));
};
```

**After:**
```ts
const handleUseInPlaybook = (pipeline: Pipeline) => {
  if (!selectedPlaybookId) return;
  setPlaybookOverrides((prev) => ({
    ...prev,
    [selectedPlaybookId]: { pipelineId: pipeline.id },
  }));
};
```

Add `Pipeline` import from `@/lib/pipelines`.

---

## Step 6: Update "Recent Target Lists" Section

**File:** `src/app/workflows/page.tsx`

### 6.1 Replace recentLists

**Before:**
```ts
const recentLists = targetLists.slice(0, 3);
```

**After:**
```ts
const recentPipelines = pipelines.slice(0, 3);
```

### 6.2 Update collapsible section UI

**Before:**
```tsx
<button
  onClick={() => setRecentTargetsOpen((o) => !o)}
  className="..."
>
  <span>Recent target lists</span>
  ...
</button>
{recentTargetsOpen && (
  <div className="...">
    {recentLists.length ? (
      recentLists.map((list) => (
        <div key={list.id} ...>
          <div>
            <p className="...">{list.name}</p>
            <p className="...">
              {list.members.length} members • {list.filters.tier}, {list.filters.stage}
            </p>
          </div>
          <button
            onClick={() => handleUseInPlaybook(list)}
            ...
          >
            Use in workflow
          </button>
        </div>
      ))
    ) : (
      <p className="...">No target lists yet.</p>
    )}
    <Link href="/pipeline" ...>
      Create or manage lists →
    </Link>
  </div>
)}
```

**After:**
```tsx
<button
  onClick={() => setRecentTargetsOpen((o) => !o)}
  className="..."
>
  <span>Recent pipelines</span>
  ...
</button>
{recentTargetsOpen && (
  <div className="...">
    {recentPipelines.length ? (
      recentPipelines.map((pipeline) => {
        const count = applyFilters(relationships, pipeline.filterCriteria).length;
        const summary = formatFilterSummary(pipeline.filterCriteria);
        return (
          <div key={pipeline.id} ...>
            <div>
              <p className="...">{pipeline.name}</p>
              <p className="...">
                {count} relationships • {summary || "All"}
              </p>
            </div>
            <button
              onClick={() => handleUseInPlaybook(pipeline)}
              ...
            >
              Use in workflow
            </button>
          </div>
        );
      })
    ) : (
      <p className="...">No pipelines yet.</p>
    )}
    <Link href="/pipeline" ...>
      Create or manage pipelines →
    </Link>
  </div>
)}
```

---

## Step 7: Update Header Links

**File:** `src/app/workflows/page.tsx`

### 7.1 Change link text

**Before:**
```tsx
<Link href="/pipeline" ...>
  View target lists →
</Link>
```

**After:**
```tsx
<Link href="/pipeline" ...>
  View pipelines →
</Link>
```

---

## Step 8: Optional — Pass Pipeline Context to Tomo

**File:** `src/app/workflows/page.tsx` (WorkflowTomoChat)

If you want Tomo to know which pipeline/relationships a workflow targets:

### 8.1 Pass pipeline context to WorkflowTomoChat

```tsx
<WorkflowTomoChat
  workflow={workflow}
  playbookName={selectedPlaybook.name}
  playbookType={selectedPlaybook.type}
  pipelineContext={pipelineContext}  // NEW
  onWorkflowUpdate={handleWorkflowUpdate}
/>
```

Where `pipelineContext` is derived:

```ts
const pipelineContext = useMemo(() => {
  if (!selectedPlaybook) return null;
  const override = playbookOverrides[selectedPlaybook.id];
  const pipelineId = override?.pipelineId ?? selectedPlaybook.pipelineId;
  if (!pipelineId) return null;
  const pipeline = pipelines.find((p) => p.id === pipelineId);
  if (!pipeline) return null;
  const rels = applyFilters(relationships, pipeline.filterCriteria);
  return {
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    relationshipIds: rels.map((r) => r.id),
    relationshipCount: rels.length,
  };
}, [selectedPlaybook, playbookOverrides, pipelines]);
```

### 8.2 Update WorkflowTomoChat sendMessage body

```ts
body: {
  context: {
    surface: "workflow" as const,
    page: "workflows",
    workflowContext: currentMarkdown,
    playbookName,
    playbookType,
    pipelineContext,  // NEW — for Tomo to target specific relationships
  },
},
```

Then update `src/app/api/tomo/orchestrate/route.ts` to handle `pipelineContext` in context (e.g. pass `relationshipIds` to tools).

---

## Step 9: Clean Up Deprecated Code

### 9.1 Remove TargetList import from mockPlaybooks

**File:** `src/lib/mockPlaybooks.ts`

If `TargetFilter` is only used for deprecated `targetFilters`, you can:
- Keep the import for `targetFilters` during transition, or
- Remove `targetFilters` and `TargetFilter` entirely once migration is complete.

### 9.2 Deprecate targets.ts usage

**File:** `src/lib/targets.ts`

- Add `@deprecated` JSDoc (already present).
- After workflows migration, remove any remaining imports.
- If pipeline page no longer uses targets, consider deleting `targets.ts`.

---

## Step 10: Verify Pipeline Page

**File:** `src/app/pipeline/page.tsx`

- Confirm pipeline page is the source of pipelines (create/manage).
- No changes needed if it already uses `usePipelines` and `addPipeline`.

---

## Checklist

- [x] Step 1: Update Playbook type in mockPlaybooks.ts
- [x] Step 2: Update override type and storage key
- [x] Step 3: Replace TargetList with Pipeline (imports, hooks)
- [x] Step 4: Update getPlaybookTargetsSummary
- [x] Step 5: Update handleUseInPlaybook
- [x] Step 6: Update "Recent pipelines" section UI
- [x] Step 7: Update header links
- [x] Step 8: (Optional) Pass pipeline context to Tomo
- [x] Step 9: Clean up deprecated code
- [x] Step 10: Verify pipeline page

---

## Testing

1. **Workflows page loads** — No errors, playbooks visible.
2. **Target summary** — Playbooks with `filterCriteria` show count + summary.
3. **Pipeline override** — "Use in workflow" on a pipeline updates the playbook card.
4. **Links** — "View pipelines" and "Create or manage pipelines" go to `/pipeline`.
5. **Empty state** — "No pipelines yet" when none exist.
6. **Fund scope** — Pipelines shown match `activeFundId` (or "all").
