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

const importSchema = z.object({
  accountId: z.string().optional(),
});

function pickCategoryForDescription(description: string, rules: { pattern: string; matchType: string; categoryId: string; priority: number }[]) {
  const lower = description.toLowerCase();
  for (const rule of rules) {
    if (rule.matchType === "CONTAINS" && lower.includes(rule.pattern.toLowerCase())) {
      return rule.categoryId;
    }
    if (rule.matchType === "STARTS_WITH" && lower.startsWith(rule.pattern.toLowerCase())) {
      return rule.categoryId;
    }
    if (rule.matchType === "REGEX") {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(description)) {
          return rule.categoryId;
        }
      } catch (err) {
        console.warn("Invalid rule regex", err);
      }
    }
  }
  return null;
}

export async function importCsvAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const parsed = importSchema.safeParse({
    accountId: formData.get("accountId")?.toString(),
  });
  if (!parsed.success) {
    throw new Error("Invalid import request");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Missing CSV file");
  }

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) {
    throw new Error("No household found for user");
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

  const rows = parseBendigoCsv(buffer.toString("utf-8"), householdId, parsed.data.accountId);
  const rules = await prisma.rule.findMany({
    where: { householdId },
    orderBy: { priority: "asc" },
  });

  const transactionsToInsert = rows.map((row) => {
    const categoryId = pickCategoryForDescription(row.description, rules);
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
      categoryId,
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

  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return {
    imported: result.count,
    total: rows.length,
    checksum,
  };
}
