import { FourierExplorer } from "@/components/fourier/fourier-explorer";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-8">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-10">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.22),transparent_58%)] lg:block" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_320px] lg:items-end">
            <div className="max-w-4xl space-y-5">
              <p className="text-sm uppercase tracking-[0.45em] text-cyan-200/75">
                Fourier Series Visualizer
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Explore how rotating harmonics reconstruct a waveform.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                This interactive lab pairs animated epicycles, a live waveform
                reconstruction, and a frequency spectrum so you can inspect
                Fourier series in motion. Adjust parameters, switch between
                canonical periodic signals, and scrub through time to see the
                approximation unfold.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                  Animated epicycles
                </span>
                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-100">
                  Live spectrum
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
                  Adjustable parameters
                </span>
              </div>
            </div>

            <aside className="grid gap-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  What you see
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Every Fourier term behaves like a rotating vector. Their sum
                  traces the target signal, while the spectrum reveals which
                  harmonics dominate the approximation.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(129,140,248,0.1))] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-300">
                  Interaction tip
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Try increasing the term count on a square wave, then scrub the
                  time slider near a sharp edge to spot the Gibbs overshoot.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <FourierExplorer />
      </div>
    </main>
  );
}
