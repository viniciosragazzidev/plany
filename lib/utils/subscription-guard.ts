import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * FEATURE GUARD: Verifica se o usuário tem permissão para executar uma ação baseada no plano.
 * Atualmente em MODO BYPASS (Tudo liberado para testes).
 */
export async function checkFeatureAccess(userId: string, feature: 'garimpo' | 'pdf_upload' | 'ai_chat'): Promise<boolean> {
  // MODO TESTE ATIVO: Ignora validações e libera o sistema enquanto o app é estruturado
  const ENABLE_PAYWALLS = process.env.ENABLE_PAYWALLS === 'true'; // false por padrão no .env
  if (!ENABLE_PAYWALLS) return true;

  try {
    // Lógica futura adormecida:
    const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
    if (!sub || sub.status !== 'active') return false;
    
    if (feature === 'garimpo' && sub.planTier === 'free') return false; // Exemplo de trava
    return true;
  } catch (error) {
    console.error("[Subscription-Guard] Erro ao checar acesso:", error);
    return true; // Bypass em caso de erro para manter sistema rodável
  }
}
