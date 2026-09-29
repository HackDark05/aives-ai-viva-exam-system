import { PortalShell } from "@/components/portal-shell";

const NAV = [
  { href: "/teacher", label: "Question bank", exact: true },
  { href: "/teacher/tests", label: "Start test" },
  { href: "/teacher/scores", label: "Scores" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell role="EXAMINER" eyebrow="Teacher" nav={NAV}>
      {children}
    </PortalShell>
  );
}
