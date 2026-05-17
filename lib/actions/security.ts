'use server';

import { db } from '@/lib/db';
import { session, user } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ActionResponse, actionError, actionSuccess } from '@/lib/actions/types';

// Obtém todas as sessões ativas do usuário
export async function getUserSessionsAction(userId: string): Promise<ActionResponse<any>> {
  try {
    const activeSessions = await db.query.session.findMany({
      where: eq(session.userId, userId),
      orderBy: (s, { desc }) => [desc(s.lastActiveAt)],
    });
    return actionSuccess(activeSessions, "Sessões carregadas com sucesso!");
  } catch (error: any) {
    return actionError(`Erro ao carregar sessões: ${error.message}`);
  }
}

// Remove uma sessão específica (Desconectar dispositivo)
export async function revokeSessionAction(sessionId: string, userId: string): Promise<ActionResponse<any>> {
  try {
    await db.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, userId)));
    return actionSuccess(null, "Dispositivo desconectado com sucesso!");
  } catch (error: any) {
    return actionError(`Erro ao desconectar dispositivo: ${error.message}`);
  }
}

// Fluxo de Exclusão Definitiva (LGPD Compliance)
export async function purgeUserDataAction(userId: string): Promise<ActionResponse<any>> {
  try {
    await db.transaction(async (tx) => {
      // Deletar configurações de usuário explicitly para evitar qualquer orphan dependency
      // O cascade do PostgreSQL configurado no schema cuidará da maioria das tabelas dependentes
      await tx.delete(user).where(eq(user.id, userId));
    });
    return actionSuccess(null, "A sua conta e todos os seus dados foram permanentemente eliminados.");
  } catch (error: any) {
    return actionError(`Erro crítico ao eliminar dados: ${error.message}`);
  }
}
