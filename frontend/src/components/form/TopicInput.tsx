"use client";

import { KeyboardEvent } from "react";
import { X } from "lucide-react";

interface Props {
  topics: string[];
  setTopics: (topics: string[]) => void;

  input: string;
  setInput: (value: string) => void;
}

export default function TopicInput({
  topics,
  setTopics,
  input,
  setInput,
}: Props) {
  const addTopic = () => {
    const value = input.trim();

    if (!value) return;

    if (topics.includes(value)) {
      setInput("");
      return;
    }

    setTopics([...topics, value]);
    setInput("");
  };

  const removeTopic = (topic: string) => {
    setTopics(topics.filter((t) => t !== topic));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTopic();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-800">Chủ đề</label>

      <div className="rounded-2xl border border-slate-300 p-3 bg-white focus-within:border-[#0066FF]">
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <div
              key={topic}
              className="flex items-center gap-2 rounded-full bg-blue-50 text-[#0066FF] border border-blue-200 px-3 py-1 text-sm font-semibold"
            >
              {topic}

              <button
                type="button"
                onClick={() => removeTopic(topic)}
                className="hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập chủ đề rồi nhấn Enter..."
            className="flex-1 min-w-[180px] outline-none py-1"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Nhấn Enter hoặc dấu phẩy để thêm chủ đề.
      </p>
    </div>
  );
}
