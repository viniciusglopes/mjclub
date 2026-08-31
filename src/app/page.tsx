import Link from "next/link";

import { Badge, ButtonLink, Card } from "@/components/ui";
import { getRepository } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { priceFor } from "@/lib/pricing";

export default async function HomePage() {
  const repo = getRepository();
  const [tenant, services, plans, partners] = await Promise.all([
    repo.getTenant(),
    repo.listServices(),
    repo.listPlans(),
    repo.listPartners(),
  ]);

  // O plano em destaque é a régua da vitrine: mostramos "de/por" com ele.
  const featured = plans.find((p) => p.highlight) ?? plans[0] ?? null;

  return (
    <div className="space-y-20">
      <section className="pt-4">
        <Badge>MJ Barbearia · desde 2018</Badge>
        <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Seu corte em dia.
          <br />
          <span className="text-gold">E vantagem o mês inteiro.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">{tenant.tagline}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/agendar">Agendar horário</ButtonLink>
          <ButtonLink href="/clube" variant="outline">
            Conhecer o clube
          </ButtonLink>
        </div>

        {tenant.address ? (
          <p className="mt-6 text-sm text-muted">{tenant.address}</p>
        ) : null}
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
              text: "Assinou, tem desconto na cadeira e na rede de parceiros.",
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
          <Link href="/agendar" className="text-sm font-semibold text-gold hover:underline">
            Ver agenda →
          </Link>
        </div>

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
                    {service.description} · {service.durationMin} min
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
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight">A rede MJ CLUB</h2>
        <p className="mt-2 text-muted">
          Sua carteirinha vale aqui fora também. Mostrou o código, ganhou desconto.
        </p>

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
          <ButtonLink href="/clube/parceiros" variant="outline">
            Ver todos os benefícios
          </ButtonLink>
        </div>
      </section>

      <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-8 sm:p-10">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Entre para o clube
        </h2>
        <p className="mt-3 max-w-xl text-muted">
          A partir de {formatBRL(Math.min(...plans.map((p) => p.priceCents)))} por mês, com
          cortes e barbas inclusos, prioridade na agenda e acesso à rede de parceiros.
        </p>
        <div className="mt-6">
          <ButtonLink href="/clube">Ver planos</ButtonLink>
        </div>
      </section>
    </div>
  );
}
