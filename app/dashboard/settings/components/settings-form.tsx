'use client';

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAccountIcon,
  PaintBrush01Icon,
  Notification01Icon,
  Tick01Icon,
  Loading03Icon,
  AiChat01Icon,
  TextIcon,
  Moon01Icon,
  Sun01Icon,
  ComputerIcon
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSettingsAction } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

const settingsSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  persona: z.enum(["concurseiro", "universitario", "vestibulando", "profissional"]),
  theme: z.enum(["light", "dark", "system"]),
  fontSize: z.enum(["sm", "base", "lg", "xl"]),
  notifySM2: z.boolean(),
  notifyNewEditais: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  initialSettings: any;
  user: any;
}

export function SettingsForm({ initialSettings, user }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setTheme } = useTheme();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: user.name || "",
      persona: initialSettings?.persona || "concurseiro",
      theme: initialSettings?.theme || "system",
      fontSize: initialSettings?.fontSize || "base",
      notifySM2: initialSettings?.notifySM2 ?? true,
      notifyNewEditais: initialSettings?.notifyNewEditais ?? true,
    },
  });

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);

    // Optimistic feedback
    const toastId = toast.loading("Salvando configurações...");

    try {
      // 1. Update theme in next-themes if it changed
      setTheme(data.theme);

      // 2. Update Font Size (Immediate visual feedback)
      document.documentElement.setAttribute('data-font-size', data.fontSize);

      // 3. Update DB
      const response = await updateSettingsAction({
        persona: data.persona,
        theme: data.theme,
        fontSize: data.fontSize,
        notifySM2: data.notifySM2,
        notifyNewEditais: data.notifyNewEditais,
      });

      if (response.success) {
        toast.success("Tudo pronto! Suas preferências foram salvas.", { id: toastId });
      } else {
        toast.error(response.error || "Falha ao salvar", { id: toastId });
      }
    } catch (error) {
      toast.error("Erro inesperado ao salvar configurações", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="profile" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-secondary/5 p-1 py-5 rounded-2xl border border-border/50 h-auto">
              <TabsTrigger value="profile" className="rounded-xl px-6 py-4 data-[state=active]:bg-background cursor-pointer data-[state=active]:shadow-sm transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <HugeiconsIcon icon={UserAccountIcon} size={16} />
                Perfil & Persona
              </TabsTrigger>
              <TabsTrigger value="appearance" className="rounded-xl px-6 py-4 data-[state=active]:bg-background cursor-pointer data-[state=active]:shadow-sm transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <HugeiconsIcon icon={PaintBrush01Icon} size={16} />
                Aparência
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-xl px-6 py-4 data-[state=active]:bg-background cursor-pointer data-[state=active]:shadow-sm transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <HugeiconsIcon icon={Notification01Icon} size={16} />
                Notificações
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Aba 1: Perfil & Persona */}
          <TabsContent value="profile" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <Card className="  py-0 bg-background/50 border-0 backdrop-blur-sm overflow-hidden rounded-[2rem] shadow-xl shadow-primary/5">
              <CardHeader className="p-8 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <HugeiconsIcon icon={UserAccountIcon} size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Identidade & Persona</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Como o PLANY deve te tratar e como a IA deve se comportar.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Seu Nome de Guerra</FormLabel>
                      <FormControl>
                        <Input placeholder="Como quer ser chamado?" {...field} className="h-12 rounded-xl bg-secondary/10 border-border/50 focus:border-primary/50 transition-all font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="persona"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={AiChat01Icon} size={16} className="text-primary" />
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Persona de Estudo (Calibragem de IA)</FormLabel>
                      </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-secondary/10 border-border/50 font-bold">
                            <SelectValue placeholder="Selecione sua persona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50 min-w-fit w-fit">
                          <SelectItem value="concurseiro" className="font-bold">Concurseiro (Foco em Editais e Leis)</SelectItem>
                          <SelectItem value="universitario" className="font-bold">Universitário (Foco em Teoria e Acadêmico)</SelectItem>
                          <SelectItem value="vestibulando" className="font-bold">Vestibulando (Foco em Base e Enem)</SelectItem>
                          <SelectItem value="profissional" className="font-bold">Profissional (Foco em Prática e Reciclagem)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[11px] font-medium leading-relaxed italic">
                        Esta escolha altera o tom de voz da IA e a prioridade dos materiais buscados no Garimpo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba 2: Aparência */}
          <TabsContent value="appearance" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <Card className="border-border/50 bg-background/50  py-0 backdrop-blur-sm overflow-hidden rounded-[2rem] shadow-xl shadow-primary/5">
              <CardHeader className="p-8 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <HugeiconsIcon icon={PaintBrush01Icon} size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Experiência Visual</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Ajuste a interface para o seu conforto visual e foco.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Modo de Exibição</FormLabel>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { value: "light", label: "Claro", icon: Sun01Icon },
                          { value: "dark", label: "Escuro", icon: Moon01Icon },
                          { value: "system", label: "Sistema", icon: ComputerIcon },
                        ].map((item) => (
                          <div
                            key={item.value}
                            onClick={() => field.onChange(item.value)}
                            className={cn(
                              "cursor-pointer flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all group",
                              field.value === item.value
                                ? "border-primary bg-primary/5 shadow-inner"
                                : "border-border/50 bg-secondary/5 hover:border-border hover:bg-secondary/10"
                            )}
                          >
                            <HugeiconsIcon
                              icon={item.icon}
                              size={24}
                              className={cn(
                                "transition-transform group-hover:scale-110",
                                field.value === item.value ? "text-primary" : "text-muted-foreground"
                              )}
                            />
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              field.value === item.value ? "text-primary" : "text-muted-foreground"
                            )}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fontSize"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={TextIcon} size={16} className="text-primary" />
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tamanho da Fonte (Editor & Chat)</FormLabel>
                      </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-secondary/10 border-border/50 font-bold">
                            <SelectValue placeholder="Selecione o tamanho" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50">
                          <SelectItem value="sm" className="text-sm font-bold">Pequeno (SM)</SelectItem>
                          <SelectItem value="base" className="text-base font-bold">Padrão (Base)</SelectItem>
                          <SelectItem value="lg" className="text-lg font-bold">Grande (LG)</SelectItem>
                          <SelectItem value="xl" className="text-xl font-bold">Extra Grande (XL)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba 3: Notificações */}
          <TabsContent value="notifications" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <Card className="border-border/50  py-0 bg-background/50 backdrop-blur-sm overflow-hidden rounded-[2rem] shadow-xl shadow-primary/5">
              <CardHeader className="p-8 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <HugeiconsIcon icon={Notification01Icon} size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Alertas & Pushes</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Controle como e quando o PLANY deve te interromper.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <FormField
                  control={form.control}
                  name="notifySM2"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 rounded-2xl bg-secondary/5 border border-border/30 hover:bg-secondary/10 transition-colors">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-black tracking-tight">Revisões Inteligentes (SM-2)</FormLabel>
                        <FormDescription className="text-[11px] font-medium text-muted-foreground">
                          Notificar quando houver flashcards ou assuntos pendentes para revisão.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notifyNewEditais"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 rounded-2xl bg-secondary/5 border border-border/30 hover:bg-secondary/10 transition-colors">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-black tracking-tight">Radar de Editais</FormLabel>
                        <FormDescription className="text-[11px] font-medium text-muted-foreground">
                          Alertar sobre novos editais publicados baseados no seu perfil de estudo.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-14 px-10 rounded-2xl gap-3 font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all hover:-translate-y-1 bg-primary text-white shadow-primary/20"
          >
            {isSubmitting ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} size={20} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Tick01Icon} size={20} />
                Confirmar Preferências
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
