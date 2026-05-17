import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    // No futuro, aqui validaremos a assinatura criptográfica do Stripe/Asaas
    
    console.log('🔔 Webhook de faturamento recebido (Modo Preparado):', body);

    // O retorno 200 é obrigatório para as integradoras não ficarem reenviando o payload
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
