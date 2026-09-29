"use client";

import { ScoreTable } from "@/components/score-table";

export function AdminPerformance() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Performance</p>
        <h1 className="font-serif text-4xl tracking-tight">Scores across the desk</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Every student who entered a test, and the score their teacher recorded.
        </p>
      </section>
      <ScoreTable path="/api/admin/performance" />
    </div>
  );
}
