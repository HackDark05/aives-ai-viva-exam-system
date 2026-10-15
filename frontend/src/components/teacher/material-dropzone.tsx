"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FileUpIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { cn } from "cn";

const ACCEPT = ".pdf,.docx,.pptx,application/pdf";
const EXTENSIONS = new Set(["pdf", "docx", "pptx"]);
/** Keep in sync with DOCUMENTS_MAX_SIZE on the API (default 25MB). */
export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024;

function isAllowedFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (EXTENSIONS.has(ext)) return true;
  return (
    file.type === "application/pdf" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sameFile(a: File, b: File) {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

export function MaterialDropzone({
  id: idProp,
  files,
  onFilesChange,
  disabled,
  label,
  dropTitle,
  dropHint,
  dropActive,
  invalidTypeMessage,
  tooLargeMessage,
  removeLabel,
}: {
  id?: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  label: string;
  dropTitle: string;
  dropHint: string;
  dropActive: string;
  invalidTypeMessage: string;
  tooLargeMessage: (name: string) => string;
  removeLabel: (name: string) => string;
}) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (files.length === 0 && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [files]);

  const addFiles = useCallback(
    (picked: File[]) => {
      const accepted: File[] = [];
      for (const next of picked) {
        if (!isAllowedFile(next)) {
          toast.error(invalidTypeMessage);
          continue;
        }
        if (next.size > MAX_MATERIAL_BYTES) {
          toast.error(tooLargeMessage(next.name));
          continue;
        }
        if (!files.some((file) => sameFile(file, next))) accepted.push(next);
      }
      if (accepted.length > 0) onFilesChange([...files, ...accepted]);
    },
    [files, invalidTypeMessage, onFilesChange, tooLargeMessage],
  );

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function onDragEnter(event: React.DragEvent) {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragLeave(event: React.DragEvent) {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    if (disabled) return;
    event.dataTransfer.dropEffect = "copy";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled) return;
    addFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={dropTitle}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn(
          "relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          "hover:border-ring/60 hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          dragging && "border-primary bg-primary/5",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          !dragging && "border-border",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={onInputChange}
        />
        {dragging ? (
          <>
            <UploadCloudIcon className="size-8 text-primary" aria-hidden />
            <p className="text-sm font-medium text-primary">{dropActive}</p>
          </>
        ) : (
          <>
            <FileUpIcon className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{dropTitle}</p>
            <FieldDescription className="max-w-sm">{dropHint}</FieldDescription>
          </>
        )}
      </div>
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex max-w-full items-center gap-1 rounded-md bg-muted py-1 pl-2 pr-1 text-xs font-medium"
            >
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-background disabled:opacity-50"
                aria-label={removeLabel(file.name)}
                disabled={disabled}
                onClick={() => onFilesChange(files.filter((other) => !sameFile(other, file)))}
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  );
}
