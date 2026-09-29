import type { Metadata } from "next";
import { AdminPeople } from "@/components/admin-people";

export const metadata: Metadata = {
  title: "People",
};

export default function AdminPeoplePage() {
  return <AdminPeople />;
}
