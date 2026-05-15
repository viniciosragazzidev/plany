import { getCadernosSidebarData } from "@/lib/actions/cadernos";
import { SidebarCadernos } from "./components/sidebar-cadernos";
import { redirect } from "next/navigation";
import { CadernosProvider } from "./components/cadernos-provider";

export default async function CadernosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getCadernosSidebarData();

  if (!data.success) {
    // Treat as empty or error
    return <div>Erro ao carregar cadernos</div>;
  }

  return (
    <CadernosProvider initialBenches={data.benches || []} initialAnotacoes={data.anotacoes || []}>
      <div className="flex w-full h-full min-h-screen bg-background text-foreground">
        <SidebarCadernos />
        <main className="flex-1 flex flex-col relative h-full">
          {children}
        </main>
      </div>
    </CadernosProvider>
  );
}
