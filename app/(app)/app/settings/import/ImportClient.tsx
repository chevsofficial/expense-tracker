"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { postJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";

type ParsedRow = Record<string, string>;

type ImportResult = {
  data: {
    created: number;
    updated?: number;
    skipped: number;
    errors: { row: number; message: string }[];
  };
};

const entityFields: Record<string, string[]> = {
  transactions: [
    "date",
    "amount",
    "kind",
    "merchant",
    "category",
    "note",
    "receiptUrl",
  ],
  merchants: ["name", "aliases"],
  categories: ["name", "group", "kind", "isArchived"],
};

const parseCsv = (text: string) => {
  const rows: ParsedRow[] = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [] as string[], rows };

  const parseLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map((value) => value.trim());
  };

  const headers = parseLine(lines[0]);
  lines.slice(1).forEach((line) => {
    const values = parseLine(line);
    const row: ParsedRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    rows.push(row);
  });

  return { headers, rows };
};

export function ImportClient({ locale }: { locale: Locale }) {
  const [entity, setEntity] = useState("transactions");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [createMissingMerchants, setCreateMissingMerchants] = useState(true);
  const [createMissingCategories, setCreateMissingCategories] = useState(true);
  const [createMissingGroups, setCreateMissingGroups] = useState(true);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewRows = useMemo(() => rows.slice(0, 20), [rows]);

  const availableFields = entityFields[entity] ?? [];

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setResult(null);
    setError(null);

    const nextMapping: Record<string, string> = {};
    availableFields.forEach((field) => {
      const match = parsed.headers.find(
        (header) => header.toLowerCase() === field.toLowerCase()
      );
      if (match) nextMapping[field] = match;
    });
    setMapping(nextMapping);
  };

  const handleExport = async (path: string) => {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = path.split("/").pop() ?? "export.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "import_error");
      setError(message);
    }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setIsSubmitting(true);
    setResult(null);
    setError(null);
    try {
      const response = await postJSON<ImportResult>("/api/import", {
        entity,
        rows,
        mapping,
        options: {
          createMissingMerchants,
          createMissingCategories,
          createMissingGroups,
          skipInvalidRows,
        },
      });
      setResult(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "import_error");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral">{t(locale, "import_title")}</h1>
        <p className="text-sm opacity-70">{t(locale, "import_subtitle")}</p>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body space-y-4">
          <h2 className="text-sm font-semibold uppercase opacity-60">
            {t(locale, "import_export_title")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => void handleExport("/api/export/transactions")}
            >
              {t(locale, "import_export_transactions")}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => void handleExport("/api/export/merchants")}
            >
              {t(locale, "import_export_merchants")}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => void handleExport("/api/export/categories")}
            >
              {t(locale, "import_export_categories")}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => void handleExport("/api/export/category-groups")}
            >
              {t(locale, "import_export_groups")}
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">{t(locale, "import_entity")}</span>
              <select
                className="select select-bordered"
                value={entity}
                onChange={(event) => {
                  setEntity(event.target.value);
                  setMapping({});
                  setResult(null);
                }}
              >
                <option value="transactions">{t(locale, "import_entity_transactions")}</option>
                <option value="merchants">{t(locale, "import_entity_merchants")}</option>
                <option value="categories">{t(locale, "import_entity_categories")}</option>
              </select>
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1 text-sm font-medium">
                {t(locale, "import_file")}
              </span>
              <input type="file" className="file-input file-input-bordered" onChange={handleFileChange} />
            </label>
          </div>

          {headers.length ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase opacity-60">
                {t(locale, "import_mapping")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {availableFields.map((field) => (
                  <label key={field} className="form-control w-full">
                    <span className="label-text mb-1 text-sm font-medium">
                      {t(locale, `import_field_${field}`)}
                    </span>
                    <select
                      className="select select-bordered"
                      value={mapping[field] ?? ""}
                      onChange={(event) =>
                        setMapping((current) => ({ ...current, [field]: event.target.value }))
                      }
                    >
                      <option value="">{t(locale, "import_mapping_skip")}</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={createMissingMerchants}
                onChange={(event) => setCreateMissingMerchants(event.target.checked)}
              />
              {t(locale, "import_create_merchants")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={createMissingCategories}
                onChange={(event) => setCreateMissingCategories(event.target.checked)}
              />
              {t(locale, "import_create_categories")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={createMissingGroups}
                onChange={(event) => setCreateMissingGroups(event.target.checked)}
              />
              {t(locale, "import_create_groups")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={skipInvalidRows}
                onChange={(event) => setSkipInvalidRows(event.target.checked)}
              />
              {t(locale, "import_skip_invalid")}
            </label>
          </div>

          {previewRows.length ? (
            <div>
              <h3 className="text-sm font-semibold uppercase opacity-60">
                {t(locale, "import_preview")}
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="table">
                  <thead className="bg-base-200 text-base-content">
                    <tr>
                      {headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr key={`${index}`}>
                        {headers.map((header) => (
                          <td key={`${index}-${header}`}>{row[header]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton isLoading={isSubmitting} onClick={handleImport} type="button">
              {t(locale, "import_run")}
            </SubmitButton>
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}
          {result ? (
            <div className="alert alert-success flex flex-col items-start gap-1">
              <span>
                {t(locale, "import_result_created")}: {result.created}
              </span>
              <span>
                {t(locale, "import_result_skipped")}: {result.skipped}
              </span>
              {result.errors.length ? (
                <div className="text-sm">
                  <p className="font-semibold">{t(locale, "import_result_errors")}</p>
                  <ul className="list-disc pl-5">
                    {result.errors.map((err) => (
                      <li key={`${err.row}-${err.message}`}>
                        {t(locale, "import_result_row")} {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
