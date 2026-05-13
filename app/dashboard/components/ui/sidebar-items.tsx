'use client'
import { Calendar, CheckCircle, DashboardBrowsingIcon, Folder, Pencil, Settings } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function SidebarItems() {
    const pathname =  usePathname();
    const items = [
        {
            name: "Dashboard",
            icon: DashboardBrowsingIcon,
            href: "/dashboard"
        },
        {
            name: "Projects",
            icon: Folder,
            href: "/dashboard/projects"
        },
        {
            name: "Tasks",
            icon: CheckCircle,
            href: "/dashboard/tasks"
        },
        {
            name: "Calendar",
            icon: Calendar,
            href: "/dashboard/calendar"
        },
        {
            name: "Settings",
            icon: Settings,
            href: "/dashboard/settings"
        },
    ]
    return (
     <nav>
          <ul className="flex flex-col items-center gap-5 ">
                    {items.map((item) => (
                        <li key={item.name} className={`p-2 text-muted-foreground cursor-pointer group rounded-lg hover:scale-95 transition-all ${pathname === item.href ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>
                            <Link href={item.href}>
                                <HugeiconsIcon className="dark:invert group-hover:scale-90 delay-250 transition-all  shrink-0 " size={18} icon={item.icon} />
                            </Link>
                        </li>
                    ))}
          </ul>
          </nav>
    );
}