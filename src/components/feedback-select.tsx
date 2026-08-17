"use client";

import { useEffect, useState } from "react";

type FeedbackTemplate = {
  id: string;
  text: string;
  scoreLabel: string | null;
  minScore: number;
  maxScore: number;
};

export function FeedbackSelect({
  code,
  value,
  onChange,
  label,
}: {
  code: string;
  value: { templateId?: string; custom: string };
  onChange: (next: { templateId?: string; custom: string }) => void;
  label?: string;
}) {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/judge-slots/${code}/feedback-templates`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        setTemplates(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [code]);

  const selectedTemplate = templates.find((t) => t.id === value.templateId);

  return (
    <div className="flex flex-col gap-sm">
      {label && (
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">{label}</p>
      )}
      <select
        className="w-full border border-line bg-paper px-md py-sm text-body-sm text-ink"
        value={value.templateId ?? ""}
        onChange={(e) =>
          onChange({ custom: value.custom, templateId: e.target.value || undefined })
        }
      >
        <option value="">{loaded ? "No template" : "Loading feedback..."}</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.text}
            {t.scoreLabel ? ` — ${t.scoreLabel}` : ""}
          </option>
        ))}
      </select>
      {selectedTemplate ? (
        <p className="text-body-sm text-ink-muted">{selectedTemplate.text}</p>
      ) : null}
      <input
        className="w-full border border-line bg-paper px-md py-sm text-body-sm"
        placeholder="Or write your own feedback..."
        value={value.custom}
        maxLength={500}
        onChange={(e) => onChange({ custom: e.target.value, templateId: value.templateId })}
      />
    </div>
  );
}
