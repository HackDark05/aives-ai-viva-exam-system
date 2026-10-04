import type { Metadata } from "next";
import { TeacherTests } from "@/components/teacher-tests";

export const metadata: Metadata = { title: "Start viva test" };

export default function TeacherTestsPage() {
  return <TeacherTests />;
}
