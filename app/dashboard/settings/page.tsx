import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsForm } from "./components/settings-form";
import { getSettingsAction } from "@/lib/actions/settings";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const settingsRes = await getSettingsAction();
  const initialSettings = settingsRes.success ? settingsRes.data : null;

  return (
    <div className="flex flex-col flex-1 font-sans min-h-screen bg-background">
      <main className="p-8 space-y-8 max-w-4xl mx-auto w-full animate-in fade-in duration-700">
        <SettingsForm initialSettings={initialSettings} user={session.user} />
      </main>
    </div>
  );
}
