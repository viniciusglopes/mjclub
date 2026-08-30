import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sessão da POC.
 *
 * ATENÇÃO: isto NÃO é autenticação. Um cookie assinado guarda quem a pessoa
 * disse ser, sem senha nem OTP — serve só para navegar as áreas logadas da
 * demonstração. Antes de qualquer cliente real, trocar por Supabase Auth com
 * OTP por telefone (ver docs/ARCHITECTURE.md §7).
 */

const COOKIE = "mjclub_poc_session";

/**
 * Segredo que assina o cookie.
 *
 * Em desenvolvimento cai num valor fixo, para o app subir sem configuração.
 * Em produção isso seria grave: o valor está no repositório, então qualquer um
 * forjaria um cookie de equipe e entraria no painel da barbearia. Ali a falta
 * da variável derruba a requisição em vez de aceitar um segredo público.
 */
function secret(): string {
  const fromEnv = process.env.POC_SESSION_SECRET;
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "POC_SESSION_SECRET não está definida. Gere uma com `openssl rand -base64 32` " +
        "e configure no ambiente antes de expor o app.",
    );
  }
  return "mjclub-poc-desenvolvimento";
}

export type Session =
  // A equipe não carrega profileId: o repositório já está preso a um tenant,
  // então "ser da equipe" é o bastante para o painel da POC.
  | { kind: "member"; profileId: string }
  | { kind: "staff" }
  | { kind: "partner"; partnerId: string };

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !verify(payload, signature)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
  } catch {
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
