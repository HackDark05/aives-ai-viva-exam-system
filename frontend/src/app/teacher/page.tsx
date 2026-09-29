import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";

export const metadata: Metadata = {
  title: "Teacher",
};

export default function TeacherPage() {
  return <HomeView portal="EXAMINER" />;
}
