'use client'
import { Calendar, CheckCircle, DashboardBrowsingIcon, Folder, Pencil, Settings, Note01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SheetClose } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import React from "react";

export default function SidebarItems({ closeOnSelect = false }: { closeOnSelect?: boolean }) {
    const pathname =  usePathname();
    const items = [
        {
            name: "Dashboard",
            icon: DashboardBrowsingIcon,
            href: "/dashboard"
        },
        {
            name: "Bancadas",
            icon: Folder,
            href: "/dashboard/bancadas"
        },
        {
            name: "Tarefas",
            icon: CheckCircle,
            href: "/dashboard/tasks"
        },
        {
            name: "Cadernos",
            icon: Note01Icon,
            href: "/dashboard/cadernos"
        },
        {
            name: "Configurações",
            icon: Settings,
            href: "/dashboard/settings"
        },
    ]

    return (
     <nav className="w-full">
          <TooltipProvider delay={0}>
          <ul className={`flex flex-col gap-3 ${closeOnSelect ? "items-stretch px-4" : "items-center"}`}>
                    {items.map((item) => {
                        const isActive = pathname === item.href;
                        const content = (
                            <li className={`flex items-center gap-3 p-2 cursor-pointer group rounded-xl transition-all ${isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-transparent text-foreground/80 hover:bg-primary/70 hover:text-primary-foreground"}`}>
                                <HugeiconsIcon className={`${isActive ? "" : "group-hover:scale-110"} transition-all shrink-0`} size={20} icon={item.icon} />
                                {closeOnSelect && <span className="font-medium text-sm">{item.name}</span>}
                            </li>
                        )

                        const trigger = closeOnSelect ? (
                            <SheetClose render={<Link href={item.href}>{content}</Link>} />
                        ) : (
                            <Link href={item.href}>{content}</Link>
                        );

                        if (!closeOnSelect) {
                            return (
                                <Tooltip key={item.name}>
                                    <TooltipTrigger render={trigger} />
                                    <TooltipContent side="right">
                                        {item.name}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return <React.Fragment key={item.name}>{trigger}</React.Fragment>;
                    })}
          </ul>
          </TooltipProvider>
          </nav>
    );
}