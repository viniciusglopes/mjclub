import "server-only";

import { DemoPlatform, DemoRepository } from "./demo";
import type { PlatformRepository } from "./platform";
import type { Repository } from "./repository";
import { TENANT_ID } from "./seed";
import { SupabasePlatform, SupabaseRepository } from "./supabase";

export type { NewAppointment, Repository, ValidationResult } from "./repository";
export type { PlatformRepository } from "./platform";
export { findTenantBySlug } from "./platform";

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

function supabaseKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Repositório de UMA barbearia. O tenantId vem de quem chama — no site público,
 * do slug da URL resolvido a cada requisição (`src/lib/tenant.ts`). Não há
 * tenant guardado no processo: duas requisições de barbearias diferentes no
 * mesmo servidor nunca se enxergam.
 *
 * Sem as variáveis do Supabase a POC roda no driver `demo`, em memória.
 */
export function getRepository(tenantId: string): Repository {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (url && key) return new SupabaseRepository(tenantId, url, key);
  return new DemoRepository(tenantId);
}

/** Dados da plataforma: tenant por slug, vitrine e interessados. */
export function getPlatform(): PlatformRepository {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (url && key) return new SupabasePlatform(url, key);
  return new DemoPlatform();
}

/**
 * Tenant das áreas que ainda não são por barbearia: `/entrar`, `/minha-conta`,
 * `/admin` e `/parceiro` continuam sendo da MJ até o login real (fase 2), quando
 * passam a descobrir a barbearia pelo usuário logado.
 */
export function legacyTenantId(): string {
  return process.env.MJCLUB_TENANT_ID || TENANT_ID;
}

export function activeDriver(): "supabase" | "demo" {
  return supabaseUrl() && supabaseKey() ? "supabase" : "demo";
}
