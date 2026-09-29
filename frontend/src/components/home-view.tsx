"use client";

import Link from "next/link";
import { BookOpenIcon, ClipboardListIcon, Loader2Icon, MicIcon, ShieldIcon, SparklesIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { readTokenClaims } from "@/lib/auth";
import { useCurrentUser } from "@/lib/use-current-user";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeView() {
  const { user, signOut } = useCurrentUser();

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const firstName = user.name.split(" ")[0];
  const canOpenAdmin =
    user.role === "ADMIN" && readTokenClaims()?.role === "ADMIN";

  return (
    <div className="min-h-svh bg-background">
      <AppHeader user={user} onSignOut={signOut} />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <section className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Home
          </p>
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
            {greeting()}, {firstName}.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            This is your viva desk. Sessions, questions, and scores will live
            here as the exam modules come online.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <InsightCard
            icon={MicIcon}
            title="Upcoming vivas"
            value="—"
            note="No sessions scheduled yet"
          />
          <InsightCard
            icon={ClipboardListIcon}
            title="Completed"
            value="0"
            note="Results will collect here"
          />
          <InsightCard
            icon={SparklesIcon}
            title="Ready when you are"
            value="Exam hall"
            note="Question banks and scoring next"
          />
        </section>

        {user.role === "ADMIN" ? (
          <Card className="bg-card">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 font-serif text-2xl">
                <ShieldIcon className="size-5" />
                Administration
              </CardTitle>
              <CardDescription>
                {canOpenAdmin
                  ? "Roles and people live on the admin dashboard."
                  : "Sign out and sign in again so this session can open the admin dashboard."}
              </CardDescription>
            </CardHeader>
            {canOpenAdmin ? (
              <CardContent>
                <Link href="/admin" className={buttonVariants()}>
                  Open dashboard
                </Link>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        <Card className="bg-card">
          <CardHeader className="border-b">
            <CardTitle className="font-serif text-2xl">Viva sessions</CardTitle>
            <CardDescription>
              Assigned oral exams will appear in this list.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                <BookOpenIcon className="size-5 text-muted-foreground" />
              </div>
              <h2 className="font-serif text-xl">The hall is still quiet</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Once exam creation is added, candidates and examiners will open
                a viva from this table. Nothing is missing — this is the empty
                starting point.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  value,
  note,
}: {
  icon: typeof MicIcon;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <CardTitle className="font-serif text-3xl tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="text-sm text-muted-foreground">{note}</CardContent>
    </Card>
  );
}
