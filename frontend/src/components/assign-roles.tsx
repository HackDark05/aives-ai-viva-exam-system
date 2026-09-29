"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABEL, ROLES, type Role, type User } from "@/lib/types";

export function AssignRoles({
  currentUserId,
  users,
  onUsers,
  onAssigned,
}: {
  currentUserId: string;
  users: User[];
  onUsers: (update: (current: User[]) => User[]) => void;
  onAssigned?: (user: User) => void;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? users.filter((user) =>
        `${user.name} ${user.email}`.toLowerCase().includes(needle),
      )
    : users;

  async function assignRole(userId: string, role: Role) {
    let previous: User[] = users;
    onUsers((current) => {
      previous = current;
      return current.map((person) =>
        person.id === userId ? { ...person, role } : person,
      );
    });
    setSavingId(userId);

    try {
      const updated = await api<User>(`/api/users/${userId}/role`, {
        method: "PATCH",
        auth: true,
        body: { role },
      });
      onUsers((current) =>
        current.map((person) => (person.id === userId ? updated : person)),
      );
      toast.success(`${updated.name} is now ${ROLE_LABEL[updated.role]}.`);
      onAssigned?.(updated);
    } catch (error) {
      onUsers(() => previous);
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
        <CardTitle className="font-serif text-2xl">People</CardTitle>
        <CardDescription>
          JWT sessions carry the assigned role. People must sign in again for a
          new role to appear in their token.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b px-4 py-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            aria-label="Search people"
            className="max-w-sm"
          />
        </div>
        {visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No one matches that search.
          </p>
        ) : (
          <ul className="divide-y">
            {visible.map((user) => (
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
        )}
      </CardContent>
    </Card>
  );
}
