import {
  generateMemberCode,
  generateRedemptionCode,
  memberCodePrefix,
  REDEMPTION_TTL_MS,
} from "../codes";
import { onlyDigits } from "../format";
import type {
  Appointment,
  AppointmentStatus,
  Membership,
  NewLead,
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
import type { PlatformRepository } from "./platform";
import type { NewAppointment, Repository, ValidationResult } from "./repository";
import * as seed from "./seed";

type StoredLead = NewLead & { id: string; createdAt: string };

type Store = {
  leads: StoredLead[];
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
    leads: [],
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

/**
 * Driver em memória de UMA barbearia. Todo dado é filtrado pelo tenantId
 * recebido, como o driver Postgres faz com `.eq("tenant_id")`.
 */
export class DemoRepository implements Repository {
  constructor(private tenantId: string) {}

  private mine<T extends { tenantId: string }>(rows: T[]): T[] {
    return rows.filter((r) => r.tenantId === this.tenantId);
  }

  async getTenant(): Promise<Tenant> {
    const found = seed.tenants.find((t) => t.id === this.tenantId);
    if (!found) throw new Error("Barbearia não encontrada.");
    return found;
  }

  async listServices(): Promise<Service[]> {
    return this.mine(seed.services).filter((s) => s.active);
  }

  async listStaff(): Promise<Staff[]> {
    return this.mine(seed.staff).filter((s) => s.active);
  }

  async listSchedules(staffId: string): Promise<WorkSchedule[]> {
    const staffIds = new Set(this.mine(seed.staff).map((s) => s.id));
    return seed.workSchedules.filter((w) => w.staffId === staffId && staffIds.has(staffId));
  }

  async listBusy(staffId: string, dateISO: string): Promise<Appointment[]> {
    const dayStart = ms(`${dateISO}T00:00:00-03:00`);
    const dayEnd = dayStart + 86_400_000;

    return this.mine(store().appointments).filter(
      (a) =>
        a.staffId === staffId &&
        ACTIVE.includes(a.status) &&
        ms(a.startsAt) >= dayStart &&
        ms(a.startsAt) < dayEnd,
    );
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    return this.mine(store().appointments).find((a) => a.id === id) ?? null;
  }

  async listAppointments(range: {
    fromISO: string;
    toISO: string;
  }): Promise<Appointment[]> {
    const from = ms(range.fromISO);
    const to = ms(range.toISO);

    return this.mine(store().appointments)
      .filter((a) => ms(a.startsAt) >= from && ms(a.startsAt) < to)
      .sort((a, b) => ms(a.startsAt) - ms(b.startsAt));
  }

  async listAppointmentsByPhone(phone: string): Promise<Appointment[]> {
    const digits = onlyDigits(phone);
    return this.mine(store().appointments)
      .filter((a) => onlyDigits(a.customerPhone) === digits)
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
      tenantId: this.tenantId,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    store().appointments.push(appointment);
    return appointment;
  }

  async setAppointmentStatus(id: string, status: AppointmentStatus) {
    const found = this.mine(store().appointments).find((a) => a.id === id);
    if (found) found.status = status;
  }

  async listPlans(): Promise<Plan[]> {
    return this.mine(seed.plans).filter((p) => p.active);
  }

  async getPlan(id: string): Promise<Plan | null> {
    return this.mine(seed.plans).find((p) => p.id === id) ?? null;
  }

  async listMemberships(): Promise<Membership[]> {
    return this.mine(store().memberships);
  }

  async getActiveMembership(profileId: string): Promise<Membership | null> {
    return (
      this.mine(store().memberships).find(
        (m) => m.profileId === profileId && m.status === "active",
      ) ?? null
    );
  }

  async getMembershipByCode(code: string): Promise<Membership | null> {
    const normalized = code.trim().toUpperCase();
    return (
      this.mine(store().memberships).find((m) => m.memberCode === normalized) ?? null
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
      tenantId: this.tenantId,
      planId: input.planId,
      profileId: profile.id,
      memberCode: generateMemberCode(memberCodePrefix((await this.getTenant()).name)),
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
    return this.mine(seed.partners).filter((p) => p.active);
  }

  async getPartner(id: string): Promise<Partner | null> {
    return this.mine(seed.partners).find((p) => p.id === id) ?? null;
  }

  async getPartnerBySlug(slug: string): Promise<Partner | null> {
    return this.mine(seed.partners).find((p) => p.slug === slug) ?? null;
  }

  async listOffers(partnerId?: string): Promise<Offer[]> {
    return this.mine(seed.offers).filter(
      (o) => o.active && (!partnerId || o.partnerId === partnerId),
    );
  }

  async getOffer(id: string): Promise<Offer | null> {
    return this.mine(seed.offers).find((o) => o.id === id) ?? null;
  }

  async listRedemptions(filter: { membershipId?: string; partnerId?: string }) {
    const offerIds = filter.partnerId
      ? new Set(
          seed.offers.filter((o) => o.partnerId === filter.partnerId).map((o) => o.id),
        )
      : null;

    return this.mine(store().redemptions)
      .filter(
        (r) =>
          (!filter.membershipId || r.membershipId === filter.membershipId) &&
          (!offerIds || offerIds.has(r.offerId)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createRedemption(offerId: string, membershipId: string): Promise<Redemption> {
    const offer = await this.getOffer(offerId);
    if (!offer) throw new Error("Oferta não encontrada.");
    // Oferta desativada (como as fictícias da POC) não gera código novo.
    if (!offer.active) throw new Error("Este benefício não está mais disponível.");

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
      tenantId: this.tenantId,
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
    const redemption = this.mine(store().redemptions).find((r) => r.code === normalized);
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
      memberName: profile?.fullName ?? "Membro do clube",
    };
  }
}

/** Plataforma em memória. As barbearias podem ser trocadas nos testes. */
export class DemoPlatform implements PlatformRepository {
  constructor(private tenants: Tenant[] = seed.tenants) {}

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.slug === slug && t.active) ?? null;
  }

  async listTenants(): Promise<Tenant[]> {
    return this.tenants
      .filter((t) => t.active)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  async createLead(lead: NewLead): Promise<void> {
    store().leads.push({ ...lead, id: uid(), createdAt: new Date().toISOString() });
  }

  async countRecentLeads(filter: {
    sinceISO: string;
    ipHash?: string | null;
    whatsapp?: string;
  }): Promise<number> {
    const since = ms(filter.sinceISO);
    return store().leads.filter(
      (l) =>
        ms(l.createdAt) >= since &&
        ((filter.ipHash && l.ipHash === filter.ipHash) ||
          (filter.whatsapp && l.whatsapp === filter.whatsapp)),
    ).length;
  }
}
