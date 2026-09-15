import Link from "next/link";

import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { getRepository } from "@/lib/db";
import { formatBRL, formatPhone, onlyDigits } from "@/lib/format";
import { priceFor } from "@/lib/pricing";
import { clubName, requireTenant } from "@/lib/tenant";

export default async function BarbeariaHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const base = `/${tenant.slug}`;

  const repo = getRepository(tenant.id);
  const [services, staff, plans, partners] = await Promise.all([
    repo.listServices(),
    repo.listStaff(),
    repo.listPlans(),
    repo.listPartners(),
  ]);

  // O plano em destaque é a régua da vitrine: mostramos "de/por" com ele.
  const featured = plans.find((p) => p.highlight) ?? plans[0] ?? null;
  const club = clubName(tenant);
  const whatsappDigits = tenant.whatsapp ? onlyDigits(tenant.whatsapp) : "";

  return (
    <div className="space-y-20">
      <section className="pt-4">
        <Badge>{tenant.name}</Badge>
        <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Seu corte em dia.
          <br />
          <span className="text-gold">E vantagem o mês inteiro.</span>
        </h1>
        {tenant.tagline ? (
          <p className="mt-5 max-w-xl text-lg text-muted">{tenant.tagline}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`${base}/agendar`}>Agendar horário</ButtonLink>
          {plans.length > 0 ? (
            <ButtonLink href={`${base}/clube`} variant="outline">
              Conhecer o clube
            </ButtonLink>
          ) : null}
          {whatsappDigits ? (
            <ButtonLink
              href={`https://wa.me/55${whatsappDigits}`}
              variant="ghost"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp {formatPhone(whatsappDigits)}
            </ButtonLink>
          ) : null}
        </div>

        {tenant.address ? <p className="mt-6 text-sm text-muted">{tenant.address}</p> : null}
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight">Como funciona</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Escolha o serviço",
              text: "Corte, barba ou o combo. Cada um com o profissional que faz.",
            },
            {
              step: "2",
              title: "Pegue o horário",
              text: "A agenda mostra só o que está realmente livre. Sem ida e volta no WhatsApp.",
            },
            {
              step: "3",
              title: "Use o clube",
              text: "Assinou, tem serviços inclusos, prioridade na agenda e benefícios fora da cadeira.",
            },
          ].map((item) => (
            <Card key={item.step}>
              <span className="grid size-8 place-items-center rounded-lg bg-gold/15 text-sm font-bold text-gold">
                {item.step}
              </span>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Serviços</h2>
          <Link
            href={`${base}/agendar`}
            className="text-sm font-semibold text-gold hover:underline"
          >
            Ver agenda →
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="mt-6">
            <EmptyState>Os serviços desta barbearia ainda estão sendo cadastrados.</EmptyState>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
            {services.map((service) => {
              const { fullCents, finalCents } = priceFor(service, featured);
              const hasClubPrice = finalCents < fullCents;

              return (
                <li
                  key={service.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-sm text-muted">
                      {service.description ? `${service.description} · ` : ""}
                      {service.durationMin} min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatBRL(fullCents)}</p>
                    {hasClubPrice ? (
                      <p className="text-sm text-gold">
                        {formatBRL(finalCents)} no {featured?.name}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {staff.length > 0 ? (
        <section>
          <h2 className="text-2xl font-bold tracking-tight">Profissionais</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((p) => (
              <li key={p.id}>
                <Card className="flex h-full items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold/15 text-lg font-bold text-gold">
                    {(p.nickname ?? p.name).charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    {p.bio ? <p className="mt-1 text-sm text-muted">{p.bio}</p> : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {plans.length > 0 ? (
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Planos do clube</h2>
            <Link
              href={`${base}/clube`}
              className="text-sm font-semibold text-gold hover:underline"
            >
              Ver detalhes →
            </Link>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`${base}/clube?plano=${plan.id}#assinar`}
                  className={`flex h-full flex-col rounded-xl border bg-surface p-5 transition-colors hover:border-gold ${
                    plan.highlight ? "border-gold/50" : "border-line"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{plan.name}</span>
                    {plan.highlight ? <Badge>Mais escolhido</Badge> : null}
                  </span>
                  <span className="mt-1 text-sm text-muted">{plan.description}</span>
                  <span className="mt-4">
                    <span className="text-xl font-bold">{formatBRL(plan.priceCents)}</span>
                    <span className="text-sm text-muted">/mês</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-2xl font-bold tracking-tight">Benefícios fora da cadeira</h2>
        <p className="mt-2 text-muted">
          Quem é do {club} ganha vantagens em empresas parceiras do MJCLUB.
        </p>

        {partners.length === 0 ? (
          <div className="mt-6">
            <EmptyState>Em breve: benefícios em restaurantes, academias e muito mais.</EmptyState>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <Card key={partner.id} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                    {partner.category}
                  </span>
                  <span className="font-semibold">{partner.name}</span>
                  <span className="text-sm text-muted">{partner.description}</span>
                </Card>
              ))}
            </div>
            <div className="mt-6">
              <ButtonLink href={`${base}/clube/parceiros`} variant="outline">
                Ver todos os benefícios
              </ButtonLink>
            </div>
          </>
        )}
      </section>

      {plans.length > 0 ? (
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Entre para o clube</h2>
          <p className="mt-3 max-w-xl text-muted">
            A partir de {formatBRL(Math.min(...plans.map((p) => p.priceCents)))} por mês, com
            serviços inclusos, prioridade na agenda e benefícios em parceiros.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`${base}/clube`}>Ver planos</ButtonLink>
            <ButtonLink href={`${base}/agendar`} variant="outline">
              Agendar agora
            </ButtonLink>
          </div>
        </section>
      ) : null}
    </div>
  );
}
