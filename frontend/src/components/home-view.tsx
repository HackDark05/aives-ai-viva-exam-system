"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenIcon,
  ClipboardListIcon,
  Loader2Icon,
  LogOutIcon,
  MicIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { ROLE_LABEL, type MeResponse, type User } from "@/lib/types";
import { AssignRoles } from "@/components/assign-roles";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function HomeView() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    api<MeResponse>("/api/auth/me", { auth: true })
      .then((result) => {
        if (!cancelled) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          return;
        }
        toast.error("Could not load your session.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function signOut() {
    clearSession();
    void api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const firstName = user.name.split(" ")[0];

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <BrandMark className="size-8 text-base" />
            <div className="leading-tight">
              <p className="font-serif text-lg">AIVES</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Viva workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {ROLE_LABEL[user.role]}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-lg px-1.5 text-sm hover:bg-muted sm:px-2.5">
                <Avatar size="sm">
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-40 truncate sm:inline">
                  {user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {user.email}
                    </p>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

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

        {user.role === "ADMIN" ? (
          <AssignRoles
            currentUserId={user.id}
            onAssigned={(updated) => {
              if (updated.id === user.id) {
                setUser(updated);
              }
            }}
          />
        ) : null}
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
