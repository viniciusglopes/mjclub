/** Tipos do domínio MJCLUB. Espelham as tabelas de supabase/migrations. */

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "canceled"
  | "no_show";

export type MembershipStatus = "active" | "past_due" | "canceled";

export type RedemptionStatus = "pending" | "validated" | "expired" | "canceled";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  whatsapp: string | null;
  address: string | null;
  timezone: string;
  brandPrimary: string;
};

export type Staff = {
  id: string;
  tenantId: string;
  name: string;
  nickname: string | null;
  bio: string | null;
  active: boolean;
  sortOrder: number;
  /** Ids dos serviços que este profissional executa. */
  serviceIds: string[];
};

export type Service = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  /** Preço fixo de membro. `null` = aplica o desconto percentual do plano. */
  memberPriceCents: number | null;
  active: boolean;
  sortOrder: number;
};

export type WorkSchedule = {
  staffId: string;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  startTime: string;
  endTime: string;
};

export type Appointment = {
  id: string;
  tenantId: string;
  staffId: string;
  serviceId: string;
  customerProfileId: string | null;
  customerName: string;
  customerPhone: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  priceCents: number;
  discountCents: number;
  membershipId: string | null;
  notes: string | null;
  createdAt: string;
};

export type Plan = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: "monthly" | "yearly";
  discountPercent: number;
  benefits: string[];
  highlight: boolean;
  active: boolean;
  sortOrder: number;
};

export type Membership = {
  id: string;
  tenantId: string;
  planId: string;
  profileId: string;
  memberCode: string;
  status: MembershipStatus;
  startedAt: string;
  currentPeriodEnd: string | null;
};

export type Profile = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
};

export type Partner = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
};

export type Offer = {
  id: string;
  tenantId: string;
  partnerId: string;
  title: string;
  description: string | null;
  discountLabel: string;
  rules: string | null;
  validUntil: string | null;
  maxRedemptionsPerMember: number;
  active: boolean;
};

export type Redemption = {
  id: string;
  tenantId: string;
  offerId: string;
  membershipId: string;
  code: string;
  status: RedemptionStatus;
  createdAt: string;
  expiresAt: string;
  validatedAt: string | null;
};

/** Um horário livre na agenda de um profissional. */
export type Slot = {
  /** ISO completo com offset, ex.: `2026-09-01T09:00:00-03:00`. */
  startsAt: string;
  /** `HH:mm` para exibição. */
  label: string;
};
