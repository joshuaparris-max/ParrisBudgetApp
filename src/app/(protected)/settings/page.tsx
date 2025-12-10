import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) redirect("/login");

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: { members: { include: { user: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Settings</p>
        <h2 className="text-2xl font-semibold text-white">Household</h2>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white">{household?.name}</h3>
        <p className="text-sm text-slate-300">Members</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-100">
          {household?.members.map((m) => (
            <li key={m.id}>{m.user?.name ?? m.userId}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
