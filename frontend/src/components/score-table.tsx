"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

export type Attempt = {
  id: string;
  examTitle: string;
  studentName: string;
  teacherName: string;
  score: number | null;
  status: string;
};

export function ScoreTable({
  path,
  canGrade = false,
}: {
  path: string;
  canGrade?: boolean;
}) {
  const [rows, setRows] = useState<Attempt[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    api<Attempt[]>(path, { auth: true })
      .then((next) => {
        setRows(next);
        setDrafts(
          Object.fromEntries(
            next.map((row) => [row.id, row.score == null ? "" : String(row.score)]),
          ),
        );
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Could not load scores.");
      });
  }, [path]);

  async function save(id: string) {
    const score = Number(drafts[id]);
    try {
      await api(`/api/teaching/scores/${id}`, {
        method: "PATCH",
        auth: true,
        body: { score },
      });
      toast.success("Score saved.");
      const next = await api<Attempt[]>(path, { auth: true });
      setRows(next);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save that score.");
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No scores yet.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{row.examTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.studentName}
                    {row.teacherName ? ` · ${row.teacherName}` : ""} · {row.status}
                  </p>
                </div>
                {canGrade ? (
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-24"
                      inputMode="numeric"
                      defaultValue={row.score ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [row.id]: event.target.value }))
                      }
                      placeholder="Score"
                    />
                    <Button type="button" size="sm" onClick={() => void save(row.id)}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <p className="font-serif text-2xl">{row.score ?? "—"}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
