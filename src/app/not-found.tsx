import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-lg place-items-center px-4 text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">MJCLUB</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-3 text-muted">
          Esse endereço não existe ou a barbearia não está mais ativa no MJCLUB.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-gold-soft"
        >
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
