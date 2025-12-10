import { prisma } from "./prisma";

export async function getHouseholdIdForUser(userId: string) {
  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    select: { householdId: true },
  });
  return membership?.householdId ?? null;
}
