import "server-only";

import { DemoRepository } from "./demo";
import type { Repository } from "./repository";
import { TENANT_ID } from "./seed";
import { SupabaseRepository } from "./supabase";

export type { NewAppointment, Repository, ValidationResult } from "./repository";

/**
 * Escolhe o driver pela presença das variáveis do Supabase. Sem elas a POC
 * roda no driver `demo`, em memória, e nenhuma tela precisa saber a diferença.
 */
export function getRepository(): Repository {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tenantId = process.env.MJCLUB_TENANT_ID ?? TENANT_ID;

  if (url && key) return new SupabaseRepository(tenantId, url, key);
  return new DemoRepository();
}

export function activeDriver(): "supabase" | "demo" {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "supabase"
    : "demo";
}
