import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageTitle,
} from "@/components/ui";
import { getRepository, legacyTenantId } from "@/lib/db";
import { formatBRL, formatDateTime, formatPhone } from "@/lib/format";
import { getSession } from "@/lib/session";
import { clubName } from "@/lib/tenant";
import type { RedemptionStatus } from "@/lib/types";

import { redeemOffer, signOut } from "./actions";

export const metadata: Metadata = { title: "Minha conta" };

const STATUS_LABEL: Record<RedemptionStatus, { text: string; tone: "gold" | "green" | "muted" }> =
  {
    pending: { text: "Pronto para usar", tone: "gold" },
    validated: { text: "Usado", tone: "green" },
    expired: { text: "Expirado", tone: "muted" },
    canceled: { text: "Cancelado", tone: "muted" },
  };

export default async function MinhaContaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; resgate?: string; bemvindo?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (session?.kind !== "member") redirect("/entrar");

  const repo = getRepository(legacyTenantId());
  const [tenant, profile] = await Promise.all([
    repo.getTenant(),
    repo.getProfile(session.profileId),
  ]);
  if (!profile) redirect("/entrar");

  const membership = await repo.getActiveMembership(profile.id);
  const [plan, partners, offers, appointments, services, staff] = await Promise.all([
    membership ? repo.getPlan(membership.planId) : null,
    repo.listPartners(),
    repo.listOffers(),
    repo.listAppointmentsByPhone(profile.phone ?? ""),
    repo.listServices(),
    repo.listStaff(),
  ]);
  const redemptions = membership
    ? await repo.listRedemptions({ membershipId: membership.id })
    : [];

  const upcoming = appointments.filter(
    (a) => new Date(a.startsAt) >= new Date() && a.status !== "canceled",
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle title={`Olá, ${profile.fullName.split(" ")[0]}`} />
        <form action={signOut}>
          <Button variant="ghost" type="submit">
            Sair
          </Button>
        </form>
      </div>

      {sp.bemvindo ? (
        <Alert tone="success">
          Bem-vindo ao clube! Sua carteirinha já está ativa — é só mostrar o código.
        </Alert>
      ) : null}
      {sp.resgate ? (
        <Alert tone="success">Código gerado. Mostre no balcão do parceiro.</Alert>
      ) : null}
      {sp.erro ? <Alert tone="error">{sp.erro}</Alert> : null}

      {/* ------------------------------------------------ carteirinha */}
      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Sua carteirinha</h2>

        {membership && plan ? (
          <div className="max-w-md rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 via-surface to-surface p-6">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
                {clubName(tenant)}
                <span className="ml-2 font-medium tracking-normal text-muted">
                  membro oficial
                </span>
              </span>
              <Badge>{plan.name}</Badge>
            </div>

            <p className="mt-8 font-mono text-2xl font-bold tracking-[0.2em]">
              {membership.memberCode}
            </p>

            <div className="mt-6 flex items-end justify-between gap-4 text-sm">
              <div>
                <p className="font-semibold">{profile.fullName}</p>
                <p className="text-muted">{formatPhone(profile.phone ?? "")}</p>
              </div>
              <p className="text-right text-muted">
                {membership.currentPeriodEnd
                  ? `Válida até ${formatDateTime(membership.currentPeriodEnd).split(" às")[0]}`
                  : null}
              </p>
            </div>
          </div>
        ) : (
          <Card>
            <p className="text-sm text-muted">
              Você ainda não tem um plano ativo. Assine para desbloquear os descontos.
            </p>
            <div className="mt-4">
              <ButtonLink href={`/${tenant.slug}/clube`}>Ver planos</ButtonLink>
            </div>
          </Card>
        )}
      </section>

      {/* ------------------------------------------------ agendamentos */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight">Seus agendamentos</h2>
          <Link href={`/${tenant.slug}/agendar`} className="text-sm font-semibold text-gold hover:underline">
            Novo agendamento →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState>Nenhum horário marcado. Que tal agendar o próximo corte?</EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {upcoming.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 px-5 py-4">
                <div>
                  <p className="font-semibold">
                    {services.find((s) => s.id === a.serviceId)?.name}
                  </p>
                  <p className="text-sm text-muted">
                    com {staff.find((s) => s.id === a.staffId)?.name} ·{" "}
                    {formatDateTime(a.startsAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatBRL(a.priceCents)}</p>
                  {a.discountCents > 0 ? (
                    <p className="text-xs text-gold">
                      −{formatBRL(a.discountCents)} pelo clube
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------------- benefícios */}
      {membership ? (
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">Benefícios disponíveis</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {offers.map((offer) => {
              const partner = partners.find((p) => p.id === offer.partnerId);
              const used = redemptions.filter(
                (r) => r.offerId === offer.id && r.status !== "expired",
              ).length;
              const left = offer.maxRedemptionsPerMember - used;

              return (
                <li key={offer.id}>
                  <Card className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                        {partner?.name}
                      </span>
                      <Badge>{offer.discountLabel}</Badge>
                    </div>
                    <p className="mt-2 font-semibold">{offer.title}</p>
                    <p className="mt-1 flex-1 text-sm text-muted">{offer.description}</p>

                    <form action={redeemOffer} className="mt-4">
                      <input type="hidden" name="offerId" value={offer.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={left <= 0}
                        className="w-full"
                      >
                        {left > 0 ? "Gerar código de resgate" : "Limite atingido"}
                      </Button>
                    </form>
                    <p className="mt-2 text-center text-xs text-muted">
                      {left > 0 ? `${left} uso(s) restante(s)` : "Volte no próximo ciclo"}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------------ resgates */}
      {redemptions.length > 0 ? (
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">Seus códigos</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {redemptions.map((r) => {
              const offer = offers.find((o) => o.id === r.offerId);
              const partner = partners.find((p) => p.id === offer?.partnerId);
              const status = STATUS_LABEL[r.status];

              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-mono text-lg font-bold tracking-[0.2em] text-gold">
                      {r.code}
                    </p>
                    <p className="text-sm text-muted">
                      {partner?.name} · {offer?.title}
                    </p>
                  </div>
                  <Badge tone={status.tone}>{status.text}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
