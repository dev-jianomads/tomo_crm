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
      <p className="text-sm text-gray-600">
        We matched columns from your header row. Adjust any field below before importing.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Your column
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Import as
              </th>
              {sampleRow && sampleRow.length > 0 ? (
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Sample value
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {headers.map((header, i) => (
              <tr key={`${header}-${i}`}>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{header || `Column ${i + 1}`}</td>
                <td className="px-3 py-2">
                  <label htmlFor={`${idPrefix}-${i}`} className="sr-only">
                    Map column {header}
                  </label>
                  <select
                    id={`${idPrefix}-${i}`}
                    value={mapping[i] ?? "ignore"}
                    onChange={(e) => onChange(i, e.target.value as ContactImportFieldId)}
                    className="w-full min-w-[12rem] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {CONTACT_IMPORT_FIELD_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                {sampleRow && sampleRow.length > 0 ? (
                  <td className="max-w-[14rem] truncate px-3 py-2 text-gray-600" title={sampleRow[i] ?? ""}>
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
