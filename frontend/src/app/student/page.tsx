import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";

export const metadata: Metadata = {
  title: "Student",
};

export default function StudentPage() {
  return <HomeView portal="STUDENT" />;
}
