import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Empacota o servidor e só as dependências que ele usa em `.next/standalone`.
   * É o que permite a imagem Docker rodar `node server.js` sem `node_modules`
   * completo — some a maior parte do peso do container.
   */
  output: "standalone",
};

export default nextConfig;
