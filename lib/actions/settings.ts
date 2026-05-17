'use server';

import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { actionSuccess, actionError, ActionResponse } from './types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Busca as configurações do usuário logado.
 * Se não existirem, cria com valores padrão.
 */
export async function getSettingsAction(): Promise<ActionResponse<any>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return actionError("Não autorizado");
    }

    const userId = session.user.id;

    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!settings) {
      // Cria configurações padrão se não existirem
      const [newSettings] = await db.insert(userSettings).values({
        userId,
        persona: "concurseiro",
        theme: "system",
        fontSize: "base",
        notifySM2: true,
        notifyNewEditais: true,
      }).returning();
      settings = newSettings;
    }

    return actionSuccess(settings);
  } catch (error: any) {
    console.error("[Settings-Action] Erro ao buscar configurações:", error.message);
    return actionError(`Falha ao buscar configurações: ${error.message}`);
  }
}

/**
 * Atualiza as configurações do usuário.
 */
export async function updateSettingsAction(
  data: Partial<typeof userSettings.$inferInsert>
): Promise<ActionResponse<any>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return actionError("Não autorizado");
    }

    const userId = session.user.id;

    const result = await db
      .update(userSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();

    if (result.length === 0) {
      // Se por algum motivo o update falhou (não existia o registro), tenta inserir
      const [newSettings] = await db.insert(userSettings).values({
        userId,
        persona: data.persona || "concurseiro",
        theme: data.theme || "system",
        fontSize: data.fontSize || "base",
        notifySM2: data.notifySM2 ?? true,
        notifyNewEditais: data.notifyNewEditais ?? true,
        ...data,
      }).returning();
      
      revalidatePath('/dashboard/settings');
      return actionSuccess(newSettings, "Configurações inicializadas e atualizadas!");
    }

    revalidatePath('/dashboard/settings');
    return actionSuccess(result[0], "Configurações atualizadas com sucesso!");
  } catch (error: any) {
    console.error("[Settings-Action] Erro ao atualizar configurações:", error.message);
    return actionError(`Falha ao atualizar configurações: ${error.message}`);
  }
}
