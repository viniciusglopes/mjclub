import { slugValido } from "../slugs";
import type { NewLead, Tenant } from "../types";

/**
 * Dados do MJCLUB como plataforma — o que não pertence a uma barbearia só:
 * descobrir qual barbearia mora em cada endereço, a vitrine da página do
 * produto e os interessados em contratar.
 *
 * O `Repository` responde por UMA barbearia (recebe o tenantId na criação);
 * este aqui é o que decide qual tenantId usar.
 */
export interface PlatformRepository {
  /** Barbearia ATIVA com este slug, ou `null`. */
  getTenantBySlug(slug: string): Promise<Tenant | null>;
  /** Barbearias ativas, para a vitrine da página do produto. */
  listTenants(): Promise<Tenant[]>;

  createLead(lead: NewLead): Promise<void>;
  /** Quantos interesses chegaram desde `sinceISO` pelo mesmo IP ou WhatsApp. */
  countRecentLeads(filter: {
    sinceISO: string;
    ipHash?: string | null;
    whatsapp?: string;
  }): Promise<number>;
}

/**
 * Resolve o tenant de um endereço `/[slug]`.
 *
 * Slug com formato inválido ou reservado nem chega ao banco: `/admin`, `/_next`
 * e companhia nunca podem virar barbearia, mesmo que alguém grave uma linha com
 * esse slug.
 */
export async function findTenantBySlug(
  platform: PlatformRepository,
  slug: string,
): Promise<Tenant | null> {
  let normalized: string;
  try {
    normalized = decodeURIComponent(slug).trim().toLowerCase();
  } catch {
    return null; // `%E0%A4%A` e afins: URL malformada não é barbearia.
  }
  if (!slugValido(normalized)) return null;

  const tenant = await platform.getTenantBySlug(normalized);
  return tenant && tenant.active ? tenant : null;
}
