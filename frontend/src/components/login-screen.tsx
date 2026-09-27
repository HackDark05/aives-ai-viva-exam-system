"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import type { LoginResponse } from "@/lib/types";

const DEMO_ACCOUNTS = [
  {
    email: "jordan.h@example.net",
    password: "demo1234",
    role: "Administrator",
  },
  {
    email: "priya.s@example.net",
    password: "demo1234",
    role: "Examiner",
  },
  {
    email: "ivan.p@example.net",
    password: "demo1234",
    role: "Candidate",
  },
] as const;

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const result = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setSession(result.accessToken);
      toast.success(`Welcome back, ${result.user.name.split(" ")[0]}.`);
      router.replace("/");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to reach the AIVES API. Is the backend running?";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-[#0b1c33] text-stone-100 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 size-[28rem] rounded-full border border-amber-200/10" />
          <div className="absolute -left-8 -top-12 size-[22rem] rounded-full border border-amber-200/10" />
          <div className="absolute bottom-[-8rem] right-[-6rem] size-[26rem] rounded-full bg-amber-300/8 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px)",
              backgroundSize: "4.5rem 4.5rem",
            }}
          />
        </div>

        <div className="relative flex items-center gap-3">
          <BrandMark inverted />
          <div>
            <p className="font-serif text-2xl tracking-tight">AIVES</p>
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-100/70">
              AI Viva Exam System
            </p>
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <p className="font-serif text-4xl leading-tight tracking-tight xl:text-5xl">
            An oral exam should feel like a conversation, not a lottery.
          </p>
          <p className="max-w-sm text-sm leading-6 text-stone-300">
            Adaptive viva questions, consistent scoring, and a calm room for
            candidates and examiners.
          </p>
          <ul className="space-y-4 text-sm text-stone-300">
            {[
              "Questions that follow the candidate’s reasoning",
              "Shared rubrics instead of examiner drift",
              "A record of the viva, ready for review",
            ].map((item, index) => (
              <li key={item} className="flex gap-4">
                <span className="font-serif text-amber-200/90">
                  0{index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-stone-500">
          Built for departments that still believe in the viva.
        </p>
      </aside>

      <section className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[24.5rem]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div>
              <p className="font-serif text-xl leading-none">AIVES</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-muted-foreground">
                AI Viva Exam System
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Sign in
            </p>
            <h1 className="font-serif text-4xl tracking-tight">Enter the hall</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Use your department account to open the viva workspace.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ivan.p@example.net"
                  className="h-11 px-3"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 px-3 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
                <FieldDescription>
                  Passwords are at least 8 characters.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Checking credentials
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          <div className="mt-8 space-y-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Demo accounts
            </p>
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.email}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">{account.role}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.email}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-sm"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                >
                  Use
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
