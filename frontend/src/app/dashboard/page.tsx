"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Dashboard from "../../components/dashboard";

export default function DashboardRoute() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#09090b]">
      <Dashboard onClose={() => router.push("/")} />
    </div>
  );
}
