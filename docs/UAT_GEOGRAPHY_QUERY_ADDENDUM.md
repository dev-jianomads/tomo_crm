# UAT addendum — Geography free-text query

**Status:** Proposed addendum to `TOMO_V1_SRS_DRAFT_2026-06-04.md`  
**Date:** 2026-08-17  
**Applies to:** Tomo-FE + Tomo-BE UAT (Relationships / Lists filter combinator)  
**Does not change:** Mock (`tomo_crm`) CSV loader, aliases, or generated fallback  

Related: [`UAT_SCOPE_CLARIFICATION.md`](./UAT_SCOPE_CLARIFICATION.md) (UAT bar is live FE/BE, not mock parity).

---

## 1. Why this note exists

UAT CRM rows show **city-level Geography** (e.g. `Brisbane, Australia`). The mock now lets Tomo / “Name or firm contains” find those rows via `query`.

June 4 **does not require that today.** Without this addendum, UAT may correctly treat **brisbane** as out of scope even when the Geography column shows `Brisbane, Australia`.

---

## 2. Already in June 4 (no change needed)

- Geography **column** from `lp_organizations` city / country / region (§3.10 Processing item 1, §6.2.2).
- Advanced Geography as a **region** control, not a city field (`design/tomo_relationships_list_v3.html` modal).
- Free-text on **name and firm only** (§3.10 Processing item 6, Story 8.6.2).
- Tier / named filters unchanged.

---

## 3. Gap

The mock **extended** Story 8.6.2: `query` also matches the Geography display string (organization city / country / region). That is product behaviour for the UAT journey “find LPs by the Geography cell,” not a new filter dimension.

---

## 4. Proposed SRS clause

If that journey is in UAT, add a short clause to **§3.10 Processing item 6** and **Story 8.6.2**:

> Free-text (`query` / “Name or firm contains”) is a case-insensitive substring on **name, firm, and the Geography display string** (organization city / country / region). It is not a new city filter dimension. Region remains the Advanced Geography enum (`NA` / `EU`/`EMEA` / `APAC` / `MENA`). City and country strings in Tomo NL go to `query` with full parse completeness; known region names still map to the region enum.

---

## 5. QA callout — display string vs ISO country

Affinity `Location` is `"Brisbane, Australia"`. Schema `lp_organizations.country` is ISO-2 (`AU`).

If UAT stores `AU`, **Australia** only matches if search uses the **same string the Geography column shows** (or an expanded country name). That is a data/display rule. Mock CSV aliases (`Location` → city/country) do not fix this in production.
