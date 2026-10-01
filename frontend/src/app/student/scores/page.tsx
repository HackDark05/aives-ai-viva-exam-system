import type { Metadata } from "next";
import { ScoreTable } from "@/components/score-table";

export const metadata: Metadata = { title: "My scores" };

export default function StudentScoresPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Scores</p>
        <h1 className="font-serif text-4xl tracking-tight">Your results</h1>
      </section>
      <ScoreTable path="/api/student/scores" />
    </div>
  );
}
