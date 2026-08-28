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

export type NewAppointment = {
  staffId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerProfileId: string | null;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  discountCents: number;
  membershipId: string | null;
  notes: string | null;
};

export type ValidationResult =
  | { ok: true; redemption: Redemption; offer: Offer; memberName: string }
  | { ok: false; reason: string };

/**
 * Contrato único de acesso a dados. Dois drivers o implementam: `demo`
 * (em memória, para a POC rodar sem infra) e `supabase` (Postgres real).
 */
export interface Repository {
  // ------------------------------------------------------------ barbearia
  getTenant(): Promise<Tenant>;
  listServices(): Promise<Service[]>;
  listStaff(): Promise<Staff[]>;
  listSchedules(staffId: string): Promise<WorkSchedule[]>;

  // ------------------------------------------------------------ agenda
  /** Atendimentos ativos de um profissional num dia, para calcular vagas. */
  listBusy(staffId: string, dateISO: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | null>;
  listAppointments(range: { fromISO: string; toISO: string }): Promise<Appointment[]>;
  listAppointmentsByPhone(phone: string): Promise<Appointment[]>;
  createAppointment(input: NewAppointment): Promise<Appointment>;
  setAppointmentStatus(id: string, status: AppointmentStatus): Promise<void>;

  // ------------------------------------------------------------ clube
  listPlans(): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | null>;
  listMemberships(): Promise<Membership[]>;
  getActiveMembership(profileId: string): Promise<Membership | null>;
  getMembershipByCode(code: string): Promise<Membership | null>;
  /** Assina um plano criando o perfil se o telefone ainda não for conhecido. */
  subscribe(input: {
    fullName: string;
    phone: string;
    planId: string;
  }): Promise<{ profile: Profile; membership: Membership }>;

  // ------------------------------------------------------------ pessoas
  getProfile(id: string): Promise<Profile | null>;
  getProfileByPhone(phone: string): Promise<Profile | null>;

  // ------------------------------------------------------------ parceiros
  listPartners(): Promise<Partner[]>;
  getPartner(id: string): Promise<Partner | null>;
  getPartnerBySlug(slug: string): Promise<Partner | null>;
  listOffers(partnerId?: string): Promise<Offer[]>;
  getOffer(id: string): Promise<Offer | null>;

  // ------------------------------------------------------------ resgates
  listRedemptions(filter: {
    membershipId?: string;
    partnerId?: string;
  }): Promise<Redemption[]>;
  createRedemption(offerId: string, membershipId: string): Promise<Redemption>;
  /** O parceiro digita o código no balcão; aqui ele vira `validated`. */
  validateRedemption(code: string, partnerId: string): Promise<ValidationResult>;
}
