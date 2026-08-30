/**
 * Diagnóstico de um projeto Supabase real. Só lê — não grava nada.
 *
 * Diz se o schema foi aplicado, se o catálogo foi semeado, se os usuários de
 * demonstração existem e, quando a chave pública é informada, se a RLS está
 * de fato barrando o visitante.
 *
 * Lê .env.local (ou as variáveis do ambiente):
 *   SUPABASE_URL  (ou NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (opcional, para checar a RLS)
 *
 * Uso: npm run check:remote
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Sem .env.local: seguimos com o que já estiver no ambiente.
  }
}

loadEnvLocal();

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copie .env.example para .env.local e preencha com Settings › API Keys.",
  );
  process.exit(1);
}

// Depois da guarda acima, os valores existem; fixa o tipo para o resto.
const projectUrl: string = url;

const db = createClient(projectUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pass: string[] = [];
const fail: string[] = [];
const note = (list: string[], msg: string) => list.push(msg);

/**
 * Conta as linhas de uma tabela. Devolve null quando ela não existe.
 *
 * Não usa `head: true` de propósito: nessa forma o PostgREST responde 204 sem
 * erro para tabela inexistente, e o diagnóstico diria "0 linhas" em vez de
 * "o schema não foi aplicado". Com corpo, o erro real aparece.
 */
async function count(table: string): Promise<number | null> {
  const { count: n, error } = await db
    .from(table)
    .select("id", { count: "exact" })
    .limit(1);
  if (error) return null;
  return n ?? 0;
}

async function expect(table: string, min: number, label: string) {
  const n = await count(table);
  if (n === null) {
    note(fail, `${label}: tabela "${table}" não existe — o schema não foi aplicado`);
  } else if (n < min) {
    note(fail, `${label}: ${n} linha(s), esperado pelo menos ${min}`);
  } else {
    note(pass, `${label}: ${n}`);
  }
}

async function main() {
  console.log(`Projeto: ${url}\n`);

  console.log("— schema e catálogo —");
  await expect("tenants", 1, "barbearias");
  await expect("services", 7, "serviços");
  await expect("staff", 3, "profissionais");
  await expect("work_schedules", 14, "faixas de horário");
  await expect("plans", 3, "planos do clube");
  await expect("partners", 6, "parceiros");
  await expect("offers", 6, "ofertas");

  // Tabelas que existem mas nascem vazias: só confirmamos que foram criadas.
  for (const t of ["appointments", "memberships", "redemptions", "profiles"]) {
    const n = await count(t);
    if (n === null) note(fail, `tabela "${t}" não existe`);
    else note(pass, `tabela "${t}" criada (${n} linha(s))`);
  }

  console.log([...pass, ...fail].map((m) => `  ${m}`).join("\n"));

  console.log("\n— usuários de demonstração (opcional) —");
  const demo = await db
    .from("memberships")
    .select("member_code")
    .eq("member_code", "MJ-7K42-9QX")
    .maybeSingle();
  console.log(
    demo.data
      ? "  aplicados — as áreas logadas têm dados para demonstrar"
      : "  não aplicados — normal, e recomendado em produção",
  );

  console.log("\n— RLS vista de fora —");
  if (!publicKey) {
    console.log(
      "  pulado. Para checar, ponha NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local.",
    );
  } else {
    // Com a chave pública somos um visitante qualquer: é assim que a internet
    // enxerga o banco, e é o teste que mais importa antes de ir para o ar.
    const anon = createClient(projectUrl, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const vitrine = await anon.from("services").select("id");
    const privado = await anon.from("memberships").select("id");

    if (vitrine.error || (vitrine.data?.length ?? 0) === 0) {
      note(fail, "o visitante NÃO lê o catálogo — a vitrine ficaria vazia");
    } else {
      note(pass, `o visitante lê ${vitrine.data!.length} serviço(s)`);
      console.log(`  ✓ o visitante lê ${vitrine.data!.length} serviço(s)`);
    }

    if ((privado.data?.length ?? 0) > 0) {
      note(fail, "GRAVE: o visitante está lendo assinaturas — a RLS não está protegendo");
    } else {
      note(pass, "o visitante não lê assinaturas");
      console.log("  ✓ o visitante não lê assinaturas — RLS protegendo");
    }
  }

  console.log(
    fail.length === 0
      ? "\nTudo certo: o projeto está pronto para o app apontar para ele."
      : `\n${fail.length} problema(s):\n` + fail.map((m) => `  ✗ ${m}`).join("\n"),
  );
  process.exit(fail.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nNão consegui falar com o projeto:", error?.message ?? error);
  process.exit(1);
});
