"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { endOf, priceForPhone } from "@/lib/booking";
import { findTenantBySlug, getPlatform, getRepository } from "@/lib/db";
import { onlyDigits } from "@/lib/format";

const schema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  startsAt: z.string().min(1),
  name: z.string().trim().min(2, "Informe seu nome completo."),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 10 && v.length <= 11, "Informe um celular válido com DDD."),
  notes: z.string().trim().max(280).optional(),
});

/** Confirma o agendamento e leva para a tela de comprovante. */
export async function bookAppointment(formData: FormData) {
  // A barbearia sai do slug, resolvido de novo aqui: o formulário só diz em
  // qual endereço a pessoa estava, nunca qual tenantId gravar.
  const tenant = await findTenantBySlug(getPlatform(), String(formData.get("slug") ?? ""));
  if (!tenant) redirect("/");

  const base = `/${tenant.slug}/agendar`;
  const params = new URLSearchParams({
    servico: String(formData.get("serviceId") ?? ""),
    profissional: String(formData.get("staffId") ?? ""),
    horario: String(formData.get("startsAt") ?? ""),
  });
  const back = (message: string): never => {
    params.set("erro", message);
    redirect(`${base}?${params.toString()}`);
  };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(parsed.error.issues[0].message);

  const input = parsed.data;
  const repo = getRepository(tenant.id);
  const [services, staff] = await Promise.all([repo.listServices(), repo.listStaff()]);

  const service = services.find((s) => s.id === input.serviceId);
  if (!service) return back("Serviço indisponível.");

  // Profissional precisa ser DESTA barbearia e fazer este serviço.
  const professional = staff.find(
    (s) => s.id === input.staffId && s.serviceIds.includes(service.id),
  );
  if (!professional) return back("Esse profissional não está disponível para o serviço.");

  // O preço é recalculado aqui, no servidor: o que veio do formulário é
  // apenas escolha do cliente, nunca valor.
  const { breakdown, membershipId } = await priceForPhone(tenant.id, service, input.phone);

  let appointmentId: string;
  try {
    const appointment = await repo.createAppointment({
      staffId: professional.id,
      serviceId: service.id,
      customerName: input.name,
      customerPhone: input.phone,
      customerProfileId: null,
      startsAt: input.startsAt,
      endsAt: endOf(input.startsAt, service.durationMin),
      priceCents: breakdown.finalCents,
      discountCents: breakdown.discountCents,
      membershipId,
      notes: input.notes || null,
    });
    appointmentId = appointment.id;
  } catch (error) {
    return back(error instanceof Error ? error.message : "Não foi possível agendar.");
  }

  redirect(`${base}/confirmado/${appointmentId}`);
}
