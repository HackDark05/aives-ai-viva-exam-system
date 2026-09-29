import type { Role } from "@/lib/types";

export function homeForRole(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "EXAMINER") return "/teacher";
  return "/student";
}
