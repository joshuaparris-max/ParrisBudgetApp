import crypto from "crypto";
import { TransactionDirection } from "@prisma/client";

export type DedupeInput = {
  householdId: string;
  accountId?: string | null;
  date: Date;
  amount: number;
  description: string;
  direction?: TransactionDirection;
};

export function computeTransactionHash(input: DedupeInput) {
  const payload = [
    input.householdId,
    input.accountId ?? "no-account",
    input.date.toISOString().slice(0, 10),
    input.amount.toFixed(2),
    input.description.trim().toLowerCase(),
    input.direction ?? TransactionDirection.DEBIT,
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}
