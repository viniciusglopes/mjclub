import { generateMemberCode, generateRedemptionCode, REDEMPTION_TTL_MS } from "../codes";
import { onlyDigits } from "../format";
import type {
  Appointment,
  AppointmentStatus,
  Membership,
  Offer,
  Partner,
  Plan,
  Profile,
  Redemption,
  Service,
  Staff,
  Tenant,
  WorkSchedule,
} from "../types";
import type { NewAppointment, Repository, ValidationResult } from "./repository";
import * as seed from "./seed";

type Store = {
  appointments: Appointment[];
  memberships: Membership[];
  profiles: Profile[];
  redemptions: Redemption[];
};

/**
 * O estado vive no processo. Em dev o Next recarrega os módulos a cada
 * alteração, então o guardamos em `globalThis` para não perder o que foi
 * criado durante a demonstração.
 */
const globalStore = globalThis as unknown as { __mjclubStore?: Store };

function store(): Store {
  globalStore.__mjclubStore ??= {
    appointments: [...seed.appointments],
    memberships: [...seed.memberships],
    profiles: [...seed.profiles],
    redemptions: [...seed.redemptions],
  };
  return globalStore.__mjclubStore;
}

function uid(): string {
  return globalThis.crypto.randomUUID();
}

const ACTIVE: AppointmentStatus[] = ["pending", "confirmed"];

/**
 * Datas viram número antes de qualquer comparação. Comparar ISO como texto só
 * funciona quando todos usam o mesmo offset — e um `Z` no meio de horários
 * `-03:00` faria horário livre parecer ocupado.
 */
const ms = (iso: string) => new Date(iso).getTime();

export class DemoRepository implements Repository {
  async getTenant(): Promise<Tenant> {
    return seed.tenant;
  }

  async listServices(): Promise<Service[]> {
    return seed.services.filter((s) => s.active);
  }

  async listStaff(): Promise<Staff[]> {
    return seed.staff.filter((s) => s.active);
  }

  async listSchedules(staffId: string): Promise<WorkSchedule[]> {
    return seed.workSchedules.filter((w) => w.staffId === staffId);
  }

  async listBusy(staffId: string, dateISO: string): Promise<Appointment[]> {
    const dayStart = ms(`${dateISO}T00:00:00-03:00`);
    const dayEnd = dayStart + 86_400_000;

    return store().appointments.filter(
      (a) =>
        a.staffId === staffId &&
        ACTIVE.includes(a.status) &&
        ms(a.startsAt) >= dayStart &&
        ms(a.startsAt) < dayEnd,
    );
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    return store().appointments.find((a) => a.id === id) ?? null;
  }

  async listAppointments(range: {
    fromISO: string;
    toISO: string;
  }): Promise<Appointment[]> {
    const from = ms(range.fromISO);
    const to = ms(range.toISO);

    return store()
      .appointments.filter((a) => ms(a.startsAt) >= from && ms(a.startsAt) < to)
      .sort((a, b) => ms(a.startsAt) - ms(b.startsAt));
  }

  async listAppointmentsByPhone(phone: string): Promise<Appointment[]> {
    const digits = onlyDigits(phone);
    return store()
      .appointments.filter((a) => onlyDigits(a.customerPhone) === digits)
      .sort((a, b) => ms(b.startsAt) - ms(a.startsAt));
  }

