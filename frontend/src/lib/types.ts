export type Role = "STUDENT" | "EXAMINER" | "ADMIN";

export const ROLES: Role[] = ["STUDENT", "EXAMINER", "ADMIN"];

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Student",
  EXAMINER: "Teacher",
  ADMIN: "Administrator",
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export type MeResponse = {
  user: User;
};
