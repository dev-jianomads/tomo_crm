"use client";

import {
  CONTACT_IMPORT_FIELD_OPTIONS,
  type ContactImportFieldId,
} from "@/lib/contactImportMock";

type ContactImportFieldMappingProps = {
  headers: string[];
  mapping: ContactImportFieldId[];
  onChange: (columnIndex: number, field: ContactImportFieldId) => void;
  sampleRow?: string[] | null;
  idPrefix?: string;
};

/**
 * Editable auto-matched column → CRM field table, plus optional first-row preview.
 */
export function ContactImportFieldMapping({
  headers,
  mapping,
  onChange,
  sampleRow,
  idPrefix = "map",
}: ContactImportFieldMappingProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--tomo-body)]">
        We matched columns from your header row. Adjust any field below before importing.
      </p>

      <div className="overflow-x-auto rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] shadow-[var(--tomo-shadow-1)]">
        <table className="min-w-full divide-y divide-[color:var(--tomo-rule-soft)] text-sm">
          <thead className="bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_60%,var(--tomo-card))]">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
                Your column
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
                Import as
              </th>
              {sampleRow && sampleRow.length > 0 ? (
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
                  Sample value
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
            {headers.map((header, i) => (
              <tr key={`${header}-${i}`}>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-[color:var(--foreground)]">
                  {header || `Column ${i + 1}`}
                </td>
                <td className="px-3 py-2">
                  <label htmlFor={`${idPrefix}-${i}`} className="sr-only">
                    Map column {header}
                  </label>
                  <select
                    id={`${idPrefix}-${i}`}
                    value={mapping[i] ?? "ignore"}
                    onChange={(e) => onChange(i, e.target.value as ContactImportFieldId)}
                    className="tomo-input min-w-[12rem] py-1.5 text-sm shadow-none"
                  >
                    {CONTACT_IMPORT_FIELD_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                {sampleRow && sampleRow.length > 0 ? (
                  <td className="max-w-[14rem] truncate px-3 py-2 text-[color:var(--tomo-body)]" title={sampleRow[i] ?? ""}>
                    {sampleRow[i] ?? "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
