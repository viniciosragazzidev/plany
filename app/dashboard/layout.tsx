import {   SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import SidebarDashboard from "./components/ui/sidebar";

 

 export default function DashboardLayout({
  children,
}: Readonly<{
    children: React.ReactNode;
    }>) {
    return (
 
        <div className="flex">
        <SidebarDashboard/>
          <main className="w-full min-h-screen">
                {children}
             </main>   
           </ div>
    );
}