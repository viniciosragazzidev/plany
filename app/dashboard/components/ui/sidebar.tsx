 

import { Calendar, CheckCircle, DashboardBrowsingIcon, Folder, Pencil, Settings, User } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import SidebarItems from "./sidebar-items";
 
export default function SidebarDashboard() {
    return (
      <div className="relative  top-0 left-0 w-18 h-screen  overflow-hidden   shrink-0 bg-secondary/20 rounded-lg">
<div className="sticky top-0 left-0 w-full h-screen flex py-3 flex-col gap-4 justify-between items-center">          
     <div className="flex flex-col gap-8">
      <span className="text-muted bg-primary  w-8 h-8 flex justify-center items-center rounded-full"> 
        <HugeiconsIcon className="dark:invert  shrink-0 " size={22  } icon={Pencil} />

          </span>

          <SidebarItems />
     </div>

       <div className="w-8 h-8 bg-primary flex justify-center items-center text-primary-foreground cursor-pointer rounded-full">
        <HugeiconsIcon className="dark:invert  shrink-0 " size={18} icon={User} />
       </div>
         </div>
      </div>
    );
}