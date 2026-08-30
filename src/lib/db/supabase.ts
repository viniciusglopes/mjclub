import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

/* eslint-disable @typescript-eslint/no-explicit-any -- linhas cruas do Postgres */
type Row = Record<string, any>;

const toTenant = (r: Row): Tenant => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  tagline: r.tagline,
  whatsapp: r.whatsapp,
  address: r.address,
  timezone: r.timezone,
  brandPrimary: r.brand_primary,
});

const toService = (r: Row): Service => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.name,
  description: r.description,
  durationMin: r.duration_min,
  priceCents: r.price_cents,
  memberPriceCents: r.member_price_cents,
  active: r.active,
  sortOrder: r.sort_order,
});

const toAppointment = (r: Row): Appointment => ({
  id: r.id,
  tenantId: r.tenant_id,
  staffId: r.staff_id,
  serviceId: r.service_id,
  customerProfileId: r.customer_profile_id,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  status: r.status,
  priceCents: r.price_cents,
  discountCents: r.discount_cents,
  membershipId: r.membership_id,
  notes: r.notes,
  createdAt: r.created_at,
});

const toPlan = (r: Row): Plan => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.name,
  description: r.description,
  priceCents: r.price_cents,
  billingInterval: r.billing_interval,
  discountPercent: r.discount_percent,
  benefits: Array.isArray(r.benefits) ? r.benefits : [],
  highlight: r.highlight,
  active: r.active,
  sortOrder: r.sort_order,
});

const toMembership = (r: Row): Membership => ({
  id: r.id,
  tenantId: r.tenant_id,
  planId: r.plan_id,
  profileId: r.profile_id,
  memberCode: r.member_code,
  status: r.status,
  startedAt: r.started_at,
  currentPeriodEnd: r.current_period_end,
});

const toProfile = (r: Row): Profile => ({
  id: r.id,
  fullName: r.full_name,
  phone: r.phone,
  email: r.email,
});

const toPartner = (r: Row): Partner => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.name,
  slug: r.slug,
  category: r.category,
  description: r.description,
  address: r.address,
  phone: r.phone,
  website: r.website,
  active: r.active,
});

const toOffer = (r: Row): Offer => ({
  id: r.id,
  tenantId: r.tenant_id,
  partnerId: r.partner_id,
  title: r.title,
  description: r.description,
  discountLabel: r.discount_label,
  rules: r.rules,
  validUntil: r.valid_until,
  maxRedemptionsPerMember: r.max_redemptions_per_member,
  active: r.active,
});

const toRedemption = (r: Row): Redemption => ({
  id: r.id,
  tenantId: r.tenant_id,
  offerId: r.offer_id,
  membershipId: r.membership_id,
  code: r.code,
  status: r.status,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  validatedAt: r.validated_at,
});

/** Lança com a mensagem do Postgres em vez de devolver `null` silencioso. */
function unwrap<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) {
    throw new Error("Registro não encontrado.");
  }
  return res.data;
}

/**
 * Driver Postgres. Usa a service role key e roda apenas no servidor
 * (Server Components e Server Actions), nunca no browser.
 */
export class SupabaseRepository implements Repository {
  private db: SupabaseClient;

