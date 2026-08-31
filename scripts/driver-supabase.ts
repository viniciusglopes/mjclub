/**
 * Exercita o driver `supabase` contra uma API PostgREST de verdade — a mesma
 * peça que atende as queries dentro de um projeto Supabase.
 *
 * Não sobe nada sozinho: espera SUPABASE_TEST_URL e SUPABASE_TEST_KEY já
 * apontando para um PostgREST com as migrations aplicadas.
 * Ver docs/ARCHITECTURE.md §8.
 */
import assert from "node:assert/strict";

import { toSpIso } from "@/lib/availability";
import { SupabaseRepository } from "@/lib/db/supabase";
import { priceFor } from "@/lib/pricing";

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_KEY;
const TENANT = "a0000000-0000-4000-8000-000000000001";

if (!url || !key) {
  console.error("Defina SUPABASE_TEST_URL e SUPABASE_TEST_KEY.");
  process.exit(1);
}

const repo = new SupabaseRepository(TENANT, url, key);
const checks: string[] = [];
const ok = (label: string) => checks.push(label);

async function main() {
  // ------------------------------------------------------------ catálogo
  const tenant = await repo.getTenant();
  assert.equal(tenant.slug, "mj-barbearia");
  assert.equal(tenant.brandPrimary, "#c8a24a");
  ok("getTenant mapeia snake_case para camelCase");

  const services = await repo.listServices();
  assert.equal(services.length, 7);
  assert.equal(services[0].name, "Corte masculino", "deve vir ordenado por sort_order");
  const combo = services.find((s) => s.name === "Corte + Barba")!;
  // Nenhum serviço tem preço fixo de membro hoje: os planos reais entregam
  // cota, não desconto. O mapeamento do nulo é o que importa aqui.
  assert.ok(services.every((s) => s.memberPriceCents === null));
  ok("listServices mapeia preço de membro nulo sem virar zero");

  const staff = await repo.listStaff();
  assert.equal(staff.length, 3);
  const mikael = staff.find((s) => s.nickname === "Mikael")!;
  // O embed de staff_services precisa virar uma lista de ids.
  assert.equal(mikael.serviceIds.length, 6);
  assert.ok(!mikael.serviceIds.includes(services.find((s) => s.name === "Platinado")!.id));
  assert.equal(staff.find((s) => s.nickname === "Diego")!.serviceIds.length, 7);
  ok("listStaff resolve o embed de staff_services");

  const schedules = await repo.listSchedules(mikael.id);
  assert.equal(schedules.length, 5);
  // O Postgres devolve `time` como HH:MM:SS; o driver corta para HH:MM.
  assert.equal(schedules[0].startTime, "09:00");
  assert.ok(schedules.every((s) => /^\d{2}:\d{2}$/.test(s.endTime)));
  ok("listSchedules normaliza o formato de hora do Postgres");

  const plans = await repo.listPlans();
  assert.equal(plans.length, 6);
  const destaque = plans.find((p) => p.highlight)!;
  assert.equal(destaque.name, "Plano Completo");
  // benefits é jsonb: precisa chegar como array de strings, não string única.
  assert.ok(Array.isArray(destaque.benefits) && destaque.benefits.length >= 3);
  assert.ok(destaque.benefits.every((b) => typeof b === "string"));
  // Os planos reais são cota, não desconto: nenhum desconta sozinho.
  assert.ok(plans.every((p) => p.discountPercent === 0));
  ok("listPlans desserializa o jsonb de benefícios");

  // ------------------------------------------------------------ agenda
  const dia = "2026-12-01"; // uma terça-feira
  const antes = await repo.listBusy(mikael.id, dia);

  const startsAt = `${dia}T09:00:00-03:00`;
  const endsAt = toSpIso(new Date(new Date(startsAt).getTime() + combo.durationMin * 60_000));
  const preco = priceFor(combo, destaque);

  const novo = {
    staffId: mikael.id,
    serviceId: combo.id,
    customerName: "Teste Driver",
    customerPhone: "11900000001",
    customerProfileId: null,
    startsAt,
    endsAt,
    priceCents: preco.finalCents,
    discountCents: preco.discountCents,
    membershipId: null,
    notes: "reservado pelo teste",
  };

  const agendado = await repo.createAppointment(novo);
  assert.equal(agendado.status, "confirmed");
  assert.equal(agendado.priceCents, combo.priceCents);
  assert.equal(agendado.discountCents, 0);
  assert.equal(agendado.notes, "reservado pelo teste");
  ok("createAppointment grava e devolve a linha criada");

  const lido = await repo.getAppointment(agendado.id);
  assert.equal(lido?.id, agendado.id);
  assert.equal(await repo.getAppointment("00000000-0000-4000-8000-0000000000ff"), null);
  ok("getAppointment acha o registro e devolve null quando não existe");

  const depois = await repo.listBusy(mikael.id, dia);
  assert.equal(depois.length, antes.length + 1);
  ok("listBusy enxerga o novo atendimento no dia certo");

  // A constraint de exclusão do Postgres é quem barra a corrida; o driver
  // precisa traduzir esse erro para uma mensagem que a tela sabe mostrar.
  await assert.rejects(
    repo.createAppointment({ ...novo, customerName: "Concorrente" }),
    /acabou de ser ocupado/,
  );
  ok("createAppointment traduz o conflito de horário");

  const doDia = await repo.listAppointments({
    fromISO: `${dia}T00:00:00-03:00`,
    toISO: `${dia}T23:59:59-03:00`,
  });
  assert.ok(doDia.some((a) => a.id === agendado.id));
  const outroDia = await repo.listAppointments({
    fromISO: "2026-11-01T00:00:00-03:00",
    toISO: "2026-11-02T00:00:00-03:00",
  });
  assert.ok(!outroDia.some((a) => a.id === agendado.id));
  ok("listAppointments filtra pela janela pedida");

  const porTelefone = await repo.listAppointmentsByPhone("(11) 90000-0001");
  assert.ok(porTelefone.some((a) => a.id === agendado.id));
  ok("listAppointmentsByPhone normaliza o telefone antes de consultar");

  await repo.setAppointmentStatus(agendado.id, "completed");
  assert.equal((await repo.getAppointment(agendado.id))?.status, "completed");
  ok("setAppointmentStatus persiste a mudança");

  // ------------------------------------------------------------ clube
  const membership = (await repo.listMemberships())[0];
  assert.equal(membership.memberCode, "MJ-7K42-9QX");
  ok("listMemberships lê as assinaturas do tenant");

  const porCodigo = await repo.getMembershipByCode("mj-7k42-9qx");
  assert.equal(porCodigo?.id, membership.id, "o código deve ser normalizado para maiúsculas");
  assert.equal(await repo.getMembershipByCode("MJ-XXXX-XXX"), null);
  ok("getMembershipByCode aceita o código em minúsculas");

  const ativa = await repo.getActiveMembership(membership.profileId);
  assert.equal(ativa?.id, membership.id);
  ok("getActiveMembership acha a assinatura ativa do perfil");

  // subscribe com perfil que já existe: troca o plano e mantém a carteirinha.
  // O caminho de perfil novo passa por auth.admin.createUser (GoTrue), que o
  // PostgREST não serve — fica coberto só contra um Supabase real.
  const outroPlano = plans.find((p) => p.id !== membership.planId)!;
  const trocado = await repo.subscribe({
    fullName: "João Pereira",
    phone: "(11) 98888-0002",
    planId: outroPlano.id,
  });
  assert.equal(trocado.membership.id, membership.id, "não deve criar outra assinatura");
  assert.equal(trocado.membership.planId, outroPlano.id);
  assert.equal(trocado.membership.memberCode, membership.memberCode);
  ok("subscribe troca o plano sem emitir nova carteirinha");

  const perfil = await repo.getProfileByPhone("(11) 98888-0002");
  assert.equal(perfil?.fullName, "João Pereira");
  assert.equal(await repo.getProfileByPhone("11000000000"), null);
  ok("getProfileByPhone encontra pelo telefone formatado");

  // ------------------------------------------------------------ parceiros
  const partners = await repo.listPartners();
  assert.equal(partners.length, 6);
  const sabor = await repo.getPartnerBySlug("sabor-e-brasa");
  assert.equal(sabor?.name, "Sabor & Brasa");
  assert.equal(await repo.getPartnerBySlug("nao-existe"), null);
  ok("listPartners e getPartnerBySlug respondem");

  const todasOfertas = await repo.listOffers();
  assert.equal(todasOfertas.length, 6);
  const doSabor = await repo.listOffers(sabor!.id);
  assert.equal(doSabor.length, 1);
  ok("listOffers filtra por parceiro");

  // ------------------------------------------------------------ resgates
  const oferta = doSabor[0];
  const resgate = await repo.createRedemption(oferta.id, membership.id);
  assert.equal(resgate.status, "pending");
  assert.equal(resgate.code.length, 6);
  assert.ok(new Date(resgate.expiresAt).getTime() > Date.now());
  ok("createRedemption gera código com validade");

  const doMembro = await repo.listRedemptions({ membershipId: membership.id });
  assert.ok(doMembro.some((r) => r.id === resgate.id));
  // O filtro por parceiro passa por um join embutido no PostgREST.
  const doParceiro = await repo.listRedemptions({ partnerId: sabor!.id });
  assert.ok(doParceiro.some((r) => r.id === resgate.id));
  const deOutro = await repo.listRedemptions({
    partnerId: partners.find((p) => p.slug === "iron-fit")!.id,
  });
  assert.ok(!deOutro.some((r) => r.id === resgate.id));
  ok("listRedemptions filtra por membro e por parceiro");

  const erradoParceiro = await repo.validateRedemption(
    resgate.code,
    partners.find((p) => p.slug === "iron-fit")!.id,
  );
  assert.equal(erradoParceiro.ok, false);
  ok("validateRedemption recusa código de outro parceiro");

  const valido = await repo.validateRedemption(resgate.code.toLowerCase(), sabor!.id);
  assert.equal(valido.ok, true);
  if (valido.ok) {
    assert.equal(valido.memberName, "João Pereira");
    assert.equal(valido.redemption.status, "validated");
    assert.ok(valido.redemption.validatedAt);
  }
  ok("validateRedemption valida e identifica o membro");

  const repetido = await repo.validateRedemption(resgate.code, sabor!.id);
  assert.equal(repetido.ok, false);
  ok("validateRedemption recusa o mesmo código duas vezes");

  const inexistente = await repo.validateRedemption("ZZZZZZ", sabor!.id);
  assert.equal(inexistente.ok, false);
  ok("validateRedemption recusa código inexistente");

  // O limite por membro é contado pelo driver, não pelo banco.
  for (let i = 1; i < oferta.maxRedemptionsPerMember; i++) {
    await repo.createRedemption(oferta.id, membership.id);
  }
  await assert.rejects(
    repo.createRedemption(oferta.id, membership.id),
    /número máximo/,
  );
  ok("createRedemption respeita o limite de usos por membro");

  console.log(checks.map((c) => `  ✓ ${c}`).join("\n"));
  console.log(`\n${checks.length} verificações do driver supabase passaram.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
