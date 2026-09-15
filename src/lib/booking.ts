import "server-only";

import { buildSlots, toSpIso } from "./availability";
import { getRepository } from "./db";
import { priceFor, type PriceBreakdown } from "./pricing";
import type { Plan, Service, Slot } from "./types";

/** Horários livres de um profissional para um serviço em uma data. */
export async function getAvailability(params: {
  tenantId: string;
  staffId: string;
  serviceId: string;
  dateISO: string;
}): Promise<Slot[]> {
  const repo = getRepository(params.tenantId);
  const services = await repo.listServices();
  const service = services.find((s) => s.id === params.serviceId);
  if (!service) return [];

  const [schedules, busy] = await Promise.all([
    repo.listSchedules(params.staffId),
    repo.listBusy(params.staffId, params.dateISO),
  ]);

  return buildSlots({
    dateISO: params.dateISO,
    durationMin: service.durationMin,
    schedules,
    busy,
  });
}

/** Preço de um serviço para o telefone informado, já considerando o clube. */
export async function priceForPhone(
  tenantId: string,
  service: Service,
  phone: string | null,
): Promise<{ breakdown: PriceBreakdown; plan: Plan | null; membershipId: string | null }> {
  const repo = getRepository(tenantId);

  if (!phone) {
    return { breakdown: priceFor(service, null), plan: null, membershipId: null };
  }

  const profile = await repo.getProfileByPhone(phone);
  const membership = profile ? await repo.getActiveMembership(profile.id) : null;
  const plan = membership ? await repo.getPlan(membership.planId) : null;

  return {
    breakdown: priceFor(service, plan),
    plan,
    membershipId: membership?.id ?? null,
  };
}

/** Fim do atendimento = início + duração do serviço. */
export function endOf(startsAt: string, durationMin: number): string {
  return toSpIso(new Date(new Date(startsAt).getTime() + durationMin * 60_000));
}
