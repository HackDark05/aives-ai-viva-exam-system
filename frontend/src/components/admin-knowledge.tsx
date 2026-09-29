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
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

type Passage = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

export function AdminKnowledge() {
  const [passages, setPassages] = useState<Passage[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    api<Passage[]>("/api/knowledge", { auth: true })
      .then((result) => {
        if (!cancelled) setPassages(result);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof ApiError ? error.message : "Could not load passages.",
        );
        setPassages([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const needle = query.trim().toLowerCase();
  const visible = (passages ?? []).filter((passage) =>
    needle
      ? `${passage.title} ${passage.content}`.toLowerCase().includes(needle)
      : true,
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Knowledge
        </p>
        <h1 className="font-serif text-4xl tracking-tight">Stored passages</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Text embedded for viva retrieval. Examiners and administrators add
          these passages.
        </p>
      </section>

      {passages === null ? (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card">
          <CardHeader className="border-b">
            <CardTitle className="font-serif text-2xl">
              {passages.length} passage{passages.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>
              Titles and text stored in the knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b px-4 py-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title or text"
                aria-label="Search passages"
                className="max-w-sm"
              />
            </div>
            {visible.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                {passages.length === 0
                  ? "No passages stored yet."
                  : "No passages match that search."}
              </p>
            ) : (
              <ul className="divide-y">
                {visible.map((passage) => (
                  <li key={passage.id} className="space-y-1 px-6 py-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <p className="font-medium">{passage.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(passage.createdAt)}
                      </p>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {passage.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}
