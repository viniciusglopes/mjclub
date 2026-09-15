import Link from "next/link";
import type { Metadata } from "next";

import { Alert, Badge, Button, Card, Field, PageTitle, inputClass } from "@/components/ui";
import { getAvailability } from "@/lib/booking";
import { nextDates, todayInSP } from "@/lib/availability";
import { getRepository } from "@/lib/db";
import { formatBRL, formatDateLabel, formatDateTime } from "@/lib/format";
import { priceFor } from "@/lib/pricing";
import { requireTenant } from "@/lib/tenant";

import { bookAppointment } from "./actions";

export const metadata: Metadata = { title: "Agendar" };

type Search = {
  servico?: string;
  profissional?: string;
  data?: string;
  horario?: string;
  erro?: string;
};

function href(path: string, base: Search, patch: Search) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) {
    if (v && k !== "erro") params.set(k, v);
  }
  return `${path}?${params.toString()}`;
}

function Steps({ current }: { current: number }) {
  const labels = ["Serviço", "Profissional", "Horário", "Seus dados"];
  return (
    <ol className="mb-8 flex flex-wrap gap-x-2 gap-y-1 text-sm">
      {labels.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span className={i <= current ? "font-semibold text-gold" : "text-muted"}>
            {i + 1}. {label}
          </span>
          {i < labels.length - 1 ? <span className="text-line">›</span> : null}
        </li>
      ))}
    </ol>
  );
}

export default async function AgendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const tenant = await requireTenant(slug);
  const path = `/${tenant.slug}/agendar`;

  const repo = getRepository(tenant.id);
  const [services, staff, plans] = await Promise.all([
    repo.listServices(),
    repo.listStaff(),
    repo.listPlans(),
  ]);

  const featured = plans.find((p) => p.highlight) ?? plans[0] ?? null;
  const service = services.find((s) => s.id === sp.servico) ?? null;
  const professional = staff.find((s) => s.id === sp.profissional) ?? null;
  const dateISO = sp.data ?? todayInSP();

  const step = sp.horario && service && professional ? 3 : professional ? 2 : service ? 1 : 0;

  return (
    <div>
      <PageTitle
        eyebrow={tenant.name}
        title="Agendar horário"
        subtitle="Escolha o serviço, o profissional e o horário. Leva menos de um minuto."
      />

      <Steps current={step} />

      {sp.erro ? (
        <div className="mb-6">
          <Alert tone="error">{sp.erro}</Alert>
        </div>
      ) : null}

      {/* ---------------------------------------------------- 1. serviço */}
      {step === 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => {
            const { fullCents, finalCents } = priceFor(s, featured);
            return (
              <li key={s.id}>
                <Link
                  href={href(path, sp, { servico: s.id })}
                  className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-gold"
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="mt-1 text-sm text-muted">{s.description}</span>
                  <span className="mt-4 flex items-baseline gap-2">
                    <span className="font-semibold">{formatBRL(fullCents)}</span>
                    <span className="text-sm text-muted">· {s.durationMin} min</span>
                  </span>
                  {finalCents < fullCents ? (
                    <span className="mt-2 text-sm text-gold">
                      {formatBRL(finalCents)} para membros
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* ----------------------------------------------- 2. profissional */}
      {step === 1 && service ? (
        <div>
          <Summary service={service.name} />
          <ul className="grid gap-3 sm:grid-cols-3">
            {staff
              .filter((p) => p.serviceIds.includes(service.id))
              .map((p) => (
                <li key={p.id}>
                  <Link
                    href={href(path, sp, { profissional: p.id })}
                    className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-gold"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-gold/15 text-lg font-bold text-gold">
                      {(p.nickname ?? p.name).charAt(0)}
                    </span>
                    <span className="mt-3 font-semibold">{p.name}</span>
                    <span className="mt-1 text-sm text-muted">{p.bio}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {/* ---------------------------------------------------- 3. horário */}
      {step === 2 && service && professional ? (
        <SlotPicker
          path={path}
          sp={sp}
          tenantId={tenant.id}
          dateISO={dateISO}
          serviceName={service.name}
          staffName={professional.name}
          staffId={professional.id}
          serviceId={service.id}
        />
      ) : null}

      {/* ------------------------------------------------------ 4. dados */}
      {step === 3 && service && professional && sp.horario ? (
        <div className="max-w-lg">
          <Summary
            service={service.name}
            staff={professional.name}
            when={formatDateTime(sp.horario)}
          />

          <form action={bookAppointment} className="space-y-4">
            <input type="hidden" name="slug" value={tenant.slug} />
            <input type="hidden" name="serviceId" value={service.id} />
            <input type="hidden" name="staffId" value={professional.id} />
            <input type="hidden" name="startsAt" value={sp.horario} />

            <Field label="Seu nome">
              <input name="name" required className={inputClass} placeholder="Nome e sobrenome" />
            </Field>

            <Field
              label="Celular com DDD"
              hint="Se você for do clube, o desconto entra automaticamente pelo telefone."
            >
              <input
                name="phone"
                required
                inputMode="tel"
                className={inputClass}
                placeholder="(11) 98888-0002"
              />
            </Field>

            <Field label="Observação (opcional)">
              <input
                name="notes"
                className={inputClass}
                placeholder="Ex.: máquina 2 nas laterais"
              />
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm">
              <span className="text-muted">Valor de tabela</span>
              <span className="font-semibold">{formatBRL(service.priceCents)}</span>
            </div>

            <Button type="submit" className="w-full">
              Confirmar agendamento
            </Button>
          </form>
        </div>
      ) : null}

      {step > 0 ? (
        <p className="mt-8 text-sm">
          <Link href={path} className="text-muted hover:text-gold">
            ← Recomeçar
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function Summary({
  service,
  staff,
  when,
}: {
  service: string;
  staff?: string;
  when?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Badge tone="muted">{service}</Badge>
      {staff ? <Badge tone="muted">{staff}</Badge> : null}
      {when ? <Badge>{when}</Badge> : null}
    </div>
  );
}

async function SlotPicker({
  path,
  sp,
  tenantId,
  dateISO,
  serviceId,
  staffId,
  serviceName,
  staffName,
}: {
  path: string;
  sp: Search;
  tenantId: string;
  dateISO: string;
  serviceId: string;
  staffId: string;
  serviceName: string;
  staffName: string;
}) {
  const dates = nextDates(14);
  const slots = await getAvailability({ tenantId, staffId, serviceId, dateISO });

  return (
    <div>
      <Summary service={serviceName} staff={staffName} />

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {dates.map((d) => (
          <Link
            key={d}
            href={href(path, sp, { data: d })}
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

      {slots.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            {staffName} não tem horário livre em {formatDateLabel(dateISO)}. Escolha outra
            data acima.
          </p>
        </Card>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {slots.map((slot) => (
            <li key={slot.startsAt}>
              <Link
                href={href(path, sp, { horario: slot.startsAt })}
                className="block rounded-lg border border-line bg-surface py-2.5 text-center text-sm font-semibold transition-colors hover:border-gold hover:text-gold"
              >
                {slot.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
