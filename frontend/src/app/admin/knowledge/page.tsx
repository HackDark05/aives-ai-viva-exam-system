import type { Metadata } from "next";
import { AdminKnowledge } from "@/components/admin-knowledge";

export const metadata: Metadata = {
  title: "Knowledge",
};

export default function AdminKnowledgePage() {
  return <AdminKnowledge />;
}
