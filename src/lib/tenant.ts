import "server-only";

import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { cache } from "react";

import { memberCodePrefix } from "./codes";
import { findTenantBySlug, getPlatform, legacyTenantId } from "./db";
import type { Tenant } from "./types";

/**
 * Barbearia do endereço `/[slug]`, resolvida a cada requisição.
 *
 * O `cache` do React vale só dentro de UMA renderização: layout, página e
 * `generateMetadata` perguntam a mesma coisa e o banco responde uma vez. Nada
 * fica guardado entre requisições.
 */
export const resolveTenant = cache(
  async (slug: string): Promise<Tenant | null> => findTenantBySlug(getPlatform(), slug),
);

/** Como `resolveTenant`, mas responde 404 quando não há barbearia ativa. */
export async function requireTenant(slug: string): Promise<Tenant> {
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  return tenant;
}

/** A MJ ainda é dona de `/entrar`, `/minha-conta`, `/admin` e `/parceiro`. */
export function isLegacyTenant(tenant: Tenant): boolean {
  return tenant.id === legacyTenantId();
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_BRAND = "#c8a24a";

/**
 * Cor da barbearia como variável CSS. Os utilitários `gold` do Tailwind leem
 * `--color-gold`, então sobrescrever a variável no contêiner pinta o site todo.
 * A cor vem do banco: só hexadecimal passa, para ninguém injetar CSS por ali.
 */
export function brandStyle(tenant: Tenant): CSSProperties {
  const color = HEX_COLOR.test(tenant.brandPrimary) ? tenant.brandPrimary : DEFAULT_BRAND;
  return {
    "--color-gold": color,
    "--color-gold-soft": `color-mix(in oklab, ${color} 70%, white)`,
  } as CSSProperties;
}

/** Sigla curta para o selo do cabeçalho ("MJ Barbearia" → "MJ"). */
export function tenantInitials(tenant: Tenant): string {
  return memberCodePrefix(tenant.name).slice(0, 3);
}

/** Nome do clube de cada barbearia na vitrine dela. */
export function clubName(tenant: Tenant): string {
  return `Clube ${tenant.name}`;
}
