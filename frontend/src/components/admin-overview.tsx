"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

type Stats = {
  students: number;
  teachers: number;
  administrators: number;
  multipleChoiceInProgress: number;
  oralInProgress: number;
  multipleChoiceScheduled: number;
  oralScheduled: number;
  multipleChoiceCompleted: number;
  oralCompleted: number;
};

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api<Stats>("/api/admin/stats", { auth: true })
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof ApiError ? error.message : "Could not load the dashboard.",
        );
        setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <p className="text-sm text-muted-foreground">The dashboard totals could not be loaded.</p>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const students = stats.students;
  const teachers = stats.teachers;
  const administrators = stats.administrators;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Dashboard
        </p>
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
          Desk at a glance.
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
          How many students and teachers are on the desk, and how many exams
          are running as multiple choice or as an oral viva.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-serif text-2xl">People</CardTitle>
            <CardDescription>Accounts by role.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pt-6 sm:flex-row sm:items-center">
            <Donut
              slices={[
                { label: "Students", value: students, color: "var(--chart-1)" },
                { label: "Teachers", value: teachers, color: "var(--chart-2)" },
                { label: "Administrators", value: administrators, color: "var(--chart-3)" },
              ]}
            />
            <Legend
              items={[
                { label: "Students", value: students, color: "var(--chart-1)" },
                { label: "Teachers", value: teachers, color: "var(--chart-2)" },
                { label: "Administrators", value: administrators, color: "var(--chart-3)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-serif text-2xl">Exams in progress</CardTitle>
            <CardDescription>Sessions happening now.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Bars
              rows={[
                {
                  label: "Multiple choice",
                  value: stats.multipleChoiceInProgress,
                  color: "var(--chart-1)",
                },
                {
                  label: "Oral",
                  value: stats.oralInProgress,
                  color: "var(--chart-2)",
                },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="font-serif text-2xl">Exam pipeline</CardTitle>
          <CardDescription>
            Scheduled, in progress, and completed, for each format.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 pt-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium">Multiple choice</p>
            <Bars
              rows={[
                { label: "Scheduled", value: stats.multipleChoiceScheduled, color: "var(--chart-3)" },
                { label: "In progress", value: stats.multipleChoiceInProgress, color: "var(--chart-1)" },
                { label: "Completed", value: stats.multipleChoiceCompleted, color: "var(--chart-4)" },
              ]}
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Oral</p>
            <Bars
              rows={[
                { label: "Scheduled", value: stats.oralScheduled, color: "var(--chart-3)" },
                { label: "In progress", value: stats.oralInProgress, color: "var(--chart-2)" },
                { label: "Completed", value: stats.oralCompleted, color: "var(--chart-4)" },
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Donut({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let cursor = 0;
  const gradient =
    total === 0
      ? "var(--muted)"
      : `conic-gradient(${slices
          .map((slice) => {
            const start = cursor;
            cursor += (slice.value / total) * 100;
            return `${slice.color} ${start}% ${cursor}%`;
          })
          .join(", ")})`;

  return (
    <div
      className="relative size-44 shrink-0 rounded-full"
      style={{ background: gradient }}
      role="img"
      aria-label={slices.map((slice) => `${slice.label} ${slice.value}`).join(", ")}
    >
      <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-card">
        <div className="text-center">
          <p className="font-serif text-3xl tracking-tight">{total}</p>
          <p className="text-xs text-muted-foreground">people</p>
        </div>
      </div>
    </div>
  );
}

function Legend({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  return (
    <ul className="w-full space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: item.color }}
            />
            {item.label}
          </span>
          <span className="font-medium tabular-nums">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Bars({
  rows,
}: {
  rows: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span>{row.label}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.value / max) * 100}%`,
                background: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
