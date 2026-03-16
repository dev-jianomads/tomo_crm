# Relationships CSV Upload — Investigation

Investigation into adding a CSV upload feature to the Relationships page for bulk adding rows, and how Tomo can support this flow.

---

## 1. Current Architecture

### Relationships Data
- **Source:** `src/lib/mockData.ts` — `relationships` is a static array from `generateRelationships()` (50 items)
- **Schema:** `Relationship` type has 26+ fields (name, firm, stage, tier, momentumDirection, investorType, etc.)
- **Persistence:** None — data is read-only mock. Production plan mentions Supabase.

### Tomo
- **Orchestrator:** `POST /api/tomo/orchestrate` — routes user intent to tools
- **Tools:** `filter_relationships`, `update_workflow`, `update_crm`, `draft_reply`
- **Relationships page:** Uses `RelationshipsFilterChat` (surface: `filter`) for natural-language filtering
- **Drawer:** `ContextDrawer` + `DrawerSection2TomoChat` for entity-level actions (surface: `drawer`)

### Existing CSV Pattern
- **Onboarding:** `uploadContactsSeed()` in `src/lib/integrations.ts` — mock that accepts `.csv,.xls,.xlsx`, returns `{ ok, filename, rowCount }`
- **UI:** File input → `onChange` → `handleContactsUpload` → `uploadContactsSeed(file)` → toast/success state
- **No real parsing** — mock estimates row count from file size

---

## 2. Implementation Options

### Option A: Dedicated API + Simple UI (No Tomo)

**Flow:** Upload button → file picker → `POST /api/relationships/upload-csv` → parse CSV → return preview → confirm → bulk add

**Pros:** Simple, predictable, no token cost  
**Cons:** No AI assistance for column mapping or validation

---

### Option B: Tomo-Assisted Upload (Recommended)

**Flow:**
1. User clicks "Upload CSV" in relationships header
2. File picker → parse CSV client-side (or via API)
3. **Preview modal** shows: headers, sample rows, validation issues
4. **Tomo helps:**
   - Column mapping: "Map 'Investor Name' → `name`" via natural language
   - Validation: "3 rows have invalid `stage` — suggest defaults?"
   - Enrichment: "Fill missing `tier` with 'Tier 2' for new prospects?"
5. User confirms → bulk add via API or client merge

**Tomo integration:**
- Add new surface: `bulk_import` (or extend `relationships` page context)
- New tool: `map_csv_columns` — accepts `{ csvHeaders: string[], suggestedMapping: Record<string, string> }` → returns validated mapping
- Or: `preview_bulk_import` — accepts parsed rows, returns validation report + suggested fixes

**Pros:** Tomo adds value for messy CSVs, column mapping, validation  
**Cons:** More complex; need to pass CSV context to orchestrator (token-aware)

---

### Option C: Tomo-First Chat Flow

**Flow:** User says "I want to bulk add relationships from a CSV" in the filter chat → Tomo replies "Upload your file" → file upload appears inline → Tomo processes and confirms

**Tomo integration:**
- Extend `filter_relationships` surface to accept `bulk_import` intent
- Tool `bulk_add_relationships` receives file reference or parsed rows
- Problem: Large CSVs (100+ rows) would blow token limits if sent in messages

**Pros:** Single conversational entry point  
**Cons:** Token limits, file handling in chat is awkward, not ideal for large imports

---

## 3. Recommended Approach: Option B (Tomo-Assisted)

### Phase 1: Core Upload (No Tomo)
1. Add "Upload CSV" button to relationships page header (next to view toggle)
2. `POST /api/relationships/upload-csv`:
   - Accept `multipart/form-data` with `file`
   - Parse CSV (native or lightweight lib)
   - Return `{ headers, rows, sampleRows, validationErrors? }`
3. Preview modal: show headers, sample, validation
4. Client-side merge: `usePersistentState("tomo-relationships-user-added", [])` — append new rows to mock data for display
5. Relationships page: `const allRels = useMemo(() => [...relationships, ...userAdded], [userAdded])`

