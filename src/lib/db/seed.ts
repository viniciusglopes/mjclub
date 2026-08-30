/**
 * Seed do driver `demo`. Espelha o seed do catálogo em
 * supabase/migrations/ e supabase/seeds/demo_users.sql — os mesmos ids, para
 * que a tela não mude ao trocar de driver. Dados fictícios, revisar antes de
 * produção.
 */
import type {
  Appointment,
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

export const TENANT_ID = "a0000000-0000-4000-8000-000000000001";

const svc = (n: number) => `c0000000-0000-4000-8000-00000000000${n}`;
const stf = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;
const pln = (n: number) => `d0000000-0000-4000-8000-00000000000${n}`;
const ptr = (n: number) => `e0000000-0000-4000-8000-00000000000${n}`;
const off = (n: number) => `f0000000-0000-4000-8000-00000000000${n}`;
const usr = (n: number) => `10000000-0000-4000-8000-00000000000${n}`;

export const tenant: Tenant = {
  id: TENANT_ID,
  slug: "mj-barbearia",
  name: "MJ Barbearia",
  tagline:
    "Corte, barba e um clube de vantagens que acompanha você fora da cadeira.",
  whatsapp: "5511999999999",
  address: "Rua das Palmeiras, 120 — São Paulo/SP",
  timezone: "America/Sao_Paulo",
  brandPrimary: "#c8a24a",
};

export const services: Service[] = [
  {
    id: svc(1),
    tenantId: TENANT_ID,
    name: "Corte masculino",
    description: "Máquina, tesoura e finalização.",
    durationMin: 40,
    priceCents: 4500,
    memberPriceCents: null,
    active: true,
    sortOrder: 1,
  },
  {
    id: svc(2),
    tenantId: TENANT_ID,
    name: "Corte + Barba",
    description: "O combo da casa, com toalha quente.",
    durationMin: 70,
    priceCents: 7500,
    memberPriceCents: 5900,
    active: true,
    sortOrder: 2,
  },
  {
    id: svc(3),
    tenantId: TENANT_ID,
    name: "Barba",
    description: "Modelagem com navalha e hidratação.",
    durationMin: 30,
    priceCents: 3500,
    memberPriceCents: null,
    active: true,
    sortOrder: 3,
  },
  {
    id: svc(4),
    tenantId: TENANT_ID,
    name: "Pezinho",
    description: "Acabamento entre os cortes.",
    durationMin: 15,
    priceCents: 2000,
    memberPriceCents: 0,
    active: true,
    sortOrder: 4,
  },
  {
    id: svc(5),
    tenantId: TENANT_ID,
    name: "Sobrancelha",
    description: "Limpeza e alinhamento na navalha.",
    durationMin: 15,
    priceCents: 2000,
    memberPriceCents: null,
    active: true,
    sortOrder: 5,
  },
  {
    id: svc(6),
    tenantId: TENANT_ID,
    name: "Corte infantil",
    description: "Até 10 anos, com paciência inclusa.",
    durationMin: 40,
    priceCents: 4000,
    memberPriceCents: null,
    active: true,
    sortOrder: 6,
  },
  {
    id: svc(7),
    tenantId: TENANT_ID,
    name: "Platinado",
    description: "Descoloração completa e matização.",
    durationMin: 120,
    priceCents: 18000,
    memberPriceCents: null,
    active: true,
    sortOrder: 7,
  },
];

const allButPlatinado = services
  .filter((s) => s.id !== svc(7))
  .map((s) => s.id);

export const staff: Staff[] = [
  {
    id: stf(1),
    tenantId: TENANT_ID,
    name: "Mikael Alves",
    nickname: "Mikael",
    bio: "Sócio-fundador. Especialista em degradê e barba desenhada.",
    active: true,
    sortOrder: 1,
    serviceIds: allButPlatinado,
  },
  {
    id: stf(2),
    tenantId: TENANT_ID,
    name: "Rafael Souza",
    nickname: "Rafa",
    bio: "Cortes clássicos e navalhado.",
    active: true,
    sortOrder: 2,
    serviceIds: allButPlatinado,
  },
  {
    id: stf(3),
    tenantId: TENANT_ID,
    name: "Diego Martins",
    nickname: "Diego",
    bio: "Coloração, platinado e visagismo.",
    active: true,
    sortOrder: 3,
    serviceIds: services.map((s) => s.id),
  },
];

// Terça a sexta 09h–20h, sábado 09h–18h. Diego folga na terça.
export const workSchedules: WorkSchedule[] = staff.flatMap((s) =>
  [2, 3, 4, 5, 6]
    .filter((weekday) => !(s.id === stf(3) && weekday === 2))
    .map((weekday) => ({
      staffId: s.id,
      weekday,
      startTime: "09:00",
      endTime: weekday === 6 ? "18:00" : "20:00",
    })),
);

export const plans: Plan[] = [
  {
    id: pln(1),
    tenantId: TENANT_ID,
    name: "MJ Start",
    description: "Para quem corta uma vez por mês e quer as vantagens do clube.",
    priceCents: 4990,
    billingInterval: "monthly",
    discountPercent: 10,
    benefits: [
      "10% de desconto em todos os serviços",
      "Pezinho grátis entre os cortes",
      "Acesso a toda a rede de parceiros",
    ],
    highlight: false,
    active: true,
    sortOrder: 1,
  },
  {
    id: pln(2),
    tenantId: TENANT_ID,
    name: "MJ Prime",
    description: "O plano da casa. Desconto forte e prioridade na agenda.",
    priceCents: 8990,
    billingInterval: "monthly",
    discountPercent: 20,
    benefits: [
      "20% de desconto em todos os serviços",
      "Combo Corte + Barba por R$ 59",
      "Prioridade na fila de espera",
      "Acesso a toda a rede de parceiros",
    ],
    highlight: true,
    active: true,
    sortOrder: 2,
  },
  {
    id: pln(3),
    tenantId: TENANT_ID,
    name: "MJ Black",
    description: "Corte quando quiser, sem contar quantas vezes.",
    priceCents: 14990,
    billingInterval: "monthly",
    discountPercent: 30,
    benefits: [
      "Cortes ilimitados",
      "30% de desconto nos demais serviços",
      "Barba com 50% de desconto",
      "Benefícios exclusivos na rede de parceiros",
    ],
    highlight: false,
    active: true,
    sortOrder: 3,
  },
];

export const partners: Partner[] = [
  {
    id: ptr(1),
    tenantId: TENANT_ID,
    name: "Sabor & Brasa",
    slug: "sabor-e-brasa",
    category: "Restaurante",
    description: "Churrascaria de bairro, rodízio no almoço e à noite.",
    address: "Av. Central, 880",
    phone: "1133330001",
    website: null,
    active: true,
  },
  {
    id: ptr(2),
    tenantId: TENANT_ID,
    name: "Iron Fit",
    slug: "iron-fit",
    category: "Academia",
    description: "Musculação e funcional, aberta das 5h à meia-noite.",
    address: "Rua das Palmeiras, 45",
    phone: "1133330002",
    website: null,
    active: true,
  },
  {
    id: ptr(3),
    tenantId: TENANT_ID,
    name: "Pizzaria Nonna",
    slug: "pizzaria-nonna",
    category: "Pizzaria",
    description: "Massa de fermentação natural e forno a lenha.",
    address: "Rua Itália, 210",
    phone: "1133330003",
    website: null,
    active: true,
  },
  {
    id: ptr(4),
    tenantId: TENANT_ID,
    name: "Ótica Visão",
    slug: "otica-visao",
    category: "Ótica",
    description: "Armações, lentes e exame de vista sem custo.",
    address: "Av. Central, 1200",
    phone: "1133330004",
    website: null,
    active: true,
  },
  {
    id: ptr(5),
    tenantId: TENANT_ID,
    name: "Turbo Auto Center",
    slug: "turbo-auto-center",
    category: "Automotivo",
    description: "Troca de óleo, alinhamento e estética automotiva.",
    address: "Rod. do Sol, km 3",
    phone: "1133330005",
    website: null,
    active: true,
  },
  {
    id: ptr(6),
    tenantId: TENANT_ID,
    name: "Café Central",
    slug: "cafe-central",
    category: "Cafeteria",
    description: "Café especial, brunch e coworking no mezanino.",
    address: "Praça da Matriz, 12",
    phone: "1133330006",
    website: null,
    active: true,
  },
];

export const offers: Offer[] = [
  {
    id: off(1),
    tenantId: TENANT_ID,
    partnerId: ptr(1),
    title: "Rodízio com 20% off",
    description: "Vale para o rodízio de almoço e jantar, todos os dias.",
    discountLabel: "20% OFF",
    rules: "Não acumula com outras promoções. Válido para até 2 pessoas por visita.",
    validUntil: null,
    maxRedemptionsPerMember: 4,
    active: true,
  },
  {
    id: off(2),
    tenantId: TENANT_ID,
    partnerId: ptr(2),
    title: "Matrícula grátis + 1º mês pela metade",
    description: "Chegue com a carteirinha e comece a treinar no mesmo dia.",
    discountLabel: "Matrícula grátis",
    rules: "Uma vez por membro. Não vale para renovação de contrato.",
    validUntil: null,
    maxRedemptionsPerMember: 1,
    active: true,
  },
  {
    id: off(3),
    tenantId: TENANT_ID,
    partnerId: ptr(3),
    title: "Pizza grande na compra de outra",
    description: "A segunda pizza sai por nossa conta, de segunda a quinta.",
    discountLabel: "2 por 1",
    rules: "Vale a de menor valor. Consumo no local ou retirada.",
    validUntil: null,
    maxRedemptionsPerMember: 2,
    active: true,
  },
  {
    id: off(4),
    tenantId: TENANT_ID,
    partnerId: ptr(4),
    title: "30% off em armações",
    description: "Desconto em toda a linha de armações de grau.",
    discountLabel: "30% OFF",
    rules: "Não cumulativo. Lentes com condição à parte.",
    validUntil: null,
    maxRedemptionsPerMember: 2,
    active: true,
  },
  {
    id: off(5),
    tenantId: TENANT_ID,
    partnerId: ptr(5),
    title: "Troca de óleo com 25% off",
    description: "Inclui filtro e checagem de 20 itens.",
    discountLabel: "25% OFF",
    rules: "Agende com um dia de antecedência.",
    validUntil: null,
    maxRedemptionsPerMember: 3,
    active: true,
  },
  {
    id: off(6),
    tenantId: TENANT_ID,
    partnerId: ptr(6),
    title: "Café + pão na chapa por R$ 9,90",
    description: "Todo dia útil, até as 11h.",
    discountLabel: "Combo R$ 9,90",
    rules: "Um combo por visita.",
    validUntil: null,
    maxRedemptionsPerMember: 10,
    active: true,
  },
];

export const profiles: Profile[] = [
  {
    id: usr(1),
    fullName: "Mikael Alves",
    phone: "11988880001",
    email: "mikael@mjclub.com.br",
  },
  {
    id: usr(2),
    fullName: "João Pereira",
    phone: "11988880002",
    email: "joao@exemplo.com",
  },
  {
    id: usr(3),
    fullName: "Sabor & Brasa (gerência)",
    phone: "11988880003",
    email: "contato@saborebrasa.com.br",
  },
];

export const memberships: Membership[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    tenantId: TENANT_ID,
    planId: pln(2),
    profileId: usr(2),
    memberCode: "MJ-7K42-9QX",
    status: "active",
    startedAt: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  },
];

/** A demo começa com a agenda vazia; os agendamentos nascem do uso. */
export const appointments: Appointment[] = [];
export const redemptions: Redemption[] = [];

/** Quem é dono/equipe do tenant e quem responde por cada parceiro. */
export const tenantOwners = [usr(1)];
export const partnerUsers: Record<string, string[]> = { [ptr(1)]: [usr(3)] };
