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
  // assume dd/mm/yyyy
  const [day, month, year] = parts;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function parseAmount(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return Number(cleaned || 0);
}

type CsvRecord = Record<string, string>;

function extractDate(row: CsvRecord) {
  return row.Date || row["Transaction Date"] || row["Value Date"];
}

function parseRecords(content: string): CsvRecord[] {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as CsvRecord[];
}

export function parseBendigoCsv(content: string, householdId: string, accountId?: string | null) {
  let records = parseRecords(content);

  // If the file had no headers, csv-parse will treat the first row as headers, leading to missing date.
  // Detect this by checking for a missing date column and retry with explicit headers.
  if (records.length && !extractDate(records[0])) {
    records = parse(content, {
      columns: ["Date", "Amount", "Description"],
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as CsvRecord[];
  }

  if (records.length === 0) {
    throw new Error("CSV appears empty");
  }

  const rows: ParsedTransaction[] = records.map((row) => {
    const dateString = extractDate(row);
    if (!dateString) {
      throw new Error("Missing date column in CSV");
    }
    const description =
      row.Description ||
      row["Transaction Description"] ||
      row.Details ||
      row["Particulars"] ||
      "Unknown";

    const amountRaw =
      row.Amount || row["Debit"] || row["Credit"] || row["Debit Amount"] || row["Credit Amount"];

    const debit = parseAmount(row.Debit || row["Debit Amount"]);
    const credit = parseAmount(row.Credit || row["Credit Amount"]);
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
