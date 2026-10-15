"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { MaterialDropzone } from "@/components/teacher/material-dropzone";
import { MaterialLibrary, type Material } from "@/components/teacher/material-library";
import { TeacherPageHeader } from "@/components/teacher/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n/locale-provider";

type Subject = { id: string; code: string; name: string };

export function CreateSubjectView() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [materialTopic, setMaterialTopic] = useState("");
  const [libraryKey, setLibraryKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [materialCount, setMaterialCount] = useState<number | null>(null);

  const onMaterialsChange = useCallback((materials: Material[]) => {
    setMaterialCount(materials.filter((material) => material.status === "DONE").length);
  }, []);

  const draftFromAiHref = subjectId
    ? `/teacher/tests?subjectId=${encodeURIComponent(subjectId)}#draft-from-ai`
    : "/teacher/tests#draft-from-ai";

  async function reloadSubjects(selectId?: string) {
    const nextSubjects = await api<Subject[]>("/api/teaching/subjects", { auth: true });
    setSubjects(nextSubjects);
    setSubjectId((current) => selectId || current || nextSubjects[0]?.id || "");
  }

  useEffect(() => {
    let cancelled = false;
    api<Subject[]>("/api/teaching/subjects", { auth: true })
      .then((nextSubjects) => {
        if (cancelled) return;
        setSubjects(nextSubjects);
        setSubjectId((current) => current || nextSubjects[0]?.id || "");
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof ApiError ? error.message : t("teacher.bank.loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function onCreateSubject(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await api<Subject>("/api/teaching/subjects", {
        method: "POST",
        auth: true,
        body: { code: subjectCode, name: subjectName },
      });
      setSubjectCode("");
      setSubjectName("");
      toast.success(t("teacher.bank.subjectCreated"));
      await reloadSubjects(created.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("teacher.bank.loadError"));
    }
  }

  async function onMaterial(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0 || !subjectId) return;
    setUploading(true);
    const failed: File[] = [];
    for (const file of files) {
      const body = new FormData();
      body.set("subjectId", subjectId);
      if (materialTopic.trim()) body.set("topic", materialTopic.trim());
      body.set("file", file);
      try {
        await api("/api/teaching/documents", { method: "POST", auth: true, body });
      } catch (error) {
        failed.push(file);
        toast.error(`${file.name}: ${error instanceof ApiError ? error.message : t("teacher.bank.loadError")}`);
      }
    }
    const queued = files.length - failed.length;
    if (queued > 0) {
      toast.success(t("teacher.bank.materialQueued", { count: String(queued) }));
    }
    setFiles(failed);
    setLibraryKey((key) => key + 1);
    setUploading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-label={t("teacher.common.loading")} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <TeacherPageHeader
        eyebrow={t("nav.teacher.createSubject")}
        title={t("teacher.bank.subjectTitle")}
        description={t("teacher.bank.subjectDesc")}
        breadcrumbs={[
          { href: "/teacher", label: t("nav.teacher.overview") },
          { label: t("nav.teacher.createSubject") },
        ]}
      />

      <Card>
        <CardContent className="space-y-6 pt-6">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onCreateSubject}>
            <Field className="flex-1">
              <FieldLabel htmlFor="subject-code">{t("teacher.bank.codePlaceholder")}</FieldLabel>
              <Input
                id="subject-code"
                value={subjectCode}
                onChange={(event) => setSubjectCode(event.target.value)}
                required
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor="subject-name">{t("teacher.bank.namePlaceholder")}</FieldLabel>
              <Input
                id="subject-name"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                required
              />
            </Field>
            <Button type="submit">{t("teacher.bank.createSubject")}</Button>
          </form>

          <form className="space-y-3" onSubmit={onMaterial}>
            <Field>
              <FieldLabel htmlFor="material-subject">{t("teacher.common.subject")}</FieldLabel>
              <select
                id="material-subject"
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                required
              >
                {subjects.length === 0 ? (
                  <option value="">{t("teacher.bank.createSubjectFirst")}</option>
                ) : null}
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} — {subject.name}
                  </option>
                ))}
              </select>
            </Field>
            <MaterialDropzone
              id="material-file"
              files={files}
              onFilesChange={setFiles}
              disabled={!subjectId || uploading}
              label={t("teacher.bank.dropzoneLabel")}
              dropTitle={t("teacher.bank.dropzoneTitle")}
              dropHint={t("teacher.bank.dropzoneHint")}
              dropActive={t("teacher.bank.dropzoneActive")}
              invalidTypeMessage={t("teacher.bank.dropzoneInvalidType")}
              tooLargeMessage={(name) => t("teacher.bank.dropzoneTooLarge", { name })}
              removeLabel={(name) => t("teacher.bank.dropzoneRemove", { name })}
            />
            <Field>
              <FieldLabel htmlFor="material-topic">{t("teacher.bank.materialTopic")}</FieldLabel>
              <Input
                id="material-topic"
                value={materialTopic}
                maxLength={255}
                onChange={(event) => setMaterialTopic(event.target.value)}
                placeholder={t("teacher.bank.materialTopicPlaceholder")}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!subjectId || files.length === 0 || uploading}>
                {uploading ? t("teacher.common.loading") : t("teacher.bank.importMaterial")}
              </Button>
              {subjectId && materialCount !== null && materialCount > 0 ? (
                <Link
                  href={draftFromAiHref}
                  className={cn(buttonVariants({ variant: "secondary" }), "inline-flex items-center gap-2")}
                >
                  <SparklesIcon className="size-4" aria-hidden />
                  {t("teacher.bank.draftQuestionsFromMaterial")}
                </Link>
              ) : (
                <Button type="button" variant="secondary" disabled className="inline-flex items-center gap-2">
                  <SparklesIcon className="size-4" aria-hidden />
                  {t("teacher.bank.draftQuestionsFromMaterial")}
                </Button>
              )}
            </div>
            {subjectId && materialCount === 0 ? (
              <p className="text-xs text-muted-foreground">{t("teacher.bank.draftAiNeedsMaterial")}</p>
            ) : null}
          </form>
          {subjectId ? (
            <MaterialLibrary subjectId={subjectId} refreshKey={libraryKey} onChange={onMaterialsChange} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
