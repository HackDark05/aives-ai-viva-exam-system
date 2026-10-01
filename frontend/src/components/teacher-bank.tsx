"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

type Subject = { id: string; code: string; name: string };
type Rubric = { id: string; name: string; criteria: string; maxScore: number };
type Question = {
  id: string;
  subjectName: string;
  topic: string;
  prompt: string;
  bloom: string;
  rubricName: string;
  criteria: string;
  maxScore: number;
  status: string;
  source: string;
  sourceRef: string | null;
};

type DocumentFile = { id: string; name: string; chunks: number };

const BLOOM = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE"] as const;

export function TeacherBank() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [rubricId, setRubricId] = useState("");
  const [topic, setTopic] = useState("Oral reasoning");
  const [bloom, setBloom] = useState<(typeof BLOOM)[number]>("UNDERSTAND");
  const [prompt, setPrompt] = useState("");
  const [importText, setImportText] = useState("");
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [count, setCount] = useState(3);
  const [file, setFile] = useState<File | null>(null);

  async function reload() {
    const [nextSubjects, nextRubrics, nextQuestions] = await Promise.all([
      api<Subject[]>("/api/teaching/subjects", { auth: true }),
      api<Rubric[]>("/api/teaching/rubrics", { auth: true }),
      api<Question[]>("/api/teaching/questions", { auth: true }),
    ]);
    setSubjects(nextSubjects);
    setRubrics(nextRubrics);
    setQuestions(nextQuestions);
    setSubjectId((current) => current || nextSubjects[0]?.id || "");
    setRubricId((current) => current || nextRubrics[0]?.id || "");
    const chosen = subjectId || nextSubjects[0]?.id;
    if (chosen) {
      const files = await api<DocumentFile[]>(`/api/teaching/documents?subjectId=${chosen}`, { auth: true });
      setDocuments(files);
    }
  }

  useEffect(() => {
    reload().catch((error) => {
      toast.error(error instanceof ApiError ? error.message : "Could not load the question bank.");
    });
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/teaching/questions", {
        method: "POST",
        auth: true,
        body: { subjectId, rubricId, topic, bloom, prompt },
      });
      setPrompt("");
      toast.success("Question added to the bank.");
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save that question.");
    }
  }

  async function onImport(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await api<Question[]>("/api/teaching/questions/import", {
        method: "POST",
        auth: true,
        body: { subjectId, rubricId, topic, bloom, text: importText },
      });
      setImportText("");
      toast.success(`Imported ${created.length} questions.`);
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not import questions.");
    }
  }

  async function onMaterial(event: FormEvent) {
    event.preventDefault();
    if (!file || !subjectId) return;
    const body = new FormData();
    body.set("subjectId", subjectId);
    body.set("file", file);
    try {
      await api("/api/teaching/documents", { method: "POST", auth: true, body });
      setFile(null);
      toast.success("Document parsed, chunked, and stored for retrieval.");
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not read that file.");
    }
  }

  async function onGenerate() {
    try {
      const created = await api<Question[]>("/api/teaching/questions/generate", {
        method: "POST",
        auth: true,
        body: { subjectId, rubricId, topic, bloom, count },
      });
      toast.success(`${created.length} drafts are waiting for review.`);
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not draft questions.");
    }
  }

  async function review(question: Question, status: string, nextPrompt = question.prompt) {
    try {
      const updated = await api<Question>(`/api/teaching/questions/${question.id}`, {
        method: "PATCH",
        auth: true,
        body: { prompt: nextPrompt, bloom: question.bloom, status },
      });
      setQuestions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update that question.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Question bank</p>
        <h1 className="font-serif text-4xl tracking-tight">Questions and rubrics</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Write a question, import a list, or draft from course material. Drafts stay out of the official bank until you approve them. Each question carries a Bloom level and a rubric.
        </p>
      </section>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="font-serif text-2xl">Course documents</CardTitle>
          <CardDescription>
            Upload a PDF, DOCX, or PPTX. The file is stored, split into pages or slides, and embedded for retrieval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onMaterial}>
            <Input
              type="file"
              accept=".pdf,.docx,.pptx,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />
            <Button type="submit">Upload document</Button>
          </form>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {documents.map((document) => (
              <li key={document.id}>{document.name} · {document.chunks} chunks</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="font-serif text-2xl">New question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SharedFields
            subjects={subjects}
            rubrics={rubrics}
            subjectId={subjectId}
            rubricId={rubricId}
            topic={topic}
            bloom={bloom}
            onSubject={setSubjectId}
            onRubric={setRubricId}
            onTopic={setTopic}
            onBloom={setBloom}
          />
          <form className="space-y-3" onSubmit={onCreate}>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} required className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="Question prompt" />
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Add to bank</Button>
              <Button type="button" variant="outline" onClick={() => void onGenerate()}>
                Draft {count} from material
              </Button>
              <Input
                className="w-24"
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                aria-label="Number of questions"
              />
            </div>
          </form>
          <form className="space-y-3" onSubmit={onImport}>
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="One question per line" />
            <Button type="submit" variant="outline">Import lines</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="font-serif text-2xl">Bank</CardTitle>
          <CardDescription>Approve or reject drafts before they can be used in a test.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <ul className="divide-y">
            {questions.map((question) => (
              <li key={question.id} className="space-y-2 px-6 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <span>{question.status.replaceAll("_", " ")}</span>
                  <span>{question.source}</span>
                  <span>{question.bloom}</span>
                  <span>{question.subjectName}</span>
                </div>
                <p className="font-medium">{question.prompt}</p>
                <p className="text-sm text-muted-foreground">
                  {question.rubricName}: {question.criteria} (max {question.maxScore})
                  {question.sourceRef ? ` · ${question.sourceRef}` : ""}
                </p>
                {question.status === "PENDING_REVIEW" ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => void review(question, "APPROVED")}>
                      Approve
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void review(question, "REJECTED")}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function SharedFields({
  subjects,
  rubrics,
  subjectId,
  rubricId,
  topic,
  bloom,
  onSubject,
  onRubric,
  onTopic,
  onBloom,
}: {
  subjects: Subject[];
  rubrics: Rubric[];
  subjectId: string;
  rubricId: string;
  topic: string;
  bloom: (typeof BLOOM)[number];
  onSubject: (value: string) => void;
  onRubric: (value: string) => void;
  onTopic: (value: string) => void;
  onBloom: (value: (typeof BLOOM)[number]) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={subjectId} onChange={(event) => onSubject(event.target.value)}>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.code} — {subject.name}
          </option>
        ))}
      </select>
      <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={rubricId} onChange={(event) => onRubric(event.target.value)}>
        {rubrics.map((rubric) => (
          <option key={rubric.id} value={rubric.id}>
            {rubric.name}
          </option>
        ))}
      </select>
      <Input value={topic} onChange={(event) => onTopic(event.target.value)} placeholder="Topic" />
      <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={bloom} onChange={(event) => onBloom(event.target.value as (typeof BLOOM)[number])}>
        {BLOOM.map((level) => (
          <option key={level} value={level}>
            {level[0] + level.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
