"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface InputModalProps {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function InputModal({
  title,
  placeholder,
  defaultValue = "",
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div
        className="bg-background border border-border rounded-lg shadow-lg p-4 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{title}</span>
          <button
            type="button"
            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
            onClick={onCancel}
          >
            <X size={14} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="w-full border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            className="px-3 py-1 text-sm rounded border border-border hover:bg-muted"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm rounded bg-primary text-primary-foreground hover:opacity-90"
            onClick={handleSubmit}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
