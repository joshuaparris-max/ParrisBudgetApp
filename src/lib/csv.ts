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

export function parseBendigoCsv(content: string, householdId: string, accountId?: string | null) {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const rows: ParsedTransaction[] = records.map((row) => {
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

    const dateString = row.Date || row["Transaction Date"] || row["Value Date"];
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
