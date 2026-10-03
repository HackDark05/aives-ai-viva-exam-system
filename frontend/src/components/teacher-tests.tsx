"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

type Subject = { id: string; name: string; code: string };
type Question = { id: string; prompt: string; status: string; bloom: string };

export function TeacherTests() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("ORAL");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api<Subject[]>("/api/teaching/subjects", { auth: true }),
      api<Question[]>("/api/teaching/questions?status=APPROVED", { auth: true }),
    ])
      .then(([nextSubjects, nextQuestions]) => {
        setSubjects(nextSubjects);
        setQuestions(nextQuestions);
        setSubjectId(nextSubjects[0]?.id ?? "");
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Could not load tests.");
      });
  }, []);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onStart(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/teaching/exams", {
        method: "POST",
        auth: true,
        body: { title, format, subjectId, questionIds: selected },
      });
      setTitle("");
      setSelected([]);
      toast.success("The test is in progress.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not start the test.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Tests</p>
        <h1 className="font-serif text-4xl tracking-tight">Start a test</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Choose an approved oral or multiple-choice paper. Students can enter it while it is in progress.
        </p>
      </section>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="font-serif text-2xl">New session</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onStart}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Session title" required />
            <div className="grid gap-3 md:grid-cols-2">
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>
                ))}
              </select>
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={format} onChange={(event) => setFormat(event.target.value)}>
                <option value="ORAL">Oral</option>
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
              </select>
            </div>
            <ul className="space-y-2">
              {questions.map((question) => (
                <li key={question.id}>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={selected.includes(question.id)} onChange={() => toggle(question.id)} />
                    <span>{question.prompt}</span>
                  </label>
                </li>
              ))}
            </ul>
            <Button type="submit">Start test</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}