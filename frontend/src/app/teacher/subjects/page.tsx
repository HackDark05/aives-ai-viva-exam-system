import type { Metadata } from "next";
import { CreateSubjectView } from "@/components/teacher/create-subject-view";

export const metadata: Metadata = { title: "Create Subject" };

export default function CreateSubjectPage() {
  return <CreateSubjectView />;
}
