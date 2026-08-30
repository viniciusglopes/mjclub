import { activeDriver } from "@/lib/db";

/**
 * Sonda de saúde para o orquestrador (Coolify, Docker, balanceador).
 *
 * Responde sem tocar no banco de propósito: o container estar de pé e o
 * Supabase estar acessível são problemas diferentes, e misturá-los faria o
 * orquestrador reiniciar o app por causa de uma instabilidade do banco.
 *
 * Os avisos existem porque configuração faltando não derruba o app na hora —
 * a sessão só falha quando alguém tenta entrar. Aqui isso aparece no primeiro
 * olhar depois do deploy, em vez de virar um chamado dias depois.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const warnings: string[] = [];

  if (process.env.NODE_ENV === "production") {
    if (!process.env.POC_SESSION_SECRET) {
      warnings.push(
        "POC_SESSION_SECRET não definida: entrar no clube, no painel da " +
          "barbearia ou no do parceiro vai falhar.",
      );
    }
    if (activeDriver() === "demo") {
      warnings.push(
        "Rodando com dados em memória: defina SUPABASE_URL e " +
          "SUPABASE_SERVICE_ROLE_KEY para usar o banco real.",
      );
    }
  }

  return Response.json({
    status: "ok",
    driver: activeDriver(),
    warnings,
    at: new Date().toISOString(),
  });
}
