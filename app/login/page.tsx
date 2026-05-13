import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import {  Pencil } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans h-[calc(100vh-44px)]">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center gap-4 justify-between py-32 px-16 shadow-sm  shadow-zinc-200/20 dark:shadow-zinc-800/20 bg-white/30 dark:bg-black/30 sm:items-start">
      <Logo className="dark:invert right-1 relative" />
        <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          <h1 className="max-w-md text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Entre na sua conta
          </h1>
          <p className="max-w-md text-sm leading-8 text-zinc-600 dark:text-zinc-400">
             Informe abaixo seu email e senha para acessar sua conta e começar a criar seus planos de estudo personalizados!
             
          </p>
        </div>
        <form className="flex flex-col justify-center gap-4 text-base font-medium w-full sm:w-[400px] pt-5">
            <div className="input-area max-w-xs flex flex-col gap-1">
              <Label htmlFor="email"  >
                Email
              </Label>
              <Input
                type="email"
                id="email"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            <div className="input-area max-w-xs flex flex-col gap-1">
              <Label htmlFor="password"  >
                Senha
              </Label>
              <Input
                type="password"
                id="password"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <Button 
               className="max-w-[160px]"
            rel="noopener noreferrer"
          >
            <HugeiconsIcon className="" size={18} icon={Pencil} />
            Faça login
          </Button>
        </form>
            <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
                <Link
                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
                    href="/register"
                >
                    Não tem uma conta? <span className="font-medium text-foreground">Crie uma agora!</span>
                </Link>
            </div>
      </main>
    </div>
  );
}
