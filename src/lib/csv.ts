import { TransactionDirection } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { computeTransactionHash } from "./dedupe";

export type ParsedTransaction = {
  date: Date;
  description: string;
  amount: number;
  direction: TransactionDirection;
  externalId?: string;
  dedupeHash: string;
};

function parseDate(value: string): Date {
  const parts = value.split(/[/-]/).map((v) => v.trim());
  if (parts[0].length === 4) {
    // ISO-like yyyy-mm-dd
    return new Date(value);
  }
  if (parts.length < 3) {
    return new Date(value);
  }

  const a = Number(parts[0]);
  const b = Number(parts[1]);
  const y = Number(parts[2]);

  // Heuristic:
  // - If first > 12 => treat as dd/mm
  // - Else if second > 12 => treat as mm/dd
  // - Else default to dd/mm (AU format)
  if (a > 12) {
    return new Date(y, b - 1, a);
  }
  if (b > 12) {
    return new Date(y, a - 1, b);
  }
  return new Date(y, b - 1, a);
}

function parseAmount(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return Number(cleaned || 0);
}

type CsvRecord = Record<string, string>;

type Mapping = {
  name: string;
  headerless?: boolean;
  columns?: string[];
  dateFields?: string[];
  descriptionFields?: string[];
  amountFields?: string[];
  debitFields?: string[];
  creditFields?: string[];
};

const MAPPINGS: Mapping[] = [
  {
    name: "bendigo_headers",
    headerless: false,
    dateFields: ["Date", "Transaction Date", "Value Date"],
    descriptionFields: ["Description", "Transaction Description", "Details", "Particulars"],
    amountFields: ["Amount"],
    debitFields: ["Debit", "Debit Amount"],
    creditFields: ["Credit", "Credit Amount"],
  },
  {
    name: "three_column_no_headers",
    headerless: true,
    columns: ["Date", "Amount", "Description"],
    amountFields: ["Amount"],
  },
  {
    name: "four_column_no_headers",
    headerless: true,
    columns: ["Date", "Amount", "Description", "Balance"],
    amountFields: ["Amount"],
  },
];

function parseWithMapping(content: string, mapping: Mapping): CsvRecord[] {
  return parse(content, {
    columns: mapping.headerless ? mapping.columns : true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as CsvRecord[];
}

function firstField(row: CsvRecord, fields?: string[]) {
  if (!fields) return undefined;
  for (const f of fields) {
    const val = row[f];
    if (val !== undefined) return val;
  }
  return undefined;
}

export function parseBendigoCsv(content: string, householdId: string, accountId?: string | null) {
  let records: CsvRecord[] = [];
  let usedMapping: Mapping | null = null;

  for (const mapping of MAPPINGS) {
    const parsed = parseWithMapping(content, mapping);
    if (!parsed.length) continue;
    const dateCandidate =
      mapping.headerless && mapping.columns
        ? parsed[0][mapping.columns[0]]
        : firstField(parsed[0], mapping.dateFields);
    if (!dateCandidate) continue;
    records = parsed;
    usedMapping = mapping;
    break;
  }

  if (!records.length || !usedMapping) {
    throw new Error("CSV appears empty or missing date column");
  }

  const rows: ParsedTransaction[] = records.map((row) => {
    const dateString =
      (usedMapping.headerless && usedMapping.columns && row[usedMapping.columns[0]]) ||
      firstField(row, usedMapping.dateFields);
    if (!dateString) {
      throw new Error("Missing date column in CSV");
    }
    const description =
      (usedMapping.headerless && usedMapping.columns && row[usedMapping.columns[2]]) ||
      firstField(row, usedMapping.descriptionFields) ||
      "Unknown";

    const amountRaw =
      firstField(row, usedMapping.amountFields) ||
      firstField(row, usedMapping.debitFields) ||
      firstField(row, usedMapping.creditFields);

    const debit = parseAmount(firstField(row, usedMapping.debitFields));
    const credit = parseAmount(firstField(row, usedMapping.creditFields));
    let amount = parseAmount(amountRaw);
    let direction: TransactionDirection = TransactionDirection.DEBIT;

    if (amount === 0) {
      if (debit > 0) {
        amount = debit;
        direction = TransactionDirection.DEBIT;
      } else if (credit > 0) {
        amount = credit;
        direction = TransactionDirection.CREDIT;
      }
    } else {
      direction = amount < 0 ? TransactionDirection.DEBIT : TransactionDirection.CREDIT;
      amount = Math.abs(amount);
    }

    const date = parseDate(dateString);

    const dedupeHash = computeTransactionHash({
      householdId,
      accountId,
      amount,
      date,
      description,
      direction,
    });

    return {
      date,
      description,
      amount,
      direction,
      dedupeHash,
      externalId: row.ID || row.Reference || row["Receipt Number"],
    };
  });

  return rows;
}
