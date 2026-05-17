'use client';

import { useState, useEffect } from "react";
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
  ComputerIcon,
  CreditCardIcon,
  SecurityIcon,
  SmartPhone01Icon
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  getUserSessionsAction,
  revokeSessionAction,
  purgeUserDataAction
} from "@/lib/actions/security";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [confirmPurgeText, setConfirmPurgeText] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await getUserSessionsAction(user.id);
      if (res.success && res.data) {
        setSessionsList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    const previousSessions = [...sessionsList];
    setSessionsList(sessionsList.filter(s => s.id !== sessionId));
    toast.success("Desconectando dispositivo...");

    try {
      const res = await revokeSessionAction(sessionId, user.id);
      if (res.success) {
        toast.success(res.message || "Dispositivo desconectado!");
      } else {
        toast.error(res.error || "Erro ao desconectar.");
        setSessionsList(previousSessions);
      }
    } catch (err) {
      toast.error("Erro ao desconectar dispositivo.");
      setSessionsList(previousSessions);
    }
  };

  const handleExportData = () => {
    const dataToExport = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      settings: initialSettings,
      exportedAt: new Date().toISOString(),
      disclaimer: "Dados exportados em conformidade com o Artigo 18 da LGPD (PLANY 2026)."
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plany-dados-exportados-${user.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    link.click();
    toast.success("Seus dados foram empacotados e o download foi iniciado!");
  };

  const handlePurgeAccount = async () => {
    if (confirmPurgeText !== "ELIMINAR MINHA CONTA") {
      toast.error("Por favor, digite a frase de confirmação exatamente.");
      return;
    }

    setIsPurging(true);
    const toastId = toast.loading("Eliminando permanentemente todos os seus dados...");

    try {
      const res = await purgeUserDataAction(user.id);
      if (res.success) {
        toast.success("Dados permanentemente excluídos. Adeus!", { id: toastId });
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        toast.error(res.error || "Erro ao eliminar dados.", { id: toastId });
        setIsPurging(false);
      }
    } catch (err) {
      toast.error("Erro crítico ao eliminar dados.", { id: toastId });
      setIsPurging(false);
    }
  };

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
              <TabsTrigger value="subscription" className="rounded-xl px-6 py-4 data-[state=active]:bg-background cursor-pointer data-[state=active]:shadow-sm transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <HugeiconsIcon icon={CreditCardIcon} size={16} />
                Assinatura
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl px-6 py-4 data-[state=active]:bg-background cursor-pointer data-[state=active]:shadow-sm transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <HugeiconsIcon icon={SecurityIcon} size={16} />
                Segurança & Privacidade
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
          
          {/* Aba 4: Assinatura */}
          <TabsContent value="subscription" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <Card className="border-border/50 py-0 bg-background/50 backdrop-blur-sm overflow-hidden rounded-[2rem] shadow-xl shadow-primary/5">
              <CardHeader className="p-8 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <HugeiconsIcon icon={CreditCardIcon} size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Plano & Assinatura</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Gerencie seu plano de acesso e dados de faturamento.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card do Status Atual */}
                  <div className="p-6 rounded-2xl bg-secondary/5 border border-border/30 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        Acesso Liberado (Modo Dev)
                      </span>
                      <h4 className="text-lg font-bold text-foreground pt-1">Plano Atual: Desenvolvedor</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Você está utilizando o plano de desenvolvimento do PLANY. O acesso a todas as ferramentas (Garimpo Inteligente, Upload de PDF, Simulados e Chat com IA) está liberado sem custos.
                      </p>
                    </div>
                    <div className="pt-6 border-t border-border/20 mt-6 flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Próxima Renovação:</span>
                      <span className="text-foreground">N/A (Acesso Vitalício de Teste)</span>
                    </div>
                  </div>

                  {/* Card do Portal */}
                  <div className="p-6 rounded-2xl bg-secondary/5 border border-border/30 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-foreground">Gerenciador de Pagamento</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No futuro, através deste portal você poderá atualizar seus dados de cobrança, trocar de plano, baixar faturas ou cancelar sua assinatura com total autonomia.
                      </p>
                    </div>
                    <div className="mt-6">
                      <Button
                        disabled
                        variant="secondary"
                        type="button"
                        className="w-full text-xs font-bold rounded-xl h-11 border border-border/40"
                      >
                        Gerenciar Assinatura e Cartões (Disponível em breve)
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba 5: Segurança & Privacidade */}
          <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="space-y-8">
              {/* Card Dispositivos */}
              <Card className="border-border/50 py-0 bg-background/50 backdrop-blur-sm overflow-hidden rounded-[2rem] shadow-xl shadow-primary/5">
                <CardHeader className="p-8 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <HugeiconsIcon icon={SecurityIcon} size={24} />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black tracking-tight">Dispositivos Conectados</CardTitle>
                      <CardDescription className="text-muted-foreground font-medium">Gerencie as sessões ativas e desconecte outros dispositivos de forma remota.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {loadingSessions ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                      <HugeiconsIcon icon={Loading03Icon} size={32} className="animate-spin text-primary" />
                      <p className="text-xs font-bold uppercase tracking-wider">Buscando conexões ativas...</p>
                    </div>
                  ) : sessionsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <p className="text-sm font-medium">Nenhuma sessão ativa encontrada.</p>
                    </div>
                  ) : (
                    <div className="border border-border/40 rounded-2xl overflow-hidden bg-secondary/5">
                      <Table>
                        <TableHeader className="bg-secondary/10">
                          <TableRow className="hover:bg-transparent border-b border-border/40">
                            <TableHead className="w-12 text-center"></TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Dispositivo / Navegador</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Endereço IP</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Última Atividade</TableHead>
                            <TableHead className="w-24"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessionsList.map((s) => {
                            const isMobileDevice = s.userAgent && /mobi|android|iphone|ipad/i.test(s.userAgent);
                            return (
                              <TableRow key={s.id} className="hover:bg-secondary/5 border-b border-border/20 transition-colors">
                                <TableCell className="text-center py-4">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <HugeiconsIcon
                                      icon={isMobileDevice ? SmartPhone01Icon : ComputerIcon}
                                      size={16}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold text-sm text-foreground py-4">
                                  <div className="flex flex-col">
                                    <span>{isMobileDevice ? "Dispositivo Móvel" : "Computador / Desktop"}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium font-mono line-clamp-1 max-w-[200px]" title={s.userAgent}>
                                      {s.userAgent || "Navegador desconhecido"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground py-4">
                                  {s.ipAddress || "Local / Desconhecido"}
                                </TableCell>
                                <TableCell className="text-xs font-semibold text-muted-foreground py-4">
                                  {new Date(s.lastActiveAt).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </TableCell>
                                <TableCell className="text-right py-4 pr-6">
                                  <Button
                                    variant="ghost"
                                    type="button"
                                    onClick={() => handleRevokeSession(s.id)}
                                    className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer h-9 px-3"
                                  >
                                    Desconectar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card Danger Zone (LGPD) */}
              <Card className="border-red-500/20 py-0 bg-red-500/5 backdrop-blur-sm overflow-hidden rounded-[2rem] shadow-xl shadow-red-500/5">
                <CardHeader className="p-8 border-b border-red-500/10 bg-gradient-to-br from-red-500/5 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                      <HugeiconsIcon icon={SecurityIcon} size={24} className="text-red-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black tracking-tight text-red-500">Zona de Perigo (LGPD & Privacidade)</CardTitle>
                      <CardDescription className="text-red-400/80 font-medium">Controle total dos seus dados. Ações irreversíveis que impactam a sua privacidade.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Seção exportar dados */}
                    <div className="p-6 rounded-2xl bg-background/40 border border-border/40 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-foreground">Direito de Portabilidade (Art. 18 LGPD)</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Baixe uma cópia completa de todos os seus dados estruturados (cadernos, preferências e Persona) no formato padrão JSON de forma instantânea.
                        </p>
                      </div>
                      <div className="mt-6">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={handleExportData}
                          className="w-full text-xs font-bold rounded-xl h-11 border border-border/40 hover:bg-secondary/10"
                        >
                          Exportar Meus Dados
                        </Button>
                      </div>
                    </div>

                    {/* Seção deletar conta */}
                    <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-red-500">Exclusão Permanente de Dados</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Apague definitivamente sua conta e toda sua base de dados (bancadas, materiais vetorizados, resumos e anotações). Esta ação é **irreversível**.
                        </p>
                      </div>
                      <div className="mt-6">
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="destructive"
                                type="button"
                                className="w-full text-xs font-bold rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/15"
                              >
                                Eliminar Conta & Dados
                              </Button>
                            }
                          />
                          <AlertDialogContent className="rounded-3xl border-red-500/20 max-w-md bg-background p-6">
                            <AlertDialogHeader className="space-y-3">
                              <AlertDialogTitle className="text-xl font-black text-red-500 tracking-tight">Você tem certeza absoluta?</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                                Esta ação é **irreversível** e de conformidade LGPD. Ao prosseguir, todos os seus dados de estudo, materiais, e anotações no PLANY serão eliminados de forma definitiva dos nossos servidores.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="my-4 space-y-2">
                              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Digite <span className="text-red-500 select-all">ELIMINAR MINHA CONTA</span> para confirmar:
                              </label>
                              <Input
                                placeholder="ELIMINAR MINHA CONTA"
                                value={confirmPurgeText}
                                onChange={(e) => setConfirmPurgeText(e.target.value)}
                                className="h-11 rounded-xl font-bold font-mono border-red-500/20 focus-visible:ring-red-500"
                              />
                            </div>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel
                                onClick={() => setConfirmPurgeText("")}
                                className="rounded-xl h-11 text-xs font-bold border border-border/40 cursor-pointer"
                              >
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handlePurgeAccount}
                                disabled={confirmPurgeText !== "ELIMINAR MINHA CONTA" || isPurging}
                                className="rounded-xl h-11 text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isPurging ? "Eliminando..." : "Confirmar Exclusão"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
