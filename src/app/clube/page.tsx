import Link from "next/link";
import type { Metadata } from "next";

import { Alert, Badge, Button, Card, Field, PageTitle, inputClass } from "@/components/ui";
import { getRepository } from "@/lib/db";
import { formatBRL } from "@/lib/format";

import { subscribeToPlan } from "./actions";

export const metadata: Metadata = {
  title: "Clube de benefícios",
  description:
    "Planos do MJCLUB: desconto em todos os serviços da MJ Barbearia e em toda a rede de parceiros.",
};

export default async function ClubePage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const repo = getRepository();
  const [plans, partners, offers] = await Promise.all([
    repo.listPlans(),
    repo.listPartners(),
    repo.listOffers(),
  ]);

  const selected = plans.find((p) => p.id === sp.plano) ?? null;

  return (
    <div className="space-y-14">
      <div>
        <PageTitle
          eyebrow="MJCLUB"
          title="O clube de benefícios"
          subtitle={`Um plano mensal que rende dentro e fora da barbearia: desconto em todos os serviços e ${offers.length} benefícios em ${partners.length} parceiros da região.`}
        />

        {sp.erro ? (
          <div className="mb-6">
            <Alert tone="error">{sp.erro}</Alert>
          </div>
        ) : null}

        <ul className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Card
                className={`flex h-full flex-col ${
                  plan.highlight ? "border-gold/50 bg-gold/[0.06]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  {plan.highlight ? <Badge>Mais escolhido</Badge> : null}
                </div>

                <p className="mt-2 text-sm text-muted">{plan.description}</p>

                <p className="mt-5">
                  <span className="text-3xl font-bold">{formatBRL(plan.priceCents)}</span>
                  <span className="text-sm text-muted">/mês</span>
                </p>

                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden className="text-gold">
                        ✓
                      </span>
                      <span className="text-muted">{b}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/clube?plano=${plan.id}#assinar`}
                  className={`mt-6 inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-gold text-ink hover:bg-gold-soft"
                      : "border border-line hover:border-gold hover:text-gold"
                  }`}
                >
                  Assinar {plan.name}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <section id="assinar" className="scroll-mt-24">
        <h2 className="text-2xl font-bold tracking-tight">
          {selected ? `Assinar o ${selected.name}` : "Assinar um plano"}
        </h2>
        <p className="mt-2 text-muted">
          {selected
            ? `${formatBRL(selected.priceCents)} por mês, cancele quando quiser.`
            : "Escolha um plano acima para continuar."}
        </p>

        {selected ? (
          <form action={subscribeToPlan} className="mt-6 max-w-lg space-y-4">
            <input type="hidden" name="planId" value={selected.id} />

            <Field label="Seu nome">
              <input name="name" required className={inputClass} placeholder="Nome e sobrenome" />
            </Field>

            <Field
              label="Celular com DDD"
              hint="É por ele que reconhecemos você na hora de agendar."
            >
              <input
                name="phone"
                required
                inputMode="tel"
                className={inputClass}
                placeholder="(11) 98888-0002"
              />
            </Field>

            <Alert tone="info">
              Esta é uma POC: nenhuma cobrança é feita e a assinatura já entra ativa.
            </Alert>

            <Button type="submit" className="w-full">
              Ativar minha carteirinha
            </Button>
          </form>
        ) : null}
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Onde sua carteirinha vale</h2>
          <Link
            href="/clube/parceiros"
            className="text-sm font-semibold text-gold hover:underline"
          >
            Ver benefícios →
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <Card key={partner.id}>
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                {partner.category}
              </span>
              <p className="mt-1 font-semibold">{partner.name}</p>
              <p className="mt-1 text-sm text-muted">{partner.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
