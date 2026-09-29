import type { Metadata } from "next";
import { StudentTests } from "@/components/student-tests";

export const metadata: Metadata = { title: "Tests" };

export default function StudentPage() {
  return <StudentTests />;
}
