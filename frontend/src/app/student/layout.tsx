import { PortalShell } from "@/components/portal-shell";

const NAV = [
  { href: "/student", label: "Tests", exact: true },
  { href: "/student/scores", label: "Scores" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell role="STUDENT" eyebrow="Student" nav={NAV}>
      {children}
    </PortalShell>
  );
}
