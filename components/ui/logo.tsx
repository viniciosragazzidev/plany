'use client';

import { cn } from '@/lib/utils';
import { Pencil } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) { 
    return (
        <div className={cn('relative  ', className)}>
         <div className="flex   items-center">
        <HugeiconsIcon className="dark:invert text-primary" size={24} icon={Pencil} />
          <Image
   className="dark:invert  right-3 relative"        
     src="/logo.png"
          alt="Next.js logo"
          width={120}
          height={40}
          priority
        />
         </div>
        </div>
    );
}