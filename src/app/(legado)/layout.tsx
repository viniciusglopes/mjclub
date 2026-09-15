import { BarbeariaFooter, BarbeariaHeader } from "@/components/barbearia-chrome";
import { getRepository, legacyTenantId } from "@/lib/db";
import { brandStyle } from "@/lib/tenant";

/**
 * `/entrar`, `/minha-conta`, `/admin` e `/parceiro` ainda são da MJ Barbearia:
 * o tenant vem de `MJCLUB_TENANT_ID` (ou do seed), como antes. Na fase 2 o login
 * real passa a dizer de qual barbearia é quem entrou, e estas rotas deixam de
 * precisar de um tenant fixo.
 */
export default async function LegadoLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getRepository(legacyTenantId()).getTenant();

  return (
    <div style={brandStyle(tenant)} className="flex min-h-dvh flex-col">
      <BarbeariaHeader tenant={tenant} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <BarbeariaFooter tenant={tenant} />
    </div>
  );
}
