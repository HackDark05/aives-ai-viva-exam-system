import type { Metadata } from "next";
import { AdminPerformance } from "@/components/admin-performance";

export const metadata: Metadata = { title: "Performance" };

export default function AdminPerformancePage() {
  return <AdminPerformance />;
}
