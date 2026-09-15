import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { signOut } from "@/app/(legado)/minha-conta/actions";
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
import { getRepository, legacyTenantId } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getSession } from "@/lib/session";

import { validateCode } from "./actions";

export const metadata: Metadata = { title: "Painel do parceiro" };

export default async function ParceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const session = await getSession();
  if (session?.kind !== "partner") redirect("/entrar");

  const sp = await searchParams;
  const repo = getRepository(legacyTenantId());
  const partner = await repo.getPartner(session.partnerId);
  if (!partner) redirect("/entrar");

  const [offers, redemptions] = await Promise.all([
    repo.listOffers(partner.id),
    repo.listRedemptions({ partnerId: partner.id }),
  ]);

  const validated = redemptions.filter((r) => r.status === "validated");

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle eyebrow={partner.category} title={partner.name} />
        <form action={signOut}>
          <Button variant="ghost" type="submit">
            Sair
          </Button>
        </form>
      </div>

      <section>
        <Card className="max-w-lg">
          <h2 className="font-bold">Validar benefício</h2>
          <p className="mt-1 text-sm text-muted">
            Peça o código na tela do cliente e digite aqui.
          </p>

          {sp.ok ? (
            <div className="mt-4">
              <Alert tone="success">{sp.ok}</Alert>
            </div>
          ) : null}
          {sp.erro ? (
            <div className="mt-4">
              <Alert tone="error">{sp.erro}</Alert>
            </div>
          ) : null}

          <form action={validateCode} className="mt-4 space-y-4">
            <Field label="Código do resgate">
              <input
                name="code"
                required
                autoComplete="off"
                className={`${inputClass} text-center font-mono text-2xl tracking-[0.3em] uppercase`}
                placeholder="K7P2QX"
                maxLength={6}
              />
            </Field>
            <Button type="submit" className="w-full">
              Validar
            </Button>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Seus benefícios ativos</h2>
        {offers.length === 0 ? (
          <EmptyState>Você ainda não cadastrou benefícios.</EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {offers.map((offer) => (
              <li key={offer.id}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{offer.title}</p>
                    <Badge>{offer.discountLabel}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">{offer.description}</p>
                  {offer.rules ? (
                    <p className="mt-2 text-xs text-muted/70">{offer.rules}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-muted">
                    Limite de {offer.maxRedemptionsPerMember} uso(s) por membro
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">
          Resgates validados ({validated.length})
        </h2>
        {validated.length === 0 ? (
          <EmptyState>Nenhum resgate validado ainda.</EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {validated.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-mono font-bold text-gold">{r.code}</p>
                  <p className="text-sm text-muted">
                    {offers.find((o) => o.id === r.offerId)?.title}
                  </p>
                </div>
                <p className="text-sm text-muted">
                  {r.validatedAt ? formatDateTime(r.validatedAt) : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
