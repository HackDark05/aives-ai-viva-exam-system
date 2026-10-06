import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2Icon } from "lucide-react";
import { TeacherTests } from "@/components/teacher-tests";

export const metadata: Metadata = { title: "Start viva test" };

function TestsFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function TeacherTestsPage() {
  return (
    <Suspense fallback={<TestsFallback />}>
      <TeacherTests />
    </Suspense>
  );
}
