'use client';

import { cn } from '@/lib/utils';
import { Pencil } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) { 
    return (
        <div className={cn('relative  ', className)}>
         <div className="flex   items-center">
            <img 
                src="/logo_icon.png" 
                alt="Logo Icon" 
                width={48} 
                height={48} 
                className="rounded-2xl" 
            />

            <img
                className="dark:invert right-3 relative"        
                src="/logo.png"
                alt="Plany Logo"
                width={120}
                height={40}
            />
         </div>
        </div>
    );
}