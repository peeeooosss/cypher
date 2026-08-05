export default function Home() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-md py-md md:px-xl">
        <p className="font-display text-title-md uppercase tracking-[-0.08em]">
          Call<span className="text-accent">/</span>Out
        </p>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">
          System 01 / Foundation
        </p>
      </header>

      <section className="grid min-h-[calc(100vh-73px)] grid-cols-1 md:grid-cols-[1fr_0.42fr]">
        <div className="flex flex-col justify-between border-b border-line px-md py-section md:border-b-0 md:border-r md:px-xl">
          <div>
            <p className="mb-lg font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
              Underground dance network
            </p>
            <h1 className="max-w-5xl font-display text-display-xl uppercase text-ink">
              The floor is
              <br />
              <span className="text-accent">calling.</span>
            </h1>
          </div>

          <div className="mt-section max-w-xl">
            <p className="text-body-md text-ink-muted">
              Find the next cypher. Enter the battle. Build your name. CallOut connects
              artists, organizers, judges, and the people who keep the floor alive.
            </p>
            <div className="mt-xl flex flex-wrap gap-sm">
              <span className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper">
                Coming soon
              </span>
              <span className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink">
                Phase 01
              </span>
            </div>
          </div>
        </div>

        <aside className="flex flex-col justify-end bg-paper-soft px-md py-xl md:px-lg">
          <div className="border-t border-line pt-md">
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">
              Built for the circle
            </p>
            <ul className="mt-lg space-y-md font-display text-title-md uppercase">
              <li className="flex justify-between border-b border-line pb-sm">
                <span>01</span>
                <span>Battle</span>
              </li>
              <li className="flex justify-between border-b border-line pb-sm">
                <span>02</span>
                <span>Market</span>
              </li>
              <li className="flex justify-between border-b border-line pb-sm">
                <span>03</span>
                <span>Live score</span>
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
