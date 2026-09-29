"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { AssignRoles } from "@/components/assign-roles";
import { useAdminSession } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

export function AdminPeople() {
  const router = useRouter();
  const { user, setUser } = useAdminSession();
  const [people, setPeople] = useState<User[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    api<User[]>("/api/users", { auth: true })
      .then((result) => {
        if (!cancelled) setPeople(result);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          router.replace("/");
          return;
        }
        toast.error(
          error instanceof ApiError ? error.message : "Could not load people.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          People
        </p>
        <h1 className="font-serif text-4xl tracking-tight">Accounts and roles</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Each person listed here can sign in. A new role shows up in their
          session after they sign in again.
        </p>
      </section>

      {people ? (
        <AssignRoles
          currentUserId={user.id}
          users={people}
          onUsers={(update) => setPeople((current) => (current ? update(current) : current))}
          onAssigned={(updated) => {
            if (updated.id === user.id) {
              setUser(updated);
            }
          }}
        />
      ) : (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
