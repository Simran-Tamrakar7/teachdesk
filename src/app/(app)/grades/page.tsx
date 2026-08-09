"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GradesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/exams");
  }, [router]);
  return <p className="p-6 text-sm text-ink-muted">Redirecting to Exams & Assessments…</p>;
}
