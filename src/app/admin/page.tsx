import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { signOut } from "@/app/minha-conta/actions";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageTitle,
} from "@/components/ui";
import { nextDates, todayInSP } from "@/lib/availability";
import { getRepository } from "@/lib/db";
import { formatBRL, formatDateLabel, formatPhone, formatTime } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { AppointmentStatus } from "@/lib/types";

import { setAppointmentStatus } from "./actions";

export const metadata: Metadata = { title: "Painel da barbearia" };

const STATUS: Record<AppointmentStatus, { label: string; tone: "gold" | "green" | "muted" | "red" }> =
  {
    pending: { label: "Aguardando", tone: "muted" },
    confirmed: { label: "Confirmado", tone: "gold" },
    completed: { label: "Atendido", tone: "green" },
    canceled: { label: "Cancelado", tone: "red" },
    no_show: { label: "Não veio", tone: "red" },
  };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const session = await getSession();
  if (session?.kind !== "staff") redirect("/entrar");

  const sp = await searchParams;
  const dateISO = sp.data ?? todayInSP();

  const repo = getRepository();
  const [tenant, services, staff, memberships, plans] = await Promise.all([
    repo.getTenant(),
    repo.listServices(),
    repo.listStaff(),
    repo.listMemberships(),
    repo.listPlans(),
  ]);

  const appointments = await repo.listAppointments({
    fromISO: `${dateISO}T00:00:00-03:00`,
    toISO: `${dateISO}T23:59:59-03:00`,
  });

  const active = appointments.filter((a) => a.status !== "canceled");
  const revenue = active.reduce((sum, a) => sum + a.priceCents, 0);
  const activeMembers = memberships.filter((m) => m.status === "active");
  const mrr = activeMembers.reduce(
    (sum, m) => sum + (plans.find((p) => p.id === m.planId)?.priceCents ?? 0),
    0,
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle eyebrow={tenant.name} title="Painel da barbearia" />
        <form action={signOut}>
          <Button variant="ghost" type="submit">
            Sair
          </Button>
        </form>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Atendimentos no dia" value={String(active.length)} />
        <Stat label="Previsão de caixa" value={formatBRL(revenue)} />
        <Stat
          label="Clube · receita recorrente"
          value={formatBRL(mrr)}
          hint={`${activeMembers.length} membro(s) ativo(s)`}
        />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Agenda</h2>

        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {nextDates(10).map((d) => (
            <Link
              key={d}
              href={`/admin?data=${d}`}
              className={`shrink-0 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                d === dateISO
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-line text-muted hover:border-gold/50 hover:text-cream"
              }`}
            >
              {formatDateLabel(d)}
            </Link>
          ))}
        </div>

        {appointments.length === 0 ? (
          <EmptyState>Nenhum agendamento em {formatDateLabel(dateISO)}.</EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {appointments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                <span className="w-14 font-mono text-lg font-bold text-gold">
                  {formatTime(a.startsAt)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {a.customerName}
                    {a.membershipId ? (
                      <span className="ml-2 align-middle">
                        <Badge>Membro</Badge>
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">
                    {services.find((s) => s.id === a.serviceId)?.name} ·{" "}
                    {staff.find((s) => s.id === a.staffId)?.nickname} ·{" "}
                    {formatPhone(a.customerPhone)}
                  </p>
                  {a.notes ? <p className="mt-1 text-xs text-muted/70">{a.notes}</p> : null}
                </div>

                <div className="text-right">
                  <p className="font-semibold">{formatBRL(a.priceCents)}</p>
                  <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
                </div>

                {a.status === "confirmed" || a.status === "pending" ? (
                  <div className="flex gap-2">
                    <StatusButton id={a.id} status="completed" label="Atendido" />
                    <StatusButton id={a.id} status="no_show" label="Não veio" />
                    <StatusButton id={a.id} status="canceled" label="Cancelar" />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Tabela de serviços</h2>
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {services.map((s) => (
            <li key={s.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
              <span>
                {s.name} <span className="text-muted">· {s.durationMin} min</span>
              </span>
              <span className="font-semibold">{formatBRL(s.priceCents)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Membros do clube</h2>
        {activeMembers.length === 0 ? (
          <EmptyState>Nenhum membro ativo ainda.</EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {activeMembers.map((m) => (
              <li key={m.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                <span className="font-mono text-gold">{m.memberCode}</span>
                <span className="text-muted">
                  {plans.find((p) => p.id === m.planId)?.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

function StatusButton({
  id,
  status,
  label,
}: {
  id: string;
  status: AppointmentStatus;
  label: string;
}) {
  return (
    <form action={setAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-gold hover:text-gold"
      >
        {label}
      </button>
    </form>
  );
}
