import type { NextConfig } from "next";

/**
 * Até 15/09 o site da MJ Barbearia morava na raiz. Agora a raiz é a página do
 * MJCLUB e cada barbearia tem o seu endereço; os links antigos (WhatsApp,
 * Instagram, favoritos) seguem funcionando com um 308 para o endereço novo.
 * A query string (`?servico=…`) é repassada pelo próprio Next.
 */
const LEGACY_SLUG = "mjbarbearia";

const nextConfig: NextConfig = {
  /**
   * Empacota o servidor e só as dependências que ele usa em `.next/standalone`.
   * É o que permite a imagem Docker rodar `node server.js` sem `node_modules`
   * completo — some a maior parte do peso do container.
   */
  output: "standalone",

  async redirects() {
    return [
      {
        source: "/agendar/confirmado/:id",
        destination: `/${LEGACY_SLUG}/agendar/confirmado/:id`,
        permanent: true,
      },
      { source: "/agendar", destination: `/${LEGACY_SLUG}/agendar`, permanent: true },
      {
        source: "/clube/parceiros",
        destination: `/${LEGACY_SLUG}/clube/parceiros`,
        permanent: true,
      },
      { source: "/clube", destination: `/${LEGACY_SLUG}/clube`, permanent: true },
    ];
  },
};

export default nextConfig;
