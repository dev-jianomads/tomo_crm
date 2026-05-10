/**
 * @deprecated Import `RELATIONSHIP_QUICK_FILTERS` from `@/lib/relationshipQuickFilters` instead.
 * Kept as a compatibility alias for NL/tooling that referenced the old export name.
 */

import type { StructuredFilterCriteria } from "@/lib/relationshipFilters";
import { RELATIONSHIP_QUICK_FILTERS } from "@/lib/relationshipQuickFilters";

export type RelationshipFilterSuggestion = {
  id: string;
  label: string;
  criteria: StructuredFilterCriteria;
};

export const RELATIONSHIP_FILTER_SUGGESTIONS: RelationshipFilterSuggestion[] =
  RELATIONSHIP_QUICK_FILTERS.map(({ id, label, criteria }) => ({ id, label, criteria }));
