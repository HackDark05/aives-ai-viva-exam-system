import type { Metadata } from "next";
import { TeacherBank } from "@/components/teacher-bank";

export const metadata: Metadata = { title: "Question bank & rubric" };

export default function TeacherPage() {
  return <TeacherBank />;
}
