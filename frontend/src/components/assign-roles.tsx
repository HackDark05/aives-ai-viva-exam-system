"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABEL, ROLES, type Role, type User } from "@/lib/types";

export function AssignRoles({
  currentUserId,
  onAssigned,
}: {
  currentUserId: string;
  onAssigned?: (user: User) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api<User[]>("/api/users", { auth: true })
      .then((result) => {
        if (!cancelled) {
          setUsers(result);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : "Could not load people.";
        toast.error(message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function assignRole(userId: string, role: Role) {
    const previous = users;
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, role } : user)),
    );
    setSavingId(userId);

    try {
      const updated = await api<User>(`/api/users/${userId}/role`, {
        method: "PATCH",
        auth: true,
        body: { role },
      });
      setUsers((current) =>
        current.map((user) => (user.id === userId ? updated : user)),
      );
      toast.success(`${updated.name} is now ${ROLE_LABEL[updated.role]}.`);
      onAssigned?.(updated);
    } catch (error) {
      setUsers(previous);
      const message =
        error instanceof ApiError ? error.message : "Could not assign that role.";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card className="bg-card">
      <CardHeader className="border-b">
        <CardTitle className="font-serif text-2xl">Assign roles</CardTitle>
        <CardDescription>
          JWT sessions carry the assigned role. People must sign in again for a
          new role to appear in their token.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {user.name}
                  {user.id === currentUserId ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      you
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <select
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                value={user.role}
                disabled={savingId === user.id}
                onChange={(event) =>
                  void assignRole(user.id, event.target.value as Role)
                }
                aria-label={`Role for ${user.name}`}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
