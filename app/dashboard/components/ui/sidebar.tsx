 

'use client'

import { useState, useEffect } from "react";
import { User, SidebarLeftIcon, Logout01Icon, Settings02Icon, UserCircleIcon, Sun01Icon, Moon01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import SidebarItems from "./sidebar-items";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/logo";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

export default function SidebarDashboard() {
    const [mounted, setMounted] = useState(false);
    const { data: session } = authClient.useSession();
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login");
                },
            },
        });
    };

    const UserMenu = ({ isMobile }: { isMobile: boolean }) => (
        <DropdownMenu>
            <DropdownMenuTrigger 
                nativeButton={false}
                render={
                    <div className={`flex items-center gap-3 cursor-pointer group w-full ${isMobile ? "px-0" : "justify-center"}`}>
                        <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex justify-center items-center text-primary rounded-2xl group-hover:bg-primary/20 transition-colors shrink-0">
                            {session?.user?.image ? (
                                <Image src={session.user.image} alt={session.user.name} width={40} height={40} className="rounded-2xl" />
                            ) : (
                                <HugeiconsIcon className="shrink-0" size={20} icon={User} />
                            )}
                        </div>
                        {isMobile && (
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="text-sm font-semibold truncate">{session?.user?.name || "User Name"}</span>
                                <span className="text-xs text-muted-foreground truncate">{session?.user?.email || "user@example.com"}</span>
                            </div>
                        )}
                    </div>
                } 
            />
            <DropdownMenuContent side={isMobile ? "bottom" : "right"} align={isMobile ? "start" : "end"} className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <div className="px-2 py-1.5 flex flex-col gap-0.5 md:hidden">
                    <span className="text-sm font-medium">{session?.user?.name}</span>
                    <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" asChild>
                    <Link href="/dashboard/settings?tab=profile">
                        <HugeiconsIcon icon={UserCircleIcon} size={16} />
                        Perfil
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" asChild>
                    <Link href="/dashboard/settings">
                        <HugeiconsIcon icon={Settings02Icon} size={16} />
                        Configurações
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-2 py-1.5 focus:bg-accent focus:text-accent-foreground outline-none transition-colors">
                    <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={theme === 'dark' ? Moon01Icon : Sun01Icon} size={16} />
                        <span className="text-sm">Tema Escuro</span>
                    </div>
                    <Switch 
                        checked={theme === 'dark'} 
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
                    />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <HugeiconsIcon icon={Logout01Icon} size={16} />
                    Sair
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const renderSidebarContent = (isMobile: boolean) => (
        <div className={`sticky top-0 left-0 w-full h-screen flex py-6 flex-col justify-between items-center ${isMobile ? "px-2" : ""}`}>          
            <div className="flex flex-col gap-10 w-full items-center">
                <div className={`flex items-center gap-3 ${isMobile ? "px-4 w-full justify-start" : "justify-center"}`}>
                    {isMobile ? <Logo /> : (
                        <img 
                            src="/logo_icon.png" 
                            alt="Logo" 
                            width={48} 
                            height={48} 
                            className="rounded-2xl" 
                        />
                    )}
                </div>

                <div className="w-full">
                    <SidebarItems closeOnSelect={isMobile} />
                </div>
            </div>

            <div className="flex flex-col gap-6 items-center w-full">
                {isMobile && <Separator className="bg-border/50 w-[90%]" />}

                <div className={`flex items-center gap-4 w-full ${isMobile ? "px-4 justify-between" : "justify-center"}`}>
                    <UserMenu isMobile={isMobile} />

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

    if (!mounted) {
        return (
            <div className="sticky top-0 left-0 w-18 h-screen overflow-hidden shrink-0 bg-secondary/10 border-r border-border/50 hidden md:block" />
        );
    }

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