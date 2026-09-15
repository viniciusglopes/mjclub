/**
 * Multi-barbearia: slugs reservados, resolução do tenant pelo slug (driver
 * `demo`), isolamento por tenant e sigla da carteirinha. `npm run test:tenancy`
 */
import assert from "node:assert/strict";

import { generateMemberCode, memberCodePrefix } from "@/lib/codes";
import { DemoPlatform, DemoRepository } from "@/lib/db/demo";
import { findTenantBySlug } from "@/lib/db/platform";
import * as seed from "@/lib/db/seed";
import { RESERVED_SLUGS, slugValido, sugerirSlug } from "@/lib/slugs";
import type { Tenant } from "@/lib/types";

const checks: string[] = [];
const ok = (label: string) => checks.push(label);

async function main() {
  // ------------------------------------------------------------ slugs
  for (const reserved of [
    "admin",
    "agendar",
    "clube",
    "entrar",
    "minha-conta",
    "parceiro",
    "api",
    "_next",
    "login",
    "painel",
    "precos",
    "contratar",
    "cadastro",
    "sobre",
    "termos",
    "privacidade",
    "static",
    "public",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
  ]) {
    assert.ok(RESERVED_SLUGS.has(reserved), `${reserved} deveria estar reservado`);
    assert.equal(slugValido(reserved), false, `${reserved} não pode virar barbearia`);
  }
  ok("rotas do MJCLUB são slugs reservados");

  for (const valid of ["mjbarbearia", "barbearia-do-ze", "navalha-de-ouro", "b12"]) {
    assert.equal(slugValido(valid), true, `${valid} deveria ser válido`);
  }
  for (const invalid of [
    "",
    "ab",
    "MJBarbearia",
    "-mj",
    "mj-",
    "mj--barbearia",
    "barbearia do ze",
    "barbearia_ze",
    "zé",
    "a".repeat(41),
  ]) {
    assert.equal(slugValido(invalid), false, `"${invalid}" deveria ser inválido`);
  }
  ok("formato do slug: minúsculas, dígitos e hífen, 3 a 40");

  assert.equal(sugerirSlug("Barbearia do Zé"), "barbearia-do-ze");
  assert.equal(sugerirSlug("  MJ  Barbearia!! "), "mj-barbearia");
  ok("sugerirSlug normaliza acento, caixa e espaços");

  // ------------------------------------------------ tenant pelo slug (demo)
  const platform = new DemoPlatform();

  const mj = await findTenantBySlug(platform, "mjbarbearia");
  assert.equal(mj?.id, seed.TENANT_ID);
  assert.equal(mj?.name, "MJ Barbearia");
  ok("/mjbarbearia resolve a MJ Barbearia");

  assert.equal((await findTenantBySlug(platform, "MJBarbearia"))?.id, seed.TENANT_ID);
  ok("slug é normalizado para minúsculas");

  assert.equal(await findTenantBySlug(platform, "mj-barbearia"), null);
  ok("slug antigo mj-barbearia não resolve mais");

  assert.equal(await findTenantBySlug(platform, "nao-existe"), null);
  assert.equal(await findTenantBySlug(platform, "%E0%A4%A"), null);
  ok("slug inexistente ou malformado dá null (404)");

  // Mesmo que alguém grave uma barbearia com slug reservado, ela não abre.
  const other: Tenant = {
    ...seed.tenant,
    id: "a0000000-0000-4000-8000-000000000099",
    slug: "admin",
    name: "Barbearia Intrusa",
  };
  const inactive: Tenant = {
    ...seed.tenant,
    id: "a0000000-0000-4000-8000-000000000098",
    slug: "fechada",
    name: "Barbearia Fechada",
    active: false,
  };
  const multi = new DemoPlatform([seed.tenant, other, inactive]);
  assert.equal(await findTenantBySlug(multi, "admin"), null);
  ok("tenant com slug reservado nunca é resolvido");

  assert.equal(await findTenantBySlug(multi, "fechada"), null);
  // A vitrine lista ativas; o filtro de slug reservado é da resolução de URL.
  assert.deepEqual(
    (await multi.listTenants()).map((t) => t.name),
    ["Barbearia Intrusa", "MJ Barbearia"],
  );
  ok("barbearia inativa não abre nem aparece na vitrine");

  // ------------------------------------------------------ isolamento
  const alheio = new DemoRepository("a0000000-0000-4000-8000-000000000099");
  await assert.rejects(alheio.getTenant(), /não encontrada/);
  assert.equal((await alheio.listServices()).length, 0);
  assert.equal((await alheio.listStaff()).length, 0);
  assert.equal((await alheio.listPlans()).length, 0);
  assert.equal((await alheio.getPlan(seed.plans[0].id)), null);
  ok("repositório de outro tenant não enxerga os dados da MJ");

  const daMj = new DemoRepository(seed.TENANT_ID);
  assert.equal((await daMj.listServices()).length, 7);
  ok("repositório da MJ continua com o catálogo");

  // --------------------------------------------------- carteirinha
  assert.equal(memberCodePrefix("MJ Barbearia"), "MJ");
  assert.equal(memberCodePrefix("Barbearia do Zé"), "ZE");
  assert.equal(memberCodePrefix("Navalha de Ouro"), "NO");
  assert.equal(memberCodePrefix("Barbearia"), "BAR");
  assert.equal(memberCodePrefix("!!!"), "MC");
  assert.match(generateMemberCode(memberCodePrefix("MJ Barbearia")), /^MJ-[A-Z0-9]{4}-[A-Z0-9]{3}$/);
  // Código antigo continua achável: a busca é pelo código inteiro.
  assert.equal((await daMj.getMembershipByCode("MJ-7K42-9QX"))?.memberCode, "MJ-7K42-9QX");
  ok("sigla da carteirinha sai do nome e não quebra códigos existentes");

  // --------------------------------------------------------- interessados
  const since = new Date(Date.now() - 60_000).toISOString();
  const before = await platform.countRecentLeads({ sinceISO: since, ipHash: "teste-ip" });
  await platform.createLead({
    nomeBarbearia: "Barbearia Teste",
    responsavel: "Fulano",
    whatsapp: "11999990000",
    cidade: "São Paulo",
    usuarios: 3,
    ipHash: "teste-ip",
    userAgent: null,
  });
  assert.equal(
    await platform.countRecentLeads({ sinceISO: since, ipHash: "teste-ip" }),
    before + 1,
  );
  assert.equal(
    await platform.countRecentLeads({ sinceISO: since, whatsapp: "11999990000" }),
    1,
  );
  ok("interesse gravado e contado por IP e WhatsApp (limite de envios)");

  console.log(checks.map((c) => `  ✓ ${c}`).join("\n"));
  console.log(`\n${checks.length} verificações de multi-barbearia passaram.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
