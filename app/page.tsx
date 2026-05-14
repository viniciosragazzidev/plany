import { Logo } from "@/components/ui/logo";
import { Pencil } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 shadow-sm  shadow-zinc-200/20 dark:shadow-zinc-800/20 bg-white/30 dark:bg-black/30 sm:items-start">
      <Logo className=" right-1 relative" />
        
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-md text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
             Bem vindo ao <span className="font-bold">Plany</span>, o seu assistente de estudos inteligente!
          </h1>
          <p className="max-w-md text-md leading-8 text-zinc-600 dark:text-zinc-400">
             Com o Plany, você pode criar planos de estudo personalizados, acompanhar seu progresso e receber recomendações inteligentes.
             
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full bg-primary items-center justify-center gap-2 rounded-full  px-5 text-background transition-colors hover:bg-primary/80   md:w-[158px]"
            href="/login"
            rel="noopener noreferrer"
          >
            <HugeiconsIcon className="" icon={Pencil} />
            Faça login
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="/register"
            rel="noopener noreferrer"
          >
            Crie uma conta
          </a>
        </div>
      </main>
    </div>
  );
}
