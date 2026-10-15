"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon, Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/components/teacher/material-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "cn";

export type MaterialStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export type Material = {
  id: string;
  name: string;
  topic: string;
  status: MaterialStatus;
  error: string | null;
  sizeBytes: number;
  pageCount: number | null;
  chunks: number;
  createdAt: string;
};

type Preview = {
  document: Material;
  chunks: { label: string; text: string; truncated: boolean }[];
};

const POLL_MS = 3000;

function without<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

function isWorking(material: Material) {
  return material.status === "PENDING" || material.status === "PROCESSING";
}

/** Materials of one subject, with processing status, a preview of the extracted text, and topic editing. */
export function MaterialLibrary({
  subjectId,
  refreshKey,
  onChange,
}: {
  subjectId: string;
  /** Bump to reload, e.g. after an upload. */
  refreshKey: number;
  onChange?: (materials: Material[]) => void;
}) {
  const { t } = useLocale();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [previews, setPreviews] = useState<Record<string, Preview | "loading">>({});
  const [editing, setEditing] = useState<{ id: string; topic: string } | null>(null);

  const load = useCallback(async () => {
    const next = await api<Material[]>(`/api/teaching/documents?subjectId=${subjectId}`, { auth: true });
    setMaterials(next);
    setLoaded(true);
    onChange?.(next);
    return next;
  }, [subjectId, onChange]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function tick() {
      try {
        const next = await load();
        if (!cancelled && next.some(isWorking)) timer = setTimeout(tick, POLL_MS);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof ApiError ? error.message : t("teacher.bank.loadError"));
      }
    }
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load, refreshKey, t]);

  async function togglePreview(material: Material) {
    if (previews[material.id]) {
      setPreviews((current) => without(current, material.id));
      return;
    }
    setPreviews((current) => ({ ...current, [material.id]: "loading" }));
    try {
      const preview = await api<Preview>(`/api/teaching/documents/${material.id}/preview`, { auth: true });
      setPreviews((current) => ({ ...current, [material.id]: preview }));
    } catch (error) {
      setPreviews((current) => without(current, material.id));
      toast.error(error instanceof ApiError ? error.message : t("teacher.bank.loadError"));
    }
  }

  async function saveTopic() {
    if (!editing || !editing.topic.trim()) return;
    try {
      await api(`/api/teaching/documents/${editing.id}`, {
        method: "PATCH",
        auth: true,
        body: { topic: editing.topic.trim() },
      });
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("teacher.bank.loadError"));
    }
  }

  async function remove(material: Material) {
    if (!window.confirm(t("teacher.bank.materialDeleteConfirm", { name: material.name }))) return;
    try {
      await api(`/api/teaching/documents/${material.id}`, { method: "DELETE", auth: true });
      toast.success(t("teacher.bank.materialDeleted"));
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("teacher.bank.loadError"));
    }
  }

  if (!loaded) return null;
  if (materials.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("teacher.bank.materialEmpty")}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("teacher.bank.materialListTitle")}</p>
      <ul className="divide-y rounded-lg border">
        {materials.map((material) => {
          const preview = previews[material.id];
          return (
            <li key={material.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">{material.name}</p>
                  {editing?.id === material.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveTopic();
                      }}
                    >
                      <Input
                        aria-label={t("teacher.bank.materialTopic")}
                        value={editing.topic}
                        maxLength={255}
                        autoFocus
                        onChange={(event) => setEditing({ id: material.id, topic: event.target.value })}
                        className="h-8"
                      />
                      <Button type="submit" size="sm" disabled={!editing.topic.trim()}>
                        {t("teacher.bank.materialTopicSave")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        {t("teacher.bank.materialTopicCancel")}
                      </Button>
                    </form>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("teacher.bank.materialTopicLabel", { topic: material.topic })}
                      {" · "}
                      {formatBytes(material.sizeBytes)}
                      {material.status === "DONE"
                        ? ` · ${t("teacher.bank.materialChunks", { count: String(material.chunks) })}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={material.status} />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("teacher.bank.materialEditTopic")}
                    onClick={() => setEditing({ id: material.id, topic: material.topic })}
                  >
                    <PencilIcon aria-hidden />
                  </Button>
                  {material.status === "DONE" ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={preview ? t("teacher.bank.materialHidePreview") : t("teacher.bank.materialPreview")}
                      onClick={() => void togglePreview(material)}
                    >
                      {preview ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("teacher.bank.materialDelete")}
                    disabled={isWorking(material)}
                    onClick={() => void remove(material)}
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                </div>
              </div>
              {material.status === "FAILED" && material.error ? (
                <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{material.error}</p>
              ) : null}
              {preview === "loading" ? (
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label={t("teacher.common.loading")} />
              ) : preview ? (
                <div className="space-y-2 rounded-md bg-muted/40 p-2">
                  <p className="text-xs text-muted-foreground">
                    {t("teacher.bank.materialPreviewHint", {
                      shown: String(preview.chunks.length),
                      total: String(preview.document.chunks),
                    })}
                  </p>
                  {preview.chunks.map((chunk, index) => (
                    <div key={index} className="space-y-0.5">
                      <p className="text-xs font-medium">{chunk.label}</p>
                      <p className="whitespace-pre-wrap text-xs text-foreground/80">{chunk.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: MaterialStatus }) {
  const { t } = useLocale();
  const working = status === "PENDING" || status === "PROCESSING";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "DONE" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        status === "FAILED" && "bg-destructive/10 text-destructive",
        working && "bg-muted text-muted-foreground",
      )}
    >
      {working ? <Loader2Icon className="size-3 animate-spin" aria-hidden /> : null}
      {t(`teacher.bank.materialStatus.${status}`)}
    </span>
  );
}
