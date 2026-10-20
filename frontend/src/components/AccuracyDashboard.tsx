"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, Check, ChevronRight, CircleHelp, Database, Shield, Sun } from "lucide-react";
import { evaluationData } from "@/config/evaluation";
import { useCountUp } from "@/hooks/useCountUp";

const START_DELAY_MS = 300;
const SCORE_COUNT_DURATION_MS = 2400;
const METRIC_COUNT_DURATION_MS = 2000;
const METRIC_STAGGER_MS = 450;
const CARD_COUNT_DURATION_MS = 1400;
const FORMULA_STEP_DURATION_MS = 550;
const SCORE_RESULT_POP_DURATION_MS = 400;
const RING_GLOW_DURATION_MS = 700;
const FORMULA_HIGHLIGHT_DURATION_MS = 400;
const CALCULATING_DOTS_PULSE_DURATION_MS = 900;

const animationStyle = {
  backgroundColor: "var(--bg-deep)",
  "--accuracy-score-pop-duration": `${SCORE_RESULT_POP_DURATION_MS}ms`,
  "--accuracy-ring-glow-duration": `${RING_GLOW_DURATION_MS}ms`,
  "--accuracy-formula-highlight-duration": `${FORMULA_HIGHLIGHT_DURATION_MS}ms`,
  "--accuracy-dots-pulse-duration": `${CALCULATING_DOTS_PULSE_DURATION_MS}ms`,
} as CSSProperties;

