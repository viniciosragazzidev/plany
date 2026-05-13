 

'use client'

import { Pencil, User, SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import SidebarItems from "./sidebar-items";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/logo";
import Image from "next/image";

export default function SidebarDashboard() {
    const renderSidebarContent = (isMobile: boolean) => (
        <div className={`sticky top-0 left-0 w-full h-screen flex py-6 flex-col justify-between items-center ${isMobile ? "px-2" : ""}`}>          
            <div className="flex flex-col gap-10 w-full items-center">
                <div className={`flex items-center gap-3 ${isMobile ? "px-4 w-full justify-start" : "justify-center"}`}>
                   
                    {isMobile ?  <Logo /> :   
                         <Image src="/logo_icon.png" alt="Logo" width={48} height={48} className="rounded-2xl" />
 }
                </div>

                <div className="w-full">
                    <SidebarItems closeOnSelect={isMobile} />
                </div>
            </div>

            <div className="flex flex-col gap-6 items-center w-full">
                {isMobile && <Separator className="bg-border/50 w-[90%]" />}

                <div className={`flex items-center gap-4 w-full ${isMobile ? "px-4 justify-between" : "justify-center"}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex justify-center items-center text-primary cursor-pointer rounded-2xl hover:bg-primary/20 transition-colors">
                            <HugeiconsIcon className="shrink-0" size={20} icon={User} />
                        </div>
                        {isMobile && (
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">User Name</span>
                                <span className="text-xs text-muted-foreground">user@example.com</span>
                            </div>
                        )}
                    </div>

                    {isMobile && (
                        <SheetClose render={
                            <Button variant="ghost" size="icon-sm" className="rounded-xl hover:bg-secondary/80">
                                <HugeiconsIcon icon={SidebarLeftIcon} size={20} className="rotate-180" />
                            </Button>
                        } />
                    )}
                </div>
            </div>
        </div>
    );

    return (
      <>
        {/* Desktop Sidebar */}
        <div className="sticky top-0 left-0 w-18 h-screen overflow-hidden shrink-0 bg-secondary/10 border-r border-border/50 hidden md:block">
            {renderSidebarContent(false)}
        </div>

        {/* Mobile Sidebar */}
        <div className="md:hidden fixed top-4 left-4 z-50">
            <Sheet>
                <SheetTrigger render={
                    <Button variant="ghost" size="icon-sm" className="bg-secondary/40 hover:bg-secondary/60 rounded-xl shadow-sm backdrop-blur-md border border-white/20 dark:border-white/10">
                        <HugeiconsIcon icon={SidebarLeftIcon} size={20} />
                    </Button>
                } />
                <SheetContent side="left" showCloseButton={false} className="w-64 p-0 bg-background/95 backdrop-blur-xl border-r border-border/50 outline-none">
                    {renderSidebarContent(true)}
                </SheetContent>
            </Sheet>
        </div>
      </>
    );
}