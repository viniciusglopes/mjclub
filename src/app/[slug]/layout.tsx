import type { Metadata } from "next";

import { BarbeariaFooter, BarbeariaHeader } from "@/components/barbearia-chrome";
import { brandStyle, requireTenant, resolveTenant } from "@/lib/tenant";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) return { title: "Barbearia não encontrada" };

  const description = tenant.tagline
    ? `${tenant.name} — ${tenant.tagline} Agende online e conheça o clube de benefícios.`
    : `Agende seu horário na ${tenant.name} e conheça o clube de benefícios.`;

  return {
    // `absolute`: o site da barbearia leva o nome dela, sem o "· MJCLUB" do
    // template da raiz. As páginas filhas usam o template daqui.
    title: {
      absolute: `${tenant.name} · agende online`,
      template: `%s · ${tenant.name}`,
    },
    description,
    alternates: { canonical: `/${tenant.slug}` },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: tenant.name,
      url: `/${tenant.slug}`,
      description,
    },
  };
}

/**
 * Site de uma barbearia em `mjclub.com.br/<slug>`. O tenant sai do slug a cada
 * requisição; slug reservado, inexistente ou de barbearia inativa dá 404.
 */
export default async function BarbeariaLayout({
  children,
  params,
}: Props & { children: React.ReactNode }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);

  return (
    <div style={brandStyle(tenant)} className="flex min-h-dvh flex-col">
      <BarbeariaHeader tenant={tenant} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <BarbeariaFooter tenant={tenant} />
    </div>
  );
}
