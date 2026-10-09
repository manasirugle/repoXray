"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, Check, ChevronRight, CircleHelp, Database, Shield, Sun } from "lucide-react";
import { evaluationData } from "@/config/evaluation";

export default function AccuracyDashboard() {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", localStorage.getItem("theme") === "dark");
  }, []);

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };

  const { architecture, rag, security } = evaluationData;
  const circumference = 2 * Math.PI * 72;
  const scoreOffset = circumference * (1 - evaluationData.preliminaryScore / 100);

  return (
    <div className="min-h-screen flex text-white" style={{ backgroundColor: "var(--bg-deep)" }}>
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-glass" style={{ backgroundColor: "var(--bg-surface)" }}>
        <Link href="/" className="flex items-center gap-3 border-b border-glass px-5 py-5" aria-label="RepoXray home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-violet-500 text-lg font-black text-white">Ω</span>
          <span className="text-sm font-extrabold tracking-tight text-white">REPO<span className="text-violet-500">XRAY</span></span>
        </Link>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-secondary hover:bg-white/5 hover:text-white transition-colors"><ArrowLeft size={16} />Dashboard</Link>
          <Link href="/accuracy" aria-current="page" className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2.5 text-sm font-semibold text-violet-500"><BarChart3 size={16} />Accuracy</Link>
        </nav>
        <div className="border-t border-glass p-4 text-[11px] text-muted">RepoXray model evaluation</div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-glass px-4 py-3 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-white md:hidden"><ArrowLeft size={15} />RepoXray</Link>
          <div className="hidden md:block text-xs text-muted">System evaluation <ChevronRight size={12} className="inline mx-1" /> <span className="text-secondary">Accuracy</span></div>
          <button onClick={toggleTheme} className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-glass text-secondary hover:text-white" aria-label="Toggle color theme" title="Toggle color theme">
            <Sun size={16} />
          </button>
        </header>

        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-9">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-violet-500"><Activity size={15} /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Accuracy &amp; Evaluation</span></div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">RepoXray model/system evaluation</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-secondary">How well does RepoXray perform according to our evaluation dataset? These global results are the same regardless of which repository you analyze.</p>
          </div>

          <section className="glass-panel relative overflow-hidden p-5 md:p-8" aria-labelledby="score-heading">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative grid items-center gap-6 md:grid-cols-[minmax(220px,0.8fr)_1.2fr] md:gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="relative h-48 w-48" role="img" aria-label={`${evaluationData.preliminaryScore}% preliminary evaluation score`}>
                  <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
                    <circle cx="90" cy="90" r="72" fill="none" stroke="currentColor" className="text-black/5 dark:text-white/10" strokeWidth="12" />
                    <circle cx="90" cy="90" r="72" fill="none" stroke="url(#scoreGradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={scoreOffset} />
                    <defs><linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-black tracking-tight text-white">{evaluationData.preliminaryScore.toFixed(2)}%</span><span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">Preliminary score</span></div>
                </div>
                <h2 id="score-heading" className="mt-2 text-base font-bold text-white">Preliminary Evaluation Score</h2>
              </div>
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/5 px-3 py-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-300"><Database size={13} />Global evaluation · {evaluationData.repositoriesEvaluated} repositories</div>
                <p className="text-sm leading-relaxed text-secondary">This preliminary score averages Architecture Fact Coverage and RAG QA Accuracy. Security evaluation is excluded because the available dataset had no positive security ground truth.</p>
                <div className="rounded-xl border border-glass bg-white/40 p-4 dark:bg-white/[0.025]">
                  <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted"><span>Metric comparison</span><span>Scale: 0–100%</span></div>
                  <div className="space-y-4">
                    {[architecture, rag].map((metric) => <div key={metric.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="text-secondary">{metric.label}</span><span className="font-bold tabular-nums text-white">{metric.score.toFixed(metric.score === 100 ? 0 : 2)}%</span></div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]" role="progressbar" aria-label={metric.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={metric.score}><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500" style={{ width: `${metric.score}%` }} /></div>
                    </div>)}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-glass pt-2 text-[9px] text-muted"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2" aria-label="Evaluation metrics">
            <article className="glass-panel p-5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-300">Architecture understanding</p><h2 className="mt-1 text-lg font-bold text-white">{architecture.label}</h2></div><span className="text-2xl font-extrabold tabular-nums text-white">{architecture.score.toFixed(2)}%</span></div>
              <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]" role="img" aria-label={`${architecture.passed} passed, ${architecture.failed} failed, ${architecture.total} total`}><div className="bg-sky-500" style={{ width: `${(architecture.passed / architecture.total) * 100}%` }} /><div className="bg-rose-400" style={{ width: `${(architecture.failed / architecture.total) * 100}%` }} /></div>
              <div className="grid grid-cols-3 gap-2 text-center"><ResultCount label="Passed" count={architecture.passed} color="text-emerald-600 dark:text-emerald-300" /><ResultCount label="Failed" count={architecture.failed} color="text-rose-600 dark:text-rose-300" /><ResultCount label="Total facts" count={architecture.total} color="text-white" /></div>
              <div className="mt-5 border-t border-glass pt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Failed fact breakdown</p><div className="space-y-2">{architecture.failures.map((failure) => <div className="flex justify-between text-xs" key={failure.repository}><span className="text-secondary">{failure.repository}</span><span className="font-semibold text-white">{failure.count} {failure.count === 1 ? "fact" : "facts"}</span></div>)}</div></div>
            </article>

            <article className="glass-panel p-5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">Retrieval augmented QA</p><h2 className="mt-1 text-lg font-bold text-white">{rag.label}</h2></div><span className="text-2xl font-extrabold tabular-nums text-white">{rag.score}%</span></div>
              <div className="mb-3 h-3 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]" role="progressbar" aria-label="RAG QA success rate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rag.score}><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${rag.score}%` }} /></div>
              <div className="grid grid-cols-3 gap-2 text-center"><ResultCount label="Passed" count={rag.passed} color="text-emerald-600 dark:text-emerald-300" /><ResultCount label="Failed" count={rag.failed} color="text-rose-600 dark:text-rose-300" /><ResultCount label="Total questions" count={rag.total} color="text-white" /></div>
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-violet-500/15 bg-violet-500/5 p-3 text-[11px] leading-relaxed text-secondary"><CircleHelp size={14} className="mt-0.5 shrink-0 text-violet-500" />A question passed when the generated answer contained the required information and referenced an expected supporting file path.</div>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-[1.25fr_1fr]">
            <article className="glass-panel p-5 md:p-6">
              <h2 className="mb-4 text-sm font-bold text-white">Evaluation coverage</h2>
              <div className="grid grid-cols-3 gap-3">
                <CoverageStat label="Repositories evaluated" value={evaluationData.repositoriesEvaluated} />
                <CoverageStat label="Architecture facts" value={architecture.total} />
                <CoverageStat label="RAG questions" value={rag.total} />
              </div>
            </article>
            <article className="glass-panel border-amber-500/20 p-5 md:p-6">
              <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-300"><Shield size={16} /><h2 className="text-sm font-bold">Security Evaluation</h2></div>
              <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">{security.title}</span>
              <p className="mt-3 text-xs leading-relaxed text-secondary">{security.explanation}</p>
            </article>
          </section>

          <section className="glass-panel p-5 md:p-6">
            <h2 className="mb-2 text-sm font-bold text-white">How the score is calculated</h2>
            <p className="text-xs leading-relaxed text-secondary">({architecture.score.toFixed(2)}% + {rag.score}%) ÷ 2 = <strong className="text-white">{evaluationData.preliminaryScore.toFixed(2)}%</strong>. {evaluationData.scoreExplanation}</p>
            <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted"><Check size={13} className="mt-0.5 shrink-0 text-emerald-500" />Security F1 is not shown as 0% and is excluded from the preliminary score because the dataset contains no verified positive security findings.</p>
          </section>
          <footer className="pb-3 text-center text-[10px] text-muted">Static global evaluation results · independent of repository analysis</footer>
        </div>
      </main>
    </div>
  );
}

function ResultCount({ label, count, color }: { label: string; count: number; color: string }) {
  return <div className="rounded-lg border border-glass bg-white/30 px-2 py-3 dark:bg-white/[0.02]"><div className={`text-lg font-extrabold tabular-nums ${color}`}>{count}</div><div className="mt-0.5 text-[9px] text-muted">{label}</div></div>;
}

function CoverageStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-glass bg-white/30 p-3 dark:bg-white/[0.02]"><div className="text-xl font-extrabold tabular-nums text-white">{value}</div><p className="mt-1 text-[10px] leading-snug text-muted">{label}</p></div>;
}
