import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { getRepository } from "@/lib/db";
import { formatBRL, formatDateTime, formatPhone } from "@/lib/format";
import { clubName, requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Agendamento confirmado" };

export default async function ConfirmadoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const tenant = await requireTenant(slug);
  const base = `/${tenant.slug}`;
  const repo = getRepository(tenant.id);

  // `getAppointment` filtra pelo tenant: o comprovante de uma barbearia não
  // abre no endereço de outra.
  const [services, staff, appointment] = await Promise.all([
    repo.listServices(),
    repo.listStaff(),
    repo.getAppointment(id),
  ]);

  if (!appointment) notFound();

  const service = services.find((s) => s.id === appointment.serviceId);
  const professional = staff.find((s) => s.id === appointment.staffId);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-2xl">
          ✓
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Horário confirmado</h1>
        <p className="mt-2 text-muted">
          Te esperamos na {tenant.name}. Chegue com 5 minutos de folga.
        </p>
      </div>

      <Card className="space-y-4">
        <Row label="Quando" value={formatDateTime(appointment.startsAt)} strong />
        <Row label="Serviço" value={service?.name ?? "—"} />
        <Row label="Profissional" value={professional?.name ?? "—"} />
        <Row label="Cliente" value={appointment.customerName} />
        <Row label="Telefone" value={formatPhone(appointment.customerPhone)} />
        {appointment.notes ? <Row label="Observação" value={appointment.notes} /> : null}
        {tenant.address ? <Row label="Endereço" value={tenant.address} /> : null}

        <div className="border-t border-line pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Valor</span>
            <span className="text-lg font-bold">{formatBRL(appointment.priceCents)}</span>
          </div>
          {appointment.discountCents > 0 ? (
            <div className="mt-2 flex justify-end">
              <Badge>
                {clubName(tenant)} · economia de {formatBRL(appointment.discountCents)}
              </Badge>
            </div>
          ) : null}
        </div>
      </Card>

      {appointment.discountCents === 0 ? (
        <div className="mt-6">
          <Alert tone="info">
            Ainda não é do clube? Membros têm serviços inclusos, prioridade na agenda e
            benefícios em parceiros.{" "}
            <Link href={`${base}/clube`} className="font-semibold text-gold hover:underline">
              Ver planos
            </Link>
          </Alert>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={`${base}/agendar`} variant="outline">
          Agendar outro
        </ButtonLink>
        <ButtonLink href={base} variant="ghost">
          Voltar ao início
        </ButtonLink>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {tenant.whatsapp
          ? `Precisa remarcar? Fale com a barbearia pelo WhatsApp ${formatPhone(tenant.whatsapp)}.`
          : "Precisa remarcar? Fale com a barbearia."}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className={strong ? "text-right font-semibold" : "text-right text-sm"}>
        {value}
      </span>
    </div>
  );
}