  constructor(
    private tenantId: string,
    url: string,
    serviceRoleKey: string,
  ) {
    this.db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async getTenant(): Promise<Tenant> {
    const row = unwrap(
      await this.db.from("tenants").select("*").eq("id", this.tenantId).single(),
    );
    return toTenant(row);
  }

  async listServices(): Promise<Service[]> {
    const rows = unwrap(
      await this.db
        .from("services")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .eq("active", true)
        .order("sort_order"),
    );
    return rows.map(toService);
  }

  async listStaff(): Promise<Staff[]> {
    const rows = unwrap(
      await this.db
        .from("staff")
        .select("*, staff_services(service_id)")
        .eq("tenant_id", this.tenantId)
        .eq("active", true)
        .order("sort_order"),
    );
    return rows.map((r: Row) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      nickname: r.nickname,
      bio: r.bio,
      active: r.active,
      sortOrder: r.sort_order,
      serviceIds: (r.staff_services ?? []).map((s: Row) => s.service_id),
    }));
  }

  async listSchedules(staffId: string): Promise<WorkSchedule[]> {
    const rows = unwrap(
      await this.db
        .from("work_schedules")
        .select("staff_id, weekday, start_time, end_time")
        .eq("staff_id", staffId),
    );
    return rows.map((r: Row) => ({
      staffId: r.staff_id,
      weekday: r.weekday,
      // Postgres devolve `time` como `HH:MM:SS`.
      startTime: String(r.start_time).slice(0, 5),
      endTime: String(r.end_time).slice(0, 5),
    }));
  }

  async listBusy(staffId: string, dateISO: string): Promise<Appointment[]> {
    const rows = unwrap(
      await this.db
        .from("appointments")
        .select("*")
        .eq("staff_id", staffId)
        .in("status", ["pending", "confirmed"])
        .gte("starts_at", `${dateISO}T00:00:00-03:00`)
        .lt("starts_at", `${dateISO}T23:59:59-03:00`),
    );
    return rows.map(toAppointment);
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    const { data } = await this.db
      .from("appointments")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .maybeSingle();
    return data ? toAppointment(data) : null;
  }

  async listAppointments(range: { fromISO: string; toISO: string }) {
    const rows = unwrap(
      await this.db
        .from("appointments")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .gte("starts_at", range.fromISO)
        .lt("starts_at", range.toISO)
        .order("starts_at"),
    );
    return rows.map(toAppointment);
  }

  async listAppointmentsByPhone(phone: string): Promise<Appointment[]> {
    const rows = unwrap(
      await this.db
        .from("appointments")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .eq("customer_phone", onlyDigits(phone))
        .order("starts_at", { ascending: false }),
    );
    return rows.map(toAppointment);
  }

  async createAppointment(input: NewAppointment): Promise<Appointment> {
    const res = await this.db
      .from("appointments")
      .insert({
        tenant_id: this.tenantId,
        staff_id: input.staffId,
        service_id: input.serviceId,
        customer_profile_id: input.customerProfileId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        price_cents: input.priceCents,
        discount_cents: input.discountCents,
        membership_id: input.membershipId,
        notes: input.notes,
      })
      .select("*")
      .single();

    // A constraint de exclusão do Postgres é quem garante que dois clientes
    // não fiquem com o mesmo horário numa corrida.
    if (res.error?.message.includes("appointments_no_overlap")) {
      throw new Error("Esse horário acabou de ser ocupado. Escolha outro.");
    }
    return toAppointment(unwrap(res));
  }

  async setAppointmentStatus(id: string, status: AppointmentStatus) {
    const { error } = await this.db
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);
  }

  async listPlans(): Promise<Plan[]> {
    const rows = unwrap(
      await this.db
        .from("plans")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .eq("active", true)
        .order("sort_order"),
    );
    return rows.map(toPlan);
  }

  async getPlan(id: string): Promise<Plan | null> {
    const { data } = await this.db.from("plans").select("*").eq("id", id).maybeSingle();
    return data ? toPlan(data) : null;
  }

  async listMemberships(): Promise<Membership[]> {
    const rows = unwrap(
      await this.db
        .from("memberships")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .order("started_at", { ascending: false }),
    );
    return rows.map(toMembership);
  }

  async getActiveMembership(profileId: string): Promise<Membership | null> {
    const { data } = await this.db
      .from("memberships")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("profile_id", profileId)
      .eq("status", "active")
      .maybeSingle();
    return data ? toMembership(data) : null;
  }

  async getMembershipByCode(code: string): Promise<Membership | null> {
    const { data } = await this.db
      .from("memberships")
      .select("*")
      .eq("member_code", code.trim().toUpperCase())
      .maybeSingle();
    return data ? toMembership(data) : null;
  }

  async subscribe(input: { fullName: string; phone: string; planId: string }) {
    const phone = onlyDigits(input.phone);
    let profile = await this.getProfileByPhone(phone);

    if (!profile) {
      // Sem Supabase Auth ainda: o perfil precisa de um auth.users por trás.
      const created = await this.db.auth.admin.createUser({
        phone,
        phone_confirm: true,
        user_metadata: { full_name: input.fullName },
      });
      if (created.error) throw new Error(created.error.message);

      profile = toProfile(
        unwrap(
          await this.db
            .from("profiles")
            .insert({
              id: created.data.user.id,
              full_name: input.fullName,
              phone,
            })
            .select("*")
            .single(),
        ),
      );
    }

    const existing = await this.getActiveMembership(profile.id);
    if (existing) {
      const updated = toMembership(
        unwrap(
          await this.db
            .from("memberships")
            .update({ plan_id: input.planId })
            .eq("id", existing.id)
            .select("*")
            .single(),
        ),
      );
      return { profile, membership: updated };
    }

    const membership = toMembership(
      unwrap(
        await this.db
          .from("memberships")
          .insert({
            tenant_id: this.tenantId,
            plan_id: input.planId,
            profile_id: profile.id,
            member_code: generateMemberCode(),
            status: "active",
            current_period_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          })
          .select("*")
          .single(),
      ),
    );
    return { profile, membership };
  }

  async getProfile(id: string): Promise<Profile | null> {
    const { data } = await this.db.from("profiles").select("*").eq("id", id).maybeSingle();
    return data ? toProfile(data) : null;
  }

  async getProfileByPhone(phone: string): Promise<Profile | null> {
    const { data } = await this.db
      .from("profiles")
      .select("*")
      .eq("phone", onlyDigits(phone))
      .maybeSingle();
    return data ? toProfile(data) : null;
  }

  async listPartners(): Promise<Partner[]> {
    const rows = unwrap(
      await this.db
        .from("partners")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .eq("active", true)
        .order("name"),
    );
    return rows.map(toPartner);
  }

  async getPartner(id: string): Promise<Partner | null> {
    const { data } = await this.db.from("partners").select("*").eq("id", id).maybeSingle();
    return data ? toPartner(data) : null;
  }

  async getPartnerBySlug(slug: string): Promise<Partner | null> {
    const { data } = await this.db
      .from("partners")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("slug", slug)
      .maybeSingle();
    return data ? toPartner(data) : null;
  }

  async listOffers(partnerId?: string): Promise<Offer[]> {
    let q = this.db
      .from("offers")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("active", true);
    if (partnerId) q = q.eq("partner_id", partnerId);
    return unwrap(await q).map(toOffer);
  }

  async getOffer(id: string): Promise<Offer | null> {
    const { data } = await this.db.from("offers").select("*").eq("id", id).maybeSingle();
    return data ? toOffer(data) : null;
  }

  async listRedemptions(filter: { membershipId?: string; partnerId?: string }) {
    let q = this.db
      .from("redemptions")
      .select("*, offers!inner(partner_id)")
      .eq("tenant_id", this.tenantId)
      .order("created_at", { ascending: false });

    if (filter.membershipId) q = q.eq("membership_id", filter.membershipId);
    if (filter.partnerId) q = q.eq("offers.partner_id", filter.partnerId);

    return unwrap(await q).map(toRedemption);
  }

  async createRedemption(offerId: string, membershipId: string): Promise<Redemption> {
    const offer = await this.getOffer(offerId);
    if (!offer) throw new Error("Oferta não encontrada.");

    const { count, error } = await this.db
      .from("redemptions")
      .select("id", { count: "exact", head: true })
      .eq("offer_id", offerId)
      .eq("membership_id", membershipId)
      .in("status", ["pending", "validated"]);
    if (error) throw new Error(error.message);

    // `head: true` devolve 204 sem erro quando a tabela não existe, e aí a
    // contagem vem nula. Tratar nulo como zero liberaria o benefício sem saber
    // quantos já foram usados — na dúvida, recusa.
    if (count === null) {
      throw new Error("Não foi possível conferir o limite deste benefício.");
    }

    if (count >= offer.maxRedemptionsPerMember) {
      throw new Error("Você já usou este benefício o número máximo de vezes.");
    }

    return toRedemption(
      unwrap(
        await this.db
          .from("redemptions")
          .insert({
            tenant_id: this.tenantId,
            offer_id: offerId,
            membership_id: membershipId,
            code: generateRedemptionCode(),
            expires_at: new Date(Date.now() + REDEMPTION_TTL_MS).toISOString(),
          })
          .select("*")
          .single(),
      ),
    );
  }

  async validateRedemption(code: string, partnerId: string): Promise<ValidationResult> {
    const { data } = await this.db
      .from("redemptions")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (!data) return { ok: false, reason: "Código não encontrado." };

    const redemption = toRedemption(data);
    const offer = await this.getOffer(redemption.offerId);
    if (!offer || offer.partnerId !== partnerId) {
      return { ok: false, reason: "Este código é de outro parceiro." };
    }
    if (redemption.status === "validated") {
      return { ok: false, reason: "Este código já foi usado." };
    }
    if (new Date(redemption.expiresAt).getTime() < Date.now()) {
      await this.db.from("redemptions").update({ status: "expired" }).eq("id", redemption.id);
      return { ok: false, reason: "Este código expirou." };
    }

    // O filtro por status ainda pendente evita validar duas vezes em corrida.
    const updated = await this.db
      .from("redemptions")
      .update({ status: "validated", validated_at: new Date().toISOString() })
      .eq("id", redemption.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (!updated.data) return { ok: false, reason: "Este código já foi usado." };

    const membership = unwrap(
      await this.db
        .from("memberships")
        .select("profile_id")
        .eq("id", redemption.membershipId)
        .single(),
    );
    const profile = await this.getProfile(membership.profile_id);

    return {
      ok: true,
      redemption: toRedemption(updated.data),
      offer,
      memberName: profile?.fullName ?? "Membro MJCLUB",
    };
  }
}
