"use server";

import { ImportStatus, ImportType, TransactionDirection } from "@prisma/client";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { parseBendigoCsv } from "@/lib/csv";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage";
import { recomputeCurrentWeekLedger } from "@/lib/ledger";
import { chooseCategoryFromRules } from "@/lib/rules";

const importSchema = z.object({
  accountId: z.string().optional(),
});

type ImportResult =
  | { error: string }
  | { imported: number; total: number; checksum: string };

export async function importCsvAction(
  _prevState: ImportResult | null,
  formData: FormData | null,
): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!formData) {
    return { error: "No form data received" };
  }

  const parsed = importSchema.safeParse({
    accountId: formData.get("accountId")?.toString() || undefined,
  });
  if (!parsed.success) {
    return { error: "Invalid import request" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Missing CSV file" };
  }

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) {
    return { error: "No household found for user" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const filename = file.name || "import.csv";
  const storagePath = await saveUpload(file, "csv", `${Date.now()}-${filename}`);

  const importRecord = await prisma.import.create({
    data: {
      householdId,
      accountId: parsed.data.accountId ?? null,
      type: ImportType.CSV,
      filename,
      checksum,
      status: ImportStatus.PENDING,
      storagePath,
    },
  });

  let rows;
  try {
    rows = parseBendigoCsv(buffer.toString("utf-8"), householdId, parsed.data.accountId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse CSV";
    return { error: message };
  }
  const rules = await prisma.rule.findMany({
    where: { householdId },
    orderBy: { priority: "asc" },
  });
  const uncategorised = await prisma.category.findFirst({
    where: { householdId, name: "Uncategorised" },
    select: { id: true },
  });

  const transactionsToInsert = rows.map((row) => {
    const categoryId = chooseCategoryFromRules(row.description, rules);
    return {
      householdId,
      accountId: parsed.data.accountId,
      importId: importRecord.id,
      date: row.date,
      description: row.description,
      amount: row.amount,
      direction: row.direction ?? TransactionDirection.DEBIT,
      dedupeHash: row.dedupeHash,
      merchantKey: row.description.toLowerCase(),
      categoryId: categoryId ?? uncategorised?.id ?? null,
    };
  });

  const result = await prisma.transaction.createMany({
    data: transactionsToInsert,
    skipDuplicates: true,
  });

  await prisma.import.update({
    where: { id: importRecord.id },
    data: {
      status: ImportStatus.PARSED,
      parsedAt: new Date(),
      totalTransactions: rows.length,
      processedTransactions: result.count,
    },
  });

  // Recompute current week's ledger so dashboard reflects new spend.
  await recomputeCurrentWeekLedger(householdId);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return {
    imported: result.count,
    total: rows.length,
    checksum,
  };
}