export default function AccuracyDashboard() {
  const [animationStarted, setAnimationStarted] = useState(false);
  const [resultRevealed, setResultRevealed] = useState(false);
  const [formulaStep, setFormulaStep] = useState(0);
  const scoreSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", localStorage.getItem("theme") === "dark");
  }, []);

  useEffect(() => {
    const section = scoreSectionRef.current;
    if (!section || animationStarted) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      setAnimationStarted(true);
      setResultRevealed(true);
      setFormulaStep(3);
      return;
    }

    let startTimer: number | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(section);
      startTimer = window.setTimeout(() => setAnimationStarted(true), START_DELAY_MS);
    }, { threshold: 0.3 });
    observer.observe(section);
    return () => {
      observer.disconnect();
      if (startTimer !== undefined) window.clearTimeout(startTimer);
    };
  }, [animationStarted]);

  useEffect(() => {
    if (!animationStarted || resultRevealed) return;
    const timers = [1, 2, 3].map((step) => window.setTimeout(
      () => setFormulaStep(step),
      FORMULA_STEP_DURATION_MS * step,
    ));
    timers.push(window.setTimeout(() => setResultRevealed(true), SCORE_COUNT_DURATION_MS));
    return () => timers.forEach(window.clearTimeout);
  }, [animationStarted, resultRevealed]);

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };

  const { architecture, rag, security } = evaluationData;
  const circumference = 2 * Math.PI * 72;
  const animatedScore = useCountUp(evaluationData.preliminaryScore, animationStarted, SCORE_COUNT_DURATION_MS, 2, 0, "easeInOut");
  const scoreOffset = circumference * (1 - animatedScore / 100);
  const animatedArchitectureScore = useCountUp(architecture.score, animationStarted, METRIC_COUNT_DURATION_MS, 2);
  const animatedRagScore = useCountUp(rag.score, animationStarted, METRIC_COUNT_DURATION_MS, 0, METRIC_STAGGER_MS);
  const animatedArchitecturePassed = useCountUp(architecture.passed, animationStarted, CARD_COUNT_DURATION_MS);
  const animatedArchitectureFailed = useCountUp(architecture.failed, animationStarted, CARD_COUNT_DURATION_MS);
  const animatedRagPassed = useCountUp(rag.passed, animationStarted, CARD_COUNT_DURATION_MS);
  const animatedRagFailed = useCountUp(rag.failed, animationStarted, CARD_COUNT_DURATION_MS);
  const animatedArchitectureTotal = useCountUp(architecture.total, animationStarted, CARD_COUNT_DURATION_MS);
  const animatedRagTotal = useCountUp(rag.total, animationStarted, CARD_COUNT_DURATION_MS);
  const animatedArchitectureCardScore = useCountUp(architecture.score, animationStarted, CARD_COUNT_DURATION_MS, 2);
  const animatedRagCardScore = useCountUp(rag.score, animationStarted, CARD_COUNT_DURATION_MS, 0);
  const animatedFormulaArchitecture = useCountUp(architecture.score, animationStarted && formulaStep >= 1, FORMULA_STEP_DURATION_MS, 2);
  const animatedFormulaRag = useCountUp(rag.score, animationStarted && formulaStep >= 2, FORMULA_STEP_DURATION_MS, 0);
  const animatedFormulaScore = useCountUp(evaluationData.preliminaryScore, animationStarted && formulaStep >= 3, FORMULA_STEP_DURATION_MS, 2);

  return (
    <div className="accuracy-page min-h-screen flex text-white" style={animationStyle}>
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-glass" style={{ backgroundColor: "var(--bg-surface)" }}>
        <Link href="/" className="flex items-center gap-3 border-b border-glass px-5 py-5" aria-label="RepoXray home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-violet-500 text-lg font-black text-white">Ω</span>
          <span className="text-sm font-extrabold tracking-tight text-white">REPO<span className="text-violet-500">XRAY</span></span>
        </Link>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-secondary hover:bg-white/5 hover:text-white transition-colors"><ArrowLeft size={16} />Dashboard</Link>
          <Link href="/accuracy" aria-current="page" className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2.5 text-sm font-semibold text-violet-600 dark:text-violet-500"><BarChart3 size={16} />Accuracy</Link>
        </nav>
        <div className="accuracy-sidebar-note border-t border-glass p-4 text-muted">RepoXray model evaluation</div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-glass px-4 py-3 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-white md:hidden"><ArrowLeft size={15} />RepoXray</Link>
          <div className="hidden md:block text-xs text-muted accuracy-page-outer-muted">System evaluation <ChevronRight size={12} className="inline mx-1" /> <span className="text-secondary">Accuracy</span></div>
          <button onClick={toggleTheme} className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-glass text-secondary hover:text-white" aria-label="Toggle color theme" title="Toggle color theme">
            <Sun size={16} />
          </button>
        </header>

        <div className="accuracy-content mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-9">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-500"><Activity size={15} /><span className="accuracy-eyebrow">Accuracy &amp; Evaluation</span></div>
            <h1 className="accuracy-h1 tracking-tight text-white">RepoXray model/system evaluation</h1>
            <p className="accuracy-intro text-secondary">How well does RepoXray perform according to our evaluation dataset? These global results are the same regardless of which repository you analyze.</p>
          </div>

          <section ref={scoreSectionRef} className="glass-panel relative overflow-hidden p-5 md:p-8" aria-labelledby="score-heading">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative grid items-center gap-6 md:grid-cols-[minmax(220px,0.8fr)_1.2fr] md:gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="relative h-48 w-48" role="img" aria-label={`${evaluationData.preliminaryScore}% preliminary evaluation score`}>
                  <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
                    <circle cx="90" cy="90" r="72" fill="none" stroke="currentColor" className="text-black/5 dark:text-white/10" strokeWidth="12" />
                    <circle className={resultRevealed ? "accuracy-ring-revealed" : undefined} cx="90" cy="90" r="72" fill="none" stroke="url(#scoreGradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={scoreOffset} />
                    <defs><linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className={`accuracy-score tracking-tight text-white${resultRevealed ? " accuracy-score-revealed" : ""}`}><CountUpDisplay value={animatedScore} decimals={2} suffix="%" reserve="8ch" /></span><span className="accuracy-score-label mt-1 text-muted">{animationStarted && !resultRevealed ? <>Calculating<span className="accuracy-pulse-dots">...</span></> : "Preliminary score"}</span></div>
                </div>
                <h2 id="score-heading" className="accuracy-score-caption mt-2 text-white">Preliminary Evaluation Score</h2>
              </div>
              <div className="space-y-4">
                <div className="accuracy-meta inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/5 px-3 py-1.5 font-semibold text-sky-700 dark:text-sky-300"><Database size={13} />Global evaluation · {evaluationData.repositoriesEvaluated} repositories</div>
                <p className="accuracy-body text-secondary">This preliminary score averages Architecture Fact Coverage and RAG QA Accuracy. Security evaluation is excluded because the available dataset had no positive security ground truth.</p>
                <div className="rounded-xl border border-glass bg-white/40 p-4 dark:bg-white/[0.025]">
                  <div className="accuracy-eyebrow mb-3 flex items-center justify-between text-muted"><span>Metric comparison</span><span>Scale: 0–100%</span></div>
                  <div className="space-y-4">
                    {[architecture, rag].map((metric) => <div key={metric.label}>
                      <div className="accuracy-metric-row mb-1.5 flex items-center justify-between gap-3"><span className="text-secondary">{metric.label}</span><span className="font-bold tabular-nums text-white"><CountUpDisplay value={metric === architecture ? animatedArchitectureScore : animatedRagScore} decimals={metric === architecture ? 2 : 0} suffix="%" reserve="8ch" /></span></div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]" role="progressbar" aria-label={metric.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={metric.score}><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500" style={{ width: `${metric === architecture ? animatedArchitectureScore : animatedRagScore}%` }} /></div>
                    </div>)}
                  </div>
                  <div className="accuracy-ticks mt-3 flex justify-between border-t border-glass pt-2 text-muted"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2" aria-label="Evaluation metrics">
            <article className="accuracy-metric-card glass-panel p-5 md:p-6">
              <div className="accuracy-card-header accuracy-card-header--architecture mb-5 flex items-start justify-between gap-3"><div className="accuracy-card-heading"><p className="accuracy-eyebrow text-sky-700 dark:text-sky-300">Architecture understanding</p><h2 className="accuracy-card-title mt-1 font-bold text-white">{architecture.label}</h2></div><span className="accuracy-card-score font-extrabold tabular-nums text-white"><CountUpDisplay value={animatedArchitectureCardScore} decimals={2} suffix="%" reserve="8ch" /></span></div>
              <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]" role="img" aria-label={`${architecture.passed} passed, ${architecture.failed} failed, ${architecture.total} total`}><div className="bg-sky-500" style={{ width: `${(animatedArchitecturePassed / architecture.total) * 100}%` }} /><div className="bg-rose-400" style={{ width: `${(animatedArchitectureFailed / architecture.total) * 100}%` }} /></div>
              <div className="accuracy-counts grid grid-cols-3 gap-2 text-center"><ResultCount label="Passed" count={architecture.passed} animatedCount={animatedArchitecturePassed} color="text-emerald-600 dark:text-emerald-300" /><ResultCount label="Failed" count={architecture.failed} animatedCount={animatedArchitectureFailed} color="text-rose-600 dark:text-rose-300" /><ResultCount label="Total facts" count={architecture.total} animatedCount={animatedArchitectureTotal} color="text-white" /></div>
              <div className="mt-5 border-t border-glass pt-4"><p className="accuracy-eyebrow mb-2 text-muted">Failed fact breakdown</p><div className="space-y-2">{architecture.failures.map((failure) => <div className="accuracy-failure-row flex justify-between" key={failure.repository}><span className="text-secondary">{failure.repository}</span><span className="font-semibold text-white">{failure.count} {failure.count === 1 ? "fact" : "facts"}</span></div>)}</div></div>
            </article>

            <article className="accuracy-metric-card glass-panel p-5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-3"><div><p className="accuracy-eyebrow text-violet-600 dark:text-violet-300">Retrieval augmented QA</p><h2 className="accuracy-card-title mt-1 font-bold text-white">{rag.label}</h2></div><span className="accuracy-card-score font-extrabold tabular-nums text-white"><CountUpDisplay value={animatedRagCardScore} decimals={0} suffix="%" reserve="8ch" /></span></div>
              <div className="mb-3 h-3 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]" role="progressbar" aria-label="RAG QA success rate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rag.score}><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${(animatedRagPassed / rag.total) * 100}%` }} /></div>
              <div className="accuracy-counts grid grid-cols-3 gap-2 text-center"><ResultCount label="Passed" count={rag.passed} animatedCount={animatedRagPassed} color="text-emerald-600 dark:text-emerald-300" /><ResultCount label="Failed" count={rag.failed} animatedCount={animatedRagFailed} color="text-rose-600 dark:text-rose-300" /><ResultCount label="Total questions" count={rag.total} animatedCount={animatedRagTotal} color="text-white" /></div>
              <div className="accuracy-note mt-5 flex items-start gap-2 rounded-lg border border-violet-500/15 bg-violet-500/5 p-3 leading-relaxed text-secondary"><CircleHelp size={14} className="mt-0.5 shrink-0 text-violet-500" />A question passed when the generated answer contained the required information and referenced an expected supporting file path.</div>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-[1.25fr_1fr]">
            <article className="accuracy-coverage-panel glass-panel p-5 md:p-6">
              <h2 className="accuracy-section-title mb-4 font-bold text-white">Evaluation coverage</h2>
              <div className="accuracy-coverage-grid grid grid-cols-3 gap-3">
                <CoverageStat label="Repositories evaluated" value={evaluationData.repositoriesEvaluated} />
                <CoverageStat label="Architecture facts" value={architecture.total} />
                <CoverageStat label="RAG questions" value={rag.total} />
              </div>
            </article>
            <article className="glass-panel border-amber-500/20 p-5 md:p-6">
              <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-300"><Shield size={16} /><h2 className="accuracy-section-title font-bold">Security Evaluation</h2></div>
              <span className="accuracy-status inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-extrabold text-amber-700 dark:text-amber-300">{security.title}</span>
              <p className="accuracy-body mt-3 text-secondary">{security.explanation}</p>
            </article>
          </section>

          <section className="accuracy-calculation-panel glass-panel p-5 md:p-6">
            <h2 className="accuracy-section-title mb-2 font-bold text-white">How the score is calculated</h2>
            <p className="accuracy-body text-secondary">(<CountUpDisplay value={formulaStep >= 1 ? animatedFormulaArchitecture : 0} decimals={2} suffix={formulaStep >= 1 ? "%" : ""} placeholder={formulaStep < 1 ? "?" : undefined} reserve="6ch" /> + <CountUpDisplay value={formulaStep >= 2 ? animatedFormulaRag : 0} decimals={0} suffix={formulaStep >= 2 ? "%" : ""} placeholder={formulaStep < 2 ? "?" : undefined} reserve="5ch" />) / 2 = <strong className={resultRevealed ? "accuracy-formula-highlight text-white" : "text-white"}>{formulaStep >= 3 ? <CountUpDisplay value={animatedFormulaScore} decimals={2} suffix="%" reserve="8ch" /> : "?"}</strong>. {evaluationData.scoreExplanation}</p>
            <p className="accuracy-small-note accuracy-calc-note mt-3 flex items-start gap-2 leading-relaxed text-muted"><Check size={13} className="mt-0.5 shrink-0 text-emerald-500" />Security F1 is not shown as 0% and is excluded from the preliminary score because the dataset contains no verified positive security findings.</p>
          </section>
          <footer className="accuracy-small-note accuracy-page-outer-muted pb-3 text-center text-muted">Static global evaluation results · independent of repository analysis</footer>
        </div>
      </main>
    </div>
  );
}

function CountUpDisplay({ value, decimals, suffix = "", placeholder, reserve }: { value: number; decimals: number; suffix?: string; placeholder?: string; reserve?: string }) {
  return <span className="accuracy-countup" style={reserve ? { minWidth: reserve } : undefined}>{placeholder ?? `${value.toFixed(decimals)}${suffix}`}</span>;
}

function ResultCount({ label, count, animatedCount, color }: { label: string; count: number; animatedCount: number; color: string }) {
  return <div className="rounded-lg border border-glass bg-white/30 px-2 py-3 dark:bg-white/[0.02]"><div className={`accuracy-count-value font-extrabold tabular-nums ${color}`} aria-label={`${label}: ${count}`}><CountUpDisplay value={animatedCount} decimals={0} reserve="2ch" /></div><div className="accuracy-count-label mt-0.5 text-muted">{label}</div></div>;
}

function CoverageStat({ label, value }: { label: string; value: number }) {
  return <div className="accuracy-coverage-tile rounded-xl border border-glass bg-white/30 p-3 dark:bg-white/[0.02]"><div className="accuracy-coverage-value font-extrabold tabular-nums text-white">{value}</div><p className="accuracy-coverage-label mt-1 leading-snug text-muted">{label}</p></div>;
}