  async createAppointment(input: NewAppointment): Promise<Appointment> {
    const overlaps = store().appointments.some(
      (a) =>
        a.staffId === input.staffId &&
        ACTIVE.includes(a.status) &&
        ms(input.startsAt) < ms(a.endsAt) &&
        ms(input.endsAt) > ms(a.startsAt),
    );
    if (overlaps) {
      throw new Error("Esse horário acabou de ser ocupado. Escolha outro.");
    }

    // Os campos do servidor vêm depois do spread: id, tenant e status são
    // nossos, nunca do que o chamador mandou.
    const appointment: Appointment = {
      ...input,
      id: uid(),
      tenantId: seed.TENANT_ID,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    store().appointments.push(appointment);
    return appointment;
  }

  async setAppointmentStatus(id: string, status: AppointmentStatus) {
    const found = store().appointments.find((a) => a.id === id);
    if (found) found.status = status;
  }

  async listPlans(): Promise<Plan[]> {
    return seed.plans.filter((p) => p.active);
  }

  async getPlan(id: string): Promise<Plan | null> {
    return seed.plans.find((p) => p.id === id) ?? null;
  }

  async listMemberships(): Promise<Membership[]> {
    return store().memberships;
  }

  async getActiveMembership(profileId: string): Promise<Membership | null> {
    return (
      store().memberships.find(
        (m) => m.profileId === profileId && m.status === "active",
      ) ?? null
    );
  }

  async getMembershipByCode(code: string): Promise<Membership | null> {
    const normalized = code.trim().toUpperCase();
    return (
      store().memberships.find((m) => m.memberCode === normalized) ?? null
    );
  }

  async subscribe(input: { fullName: string; phone: string; planId: string }) {
    const phone = onlyDigits(input.phone);
    let profile = store().profiles.find((p) => onlyDigits(p.phone ?? "") === phone);

    if (!profile) {
      profile = { id: uid(), fullName: input.fullName, phone, email: null };
      store().profiles.push(profile);
    }

    const existing = await this.getActiveMembership(profile.id);
    if (existing) {
      // Trocar de plano mantém a mesma carteirinha.
      existing.planId = input.planId;
      return { profile, membership: existing };
    }

    const membership: Membership = {
      id: uid(),
      tenantId: seed.TENANT_ID,
      planId: input.planId,
      profileId: profile.id,
      memberCode: generateMemberCode(),
      status: "active",
      startedAt: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    };
    store().memberships.push(membership);
    return { profile, membership };
  }

  async getProfile(id: string): Promise<Profile | null> {
    return store().profiles.find((p) => p.id === id) ?? null;
  }

  async getProfileByPhone(phone: string): Promise<Profile | null> {
    const digits = onlyDigits(phone);
    return (
      store().profiles.find((p) => onlyDigits(p.phone ?? "") === digits) ?? null
    );
  }

  async listPartners(): Promise<Partner[]> {
    return seed.partners.filter((p) => p.active);
  }

  async getPartner(id: string): Promise<Partner | null> {
    return seed.partners.find((p) => p.id === id) ?? null;
  }

  async getPartnerBySlug(slug: string): Promise<Partner | null> {
    return seed.partners.find((p) => p.slug === slug) ?? null;
  }

  async listOffers(partnerId?: string): Promise<Offer[]> {
    return seed.offers.filter(
      (o) => o.active && (!partnerId || o.partnerId === partnerId),
    );
  }

  async getOffer(id: string): Promise<Offer | null> {
    return seed.offers.find((o) => o.id === id) ?? null;
  }

  async listRedemptions(filter: { membershipId?: string; partnerId?: string }) {
    const offerIds = filter.partnerId
      ? new Set(
          seed.offers.filter((o) => o.partnerId === filter.partnerId).map((o) => o.id),
        )
      : null;

    return store()
      .redemptions.filter(
        (r) =>
          (!filter.membershipId || r.membershipId === filter.membershipId) &&
          (!offerIds || offerIds.has(r.offerId)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createRedemption(offerId: string, membershipId: string): Promise<Redemption> {
    const offer = await this.getOffer(offerId);
    if (!offer) throw new Error("Oferta não encontrada.");

    const used = store().redemptions.filter(
      (r) =>
        r.offerId === offerId &&
        r.membershipId === membershipId &&
        r.status !== "expired" &&
        r.status !== "canceled",
    );
    if (used.length >= offer.maxRedemptionsPerMember) {
      throw new Error("Você já usou este benefício o número máximo de vezes.");
    }

    const redemption: Redemption = {
      id: uid(),
      tenantId: seed.TENANT_ID,
      offerId,
      membershipId,
      code: generateRedemptionCode(),
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + REDEMPTION_TTL_MS).toISOString(),
      validatedAt: null,
    };
    store().redemptions.push(redemption);
    return redemption;
  }

  async validateRedemption(code: string, partnerId: string): Promise<ValidationResult> {
    const normalized = code.trim().toUpperCase();
    const redemption = store().redemptions.find((r) => r.code === normalized);
    if (!redemption) return { ok: false, reason: "Código não encontrado." };

    const offer = await this.getOffer(redemption.offerId);
    if (!offer || offer.partnerId !== partnerId) {
      return { ok: false, reason: "Este código é de outro parceiro." };
    }
    if (redemption.status === "validated") {
      return { ok: false, reason: "Este código já foi usado." };
    }
    if (new Date(redemption.expiresAt).getTime() < Date.now()) {
      redemption.status = "expired";
      return { ok: false, reason: "Este código expirou." };
    }

    redemption.status = "validated";
    redemption.validatedAt = new Date().toISOString();

    const membership = store().memberships.find((m) => m.id === redemption.membershipId);
    const profile = membership
      ? store().profiles.find((p) => p.id === membership.profileId)
      : null;

    return {
      ok: true,
      redemption,
      offer,
      memberName: profile?.fullName ?? "Membro MJCLUB",
    };
  }
}
