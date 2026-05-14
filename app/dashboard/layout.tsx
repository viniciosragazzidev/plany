import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SidebarDashboard from "./components/ui/sidebar";
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, session.user.id),
  });

  return (
    <div className="flex bg-background min-h-screen">
      <SidebarDashboard />
      <main className="w-full flex-1 relative">
        {children}
        {!profile && <OnboardingDialog forceOpen={true} />}
      </main>
    </div>
  );
}