"use client";

import { Inbox } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow p-16 text-center">
      <Inbox size={60} className="mx-auto text-slate-300" />

      <h2 className="mt-6 text-2xl font-bold text-slate-700">{title}</h2>

      <p className="mt-3 text-slate-500">{description}</p>
    </div>
  );
}
