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
const SECRET = process.env.POC_SESSION_SECRET ?? "mjclub-poc-desenvolvimento";

export type Session =
  // A equipe não carrega profileId: o repositório já está preso a um tenant,
  // então "ser da equipe" é o bastante para o painel da POC.
  | { kind: "member"; profileId: string }
  | { kind: "staff" }
  | { kind: "partner"; partnerId: string };

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
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