### Phase 2: Tomo Assistance
1. Add `bulk_import` context to orchestrator when preview modal is open
2. New tool: `suggest_csv_mapping` — given CSV headers, return suggested mapping to Relationship fields
3. New tool: `validate_bulk_rows` — given mapped rows, return validation report (missing required, invalid enums)
4. Filter chat or a dedicated "Ask Tomo" in the preview modal can invoke these

### Phase 3: Production
- Replace client merge with Supabase `relationships` table insert
- Background job for large files (e.g. >100 rows)
- Tomo can help with deduplication ("3 rows match existing LPs — merge or skip?")

---

## 4. Technical Details

### CSV Parsing
- **No CSV lib in package.json** — add `papaparse` or use native:
  ```ts
  // Simple CSV parse (handles basic cases)
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
  ```
- For production: use `papaparse` (handles quoted fields, escaping)

### Column Mapping
- Relationship fields: `name`, `firm`, `stage`, `tier`, `momentumDirection`, `investorType`, etc.
- Common CSV headers: "Name", "Investor Name", "LP", "Firm", "Company", "Stage", "Tier", etc.
- Tomo can suggest mapping via `suggest_csv_mapping` tool using LLM to match headers → schema

### Persistence (Current)
- Use `usePersistentState("tomo-relationships-user-added", [])` for user-added rows
- Merge at render: `[...relationships, ...userAdded]` and pass to filters/sort
- IDs: generate `id` for new rows (e.g. `upload-${Date.now()}-${i}`)

### Required vs Optional Fields
- **Required:** `name`, `firm`, `daysSinceLastMeaningfulContact`, `stage`, `momentumDirection`, `tier`, `relationshipOwner`, `investorType`, `strategyFit`, `strategyType`, `lpLocation`, `investmentRemit`, `typicalCheckSize`, `fundSizePreference`, `source`, `lastFundHistory`, `decisionTimeline`, `fiscalYearEnd`, `consultantDependent`, `esgRequired`, `nextMove`, `openLoops`, `band`
- **Optional:** `sourceDetail`, `lastFundCheckSize`, `consultantName`, `lastMeetingDate`, `contactSeniority`
- Defaults for bulk: `daysSinceLastMeaningfulContact: 0`, `nextMove: ""`, `openLoops: 0`, and sensible enum defaults (e.g. `Unknown` where applicable)

---

## 5. UI Placement

**Relationships page header** (around line 383–488 in `page.tsx`):
- Add "Upload CSV" button next to the column visibility and view mode toggles
- Or: Add to the filter chat header as a secondary action ("Upload CSV" link/button)

**Preview modal:**
- Full-screen overlay or large modal
- Left: CSV preview table (first 10–20 rows)
- Right: Column mapping (dropdown per Relationship field) + Tomo chat for "Help me map columns"
- Bottom: Validation summary + "Add X relationships" button

---

## 6. Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/api/relationships/upload-csv/route.ts` | **Create** — parse CSV, return headers + rows |
| `src/app/relationships/page.tsx` | **Modify** — add Upload button, preview modal, merge user-added |
| `src/lib/storage.ts` | **Modify** — or use `usePersistentState` with key `tomo-relationships-user-added` |
| `src/components/relationships-csv-upload-modal.tsx` | **Create** — preview, mapping, confirm |
| `src/app/api/tomo/orchestrate/route.ts` | **Modify** (Phase 2) — add `suggest_csv_mapping`, `validate_bulk_rows` tools |
| `package.json` | **Modify** (optional) — add `papaparse` for robust CSV parsing |

---

## 7. Summary

| Aspect | Recommendation |
|--------|----------------|
| **Approach** | Tomo-assisted upload (Option B) |
| **Phase 1** | Core upload + preview + client merge, no Tomo |
| **Phase 2** | Tomo tools for column mapping and validation |
| **CSV parsing** | Native for MVP; `papaparse` for production |
| **Persistence** | `usePersistentState` for user-added rows (merge with mock) |
| **UI** | Upload button in relationships header → preview modal |
