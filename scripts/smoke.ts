/**
 * Smoke test do domínio: roda os fluxos que a POC precisa demonstrar contra o
 * driver `demo`, sem subir o Next. `npm run smoke`
 */
import assert from "node:assert/strict";

import { buildSlots, toSpIso, todayInSP, weekdayOf } from "@/lib/availability";
import { DemoRepository } from "@/lib/db/demo";
import { priceFor } from "@/lib/pricing";

const repo = new DemoRepository();
const checks: string[] = [];
const ok = (label: string) => checks.push(label);

/** Próxima data em que a barbearia abre (terça a sábado). */
function nextOpenDate(): string {
  const base = new Date(`${todayInSP()}T12:00:00-03:00`);
  for (let i = 1; i <= 8; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (weekdayOf(iso) >= 2) return iso;
  }
  throw new Error("Nenhuma data aberta encontrada.");
}

async function main() {
  // ------------------------------------------------------------ catálogo
  const [tenant, services, staff, plans, partners, offers] = await Promise.all([
    repo.getTenant(),
    repo.listServices(),
    repo.listStaff(),
    repo.listPlans(),
    repo.listPartners(),
    repo.listOffers(),
  ]);

  assert.equal(tenant.slug, "mj-barbearia");
  assert.equal(services.length, 7);
  assert.equal(staff.length, 3);
  assert.equal(plans.length, 3);
  assert.equal(partners.length, 6);
  assert.equal(offers.length, 6);
  ok("catálogo semeado");

  // Só o Diego faz platinado.
  const platinado = services.find((s) => s.name === "Platinado")!;
  assert.deepEqual(
    staff.filter((s) => s.serviceIds.includes(platinado.id)).map((s) => s.nickname),
    ["Diego"],
  );
  ok("vínculo profissional × serviço");

  // ------------------------------------------------------------ preço
  const combo = services.find((s) => s.name === "Corte + Barba")!;
  const prime = plans.find((p) => p.name === "MJ Prime")!;
  const start = plans.find((p) => p.name === "MJ Start")!;

  assert.deepEqual(priceFor(combo, null), {
    fullCents: 7500,
    finalCents: 7500,
    discountCents: 0,
  });
  // memberPriceCents ganha do percentual do plano.
  assert.equal(priceFor(combo, prime).finalCents, 5900);
  // Sem preço fixo, aplica o percentual: 45,00 − 10% = 40,50.
  const corte = services.find((s) => s.name === "Corte masculino")!;
  assert.equal(priceFor(corte, start).finalCents, 4050);
  ok("regra de preço de membro");

  // ------------------------------------------------------------ agenda
  const dateISO = nextOpenDate();
  const mikael = staff.find((s) => s.nickname === "Mikael")!;
  const schedules = await repo.listSchedules(mikael.id);

  const slotsBefore = buildSlots({
    dateISO,
    durationMin: combo.durationMin,
    schedules,
    busy: [],
  });
  assert.ok(slotsBefore.length > 0, "deveria haver horário livre");
  ok(`${slotsBefore.length} horários livres em ${dateISO}`);

  const chosen = slotsBefore[4];
  const endsAt = toSpIso(
    new Date(new Date(chosen.startsAt).getTime() + combo.durationMin * 60_000),
  );

  const membership = (await repo.listMemberships())[0];
  const priced = priceFor(combo, prime);

  const appointment = await repo.createAppointment({
    staffId: mikael.id,
    serviceId: combo.id,
    customerName: "João Pereira",
    customerPhone: "11988880002",
    customerProfileId: null,
    startsAt: chosen.startsAt,
    endsAt,
    priceCents: priced.finalCents,
    discountCents: priced.discountCents,
    membershipId: membership.id,
    notes: null,
  });
  assert.equal(appointment.status, "confirmed");
  assert.equal(appointment.discountCents, 1600);
  ok("agendamento criado com desconto do clube");

  // O mesmo horário não pode ser vendido duas vezes.
  await assert.rejects(
    repo.createAppointment({
      staffId: mikael.id,
      serviceId: combo.id,
      customerName: "Outro Cliente",
      customerPhone: "11966660000",
      customerProfileId: null,
      startsAt: chosen.startsAt,
      endsAt,
      priceCents: combo.priceCents,
      discountCents: 0,
      membershipId: null,
      notes: null,
    }),
    /acabou de ser ocupado/,
  );
  ok("horário ocupado é recusado");

  // Regressão: `startsAt` (offset -03:00) e `endsAt` já foram comparados como
  // texto contra um `endsAt` em UTC, o que fazia horário livre parecer
  // ocupado. Um slot posterior sem sobreposição precisa continuar reservável.
  const later = slotsBefore.find(
    (s) => new Date(s.startsAt).getTime() >= new Date(endsAt).getTime(),
  )!;
  const second = await repo.createAppointment({
    staffId: mikael.id,
    serviceId: combo.id,
    customerName: "Carlos Lima",
    customerPhone: "11977771234",
    customerProfileId: null,
    startsAt: later.startsAt,
    endsAt: toSpIso(
      new Date(new Date(later.startsAt).getTime() + combo.durationMin * 60_000),
    ),
    priceCents: combo.priceCents,
    discountCents: 0,
    membershipId: null,
    notes: null,
  });
  assert.equal(second.status, "confirmed");
  await repo.setAppointmentStatus(second.id, "canceled");
  ok("horário livre depois do ocupado continua reservável");

  // E some da grade.
  const busy = await repo.listBusy(mikael.id, dateISO);
  const slotsAfter = buildSlots({
    dateISO,
    durationMin: combo.durationMin,
    schedules,
    busy,
  });
  assert.ok(
    slotsAfter.length < slotsBefore.length,
    "a grade deveria encolher após a reserva",
  );
  assert.ok(!slotsAfter.some((s) => s.startsAt === chosen.startsAt));
  ok("grade recalculada após a reserva");

  // ------------------------------------------------------------ clube
  const found = await repo.getMembershipByCode(membership.memberCode);
  assert.equal(found?.id, membership.id);
  ok("carteirinha localizada pelo código");

  const novo = await repo.subscribe({
    fullName: "Carlos Lima",
    phone: "(11) 97777-1234",
    planId: start.id,
  });
  assert.equal(novo.membership.status, "active");
  assert.match(novo.membership.memberCode, /^MJ-[A-Z0-9]{4}-[A-Z0-9]{3}$/);
  ok("nova assinatura gera carteirinha");

  // ------------------------------------------------------------ resgate
  const rodizio = offers.find((o) => o.title.includes("Rodízio"))!;
  const academia = offers.find((o) => o.maxRedemptionsPerMember === 1)!;

  const redemption = await repo.createRedemption(rodizio.id, membership.id);
  assert.equal(redemption.status, "pending");
  assert.equal(redemption.code.length, 6);
  ok("código de resgate gerado");

  // Código de um parceiro não vale no balcão de outro.
  const outroParceiro = partners.find((p) => p.slug === "iron-fit")!;
  const errado = await repo.validateRedemption(redemption.code, outroParceiro.id);
  assert.equal(errado.ok, false);
  ok("código recusado no parceiro errado");

  const dono = partners.find((p) => p.slug === "sabor-e-brasa")!;
  const validado = await repo.validateRedemption(redemption.code, dono.id);
  assert.equal(validado.ok, true);
  ok("resgate validado pelo parceiro certo");

  // Uma vez usado, não vale de novo.
  const repetido = await repo.validateRedemption(redemption.code, dono.id);
  assert.equal(repetido.ok, false);
  ok("código usado não vale duas vezes");

  // E o limite por membro é respeitado.
  await repo.createRedemption(academia.id, membership.id);
  await assert.rejects(
    repo.createRedemption(academia.id, membership.id),
    /número máximo/,
  );
  ok("limite de usos por membro respeitado");

  console.log(checks.map((c) => `  ✓ ${c}`).join("\n"));
  console.log(`\n${checks.length} verificações passaram.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
