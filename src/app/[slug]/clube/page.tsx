import Link from "next/link";
import type { Metadata } from "next";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageTitle,
  inputClass,
} from "@/components/ui";
import { getRepository } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { clubName, requireTenant, resolveTenant } from "@/lib/tenant";

import { subscribeToPlan } from "./actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ plano?: string; erro?: string; assinado?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const tenant = await resolveTenant((await params).slug);
  if (!tenant) return {};
  return {
    title: "Clube de benefícios",
    description: `Planos do ${clubName(tenant)}: serviços inclusos, prioridade no agendamento e benefícios em parceiros.`,
  };
}

export default async function ClubePage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const tenant = await requireTenant(slug);
  const base = `/${tenant.slug}`;
  const club = clubName(tenant);

  const repo = getRepository(tenant.id);
  const [plans, partners, offers] = await Promise.all([
    repo.listPlans(),
    repo.listPartners(),
    repo.listOffers(),
  ]);

  const selected = plans.find((p) => p.id === sp.plano) ?? null;
  const subtitle =
    partners.length > 0
      ? `Serviços inclusos no plano, prioridade no agendamento e mais ${offers.length} benefício(s) em ${partners.length} parceiro(s).`
      : "Serviços inclusos no plano e prioridade no agendamento. Em breve, benefícios em restaurantes, academias e muito mais.";

  return (
    <div className="space-y-14">
      <div>
        <PageTitle eyebrow={club} title={`Faça parte do ${club}`} subtitle={subtitle} />

        {sp.assinado ? (
          <div className="mb-6">
            <Alert tone="success">
              Assinatura registrada! A equipe da {tenant.name} já encontra você pelo celular
              na hora de agendar.
            </Alert>
          </div>
        ) : null}
        {sp.erro ? (
          <div className="mb-6">
            <Alert tone="error">{sp.erro}</Alert>
          </div>
        ) : null}

        {plans.length === 0 ? (
          <EmptyState>Esta barbearia ainda não publicou os planos do clube.</EmptyState>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Card
                  className={`flex h-full flex-col ${
                    plan.highlight ? "border-gold/50 bg-gold/[0.06]" : ""
                  }`}
                >
                  {/* O selo fica acima do nome: ao lado, ele espremia o título
                      e quebrava "Plano Completo" em duas linhas. */}
                  {plan.highlight ? (
                    <div className="mb-2">
                      <Badge>Mais escolhido</Badge>
                    </div>
                  ) : null}
                  <h2 className="text-lg font-bold">{plan.name}</h2>

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
                    href={`${base}/clube?plano=${plan.id}#assinar`}
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
        )}
      </div>

      {plans.length > 0 ? (
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
              <input type="hidden" name="slug" value={tenant.slug} />
              <input type="hidden" name="planId" value={selected.id} />

              <Field label="Seu nome">
                <input
                  name="name"
                  required
                  className={inputClass}
                  placeholder="Nome e sobrenome"
                />
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
      ) : null}

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Onde sua carteirinha vale</h2>
          {partners.length > 0 ? (
            <Link
              href={`${base}/clube/parceiros`}
              className="text-sm font-semibold text-gold hover:underline"
            >
              Ver benefícios →
            </Link>
          ) : null}
        </div>

        {partners.length === 0 ? (
          <div className="mt-6">
            <EmptyState>Em breve: benefícios em restaurantes, academias e muito mais.</EmptyState>
          </div>
        ) : (
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
        )}
      </section>
    </div>
  );
}
