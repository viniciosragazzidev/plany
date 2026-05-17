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
        <div className="top-bar flex justify-between items-center border-b border-border/50 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2 py-0 text-[9px] font-black uppercase tracking-widest">
                Preferências
              </Badge>
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-3">
              <HugeiconsIcon icon={Settings01Icon} size={20} className="text-primary" />
              Configurações
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              Personalize sua experiência de estudo e ajuste o comportamento da IA.
            </p>
          </div>
        </div>

        <SettingsForm initialSettings={initialSettings} user={session.user} />
      </main>
    </div>
  );
}
