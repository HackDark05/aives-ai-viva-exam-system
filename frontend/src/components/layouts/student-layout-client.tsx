"use client";

import { useMemo, type ReactNode } from "react";
import { PortalShell } from "@/components/portal-shell";
import { useLocale } from "@/lib/i18n/locale-provider";

export function StudentLayoutClient({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  // 1. Danh sách menu ở Sidebar bên trái (Đã bỏ My Profile)
  const nav = useMemo(
    () => [
      { href: "/student", label: t("nav.student.tests"), exact: true },
      { href: "/student/scores", label: t("nav.student.scores") },
      { href: "/student/history", label: t("nav.student.history") },
    ],
    [t],
  );

  // 2. Tùy chọn menu cho User Dropdown góc trên bên phải
  const userMenuItems = useMemo(
    () => [
      {
        href: "/student/profile",
        label: t("student_profile.edit") || t("nav.student.profile"),
      },
    ],
    [t],
  );

  return (
    <PortalShell 
      role="STUDENT" 
      eyebrow={t("roles.student")} 
      nav={nav}
      userMenuItems={userMenuItems} // Truyền menu vào dropdown góc phải
    >
      {children}
    </PortalShell>
  );
}