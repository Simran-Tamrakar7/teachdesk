"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ClassIdRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/classes?focus=${params.id}`);
  }, [params.id, router]);
  return <p className="p-6 text-ink-muted">Opening class pulse…</p>;
}
