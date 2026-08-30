import "server-only";

import { DemoRepository } from "./demo";
import type { Repository } from "./repository";
import { TENANT_ID } from "./seed";
import { SupabaseRepository } from "./supabase";

export type { NewAppointment, Repository, ValidationResult } from "./repository";

/**
 * A URL do projeto Supabase.
 *
 * Sem o prefixo `NEXT_PUBLIC_` de propósito: o Next embute essas variáveis no
 * bundle em tempo de build, o que gravaria o endereço do banco dentro da
 * imagem Docker e exigiria rebuild para trocar de ambiente. Nada aqui fala com
 * o Supabase pelo navegador, então ela é lida em tempo de execução e a mesma
 * imagem serve para qualquer ambiente. O nome antigo continua valendo para não
 * quebrar quem já tem um .env.local.
 */
function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/**
 * Escolhe o driver pela presença das variáveis do Supabase. Sem elas a POC
 * roda no driver `demo`, em memória, e nenhuma tela precisa saber a diferença.
 */
export function getRepository(): Repository {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tenantId = process.env.MJCLUB_TENANT_ID ?? TENANT_ID;

  if (url && key) return new SupabaseRepository(tenantId, url, key);
  return new DemoRepository();
}

export function activeDriver(): "supabase" | "demo" {
  return supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "demo";
}
