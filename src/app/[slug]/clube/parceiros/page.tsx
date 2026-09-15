import type { Metadata } from "next";

import { Badge, ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { getRepository } from "@/lib/db";
import { formatPhone } from "@/lib/format";
import { clubName, isLegacyTenant, requireTenant, resolveTenant } from "@/lib/tenant";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await resolveTenant((await params).slug);
  if (!tenant) return {};
  return {
    title: "Rede de parceiros",
    description: `Benefícios do ${clubName(tenant)} em empresas parceiras do MJCLUB.`,
  };
}

export default async function ParceirosPage({ params }: Props) {
  const tenant = await requireTenant((await params).slug);
  const repo = getRepository(tenant.id);
  const [partners, offers] = await Promise.all([repo.listPartners(), repo.listOffers()]);

  const categories = [...new Set(partners.map((p) => p.category))].sort();

  return (
    <div>
      <PageTitle
        eyebrow={clubName(tenant)}
        title="Benefícios dos parceiros"
        subtitle="Mostre o código da sua carteirinha no balcão e o desconto sai na hora."
      />

      {categories.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Badge key={c} tone="muted">
              {c}
            </Badge>
          ))}
        </div>
      ) : null}

      {partners.length === 0 ? (
        <EmptyState>Em breve: benefícios em restaurantes, academias e muito mais.</EmptyState>
      ) : (
        <div className="space-y-4">
          {partners.map((partner) => {
            const partnerOffers = offers.filter((o) => o.partnerId === partner.id);

            return (
              <Card key={partner.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                      {partner.category}
                    </span>
                    <h2 className="mt-1 text-lg font-bold">{partner.name}</h2>
                    <p className="mt-1 text-sm text-muted">{partner.description}</p>
                  </div>
                  <div className="text-right text-sm text-muted">
                    {partner.address ? <p>{partner.address}</p> : null}
                    {partner.phone ? <p>{formatPhone(partner.phone)}</p> : null}
                  </div>
                </div>

                {partnerOffers.length > 0 ? (
                  <ul className="mt-5 space-y-3 border-t border-line pt-4">
                    {partnerOffers.map((offer) => (
                      <li key={offer.id} className="flex flex-wrap items-start gap-3">
                        <Badge>{offer.discountLabel}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{offer.title}</p>
                          <p className="text-sm text-muted">{offer.description}</p>
                          {offer.rules ? (
                            <p className="mt-1 text-xs text-muted/70">{offer.rules}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-8">
        <h2 className="text-xl font-bold">Tem um negócio e quer ser parceiro?</h2>
        <p className="mt-2 max-w-xl text-muted">
          Os parceiros são cadastrados pelo MJCLUB e aparecem para os clientes das
          barbearias da rede. Você recebe clientes da região e valida os benefícios direto
          no painel — sem cupom de papel.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/">Conhecer o MJCLUB</ButtonLink>
          {isLegacyTenant(tenant) ? (
            <ButtonLink href="/parceiro" prefetch={false} variant="outline">
              Já sou parceiro
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}
