"use client";

import { Plus, Trash2 } from "lucide-react";
import { DapAnTracNghiem } from "@/types/questions-bank";

interface Props {
  answers: DapAnTracNghiem[];
  setAnswers: (answers: DapAnTracNghiem[]) => void;

  correctAnswer: string;
  setCorrectAnswer: (id: string) => void;
}

export default function MultipleChoiceEditor({
  answers,
  setAnswers,
  correctAnswer,
  setCorrectAnswer,
}: Props) {
  const updateAnswer = (id: string, value: string) => {
    setAnswers(
      answers.map((a) => (a.id === id ? { ...a, noiDung: value } : a)),
    );
  };

  const addAnswer = () => {
    const nextLetter = String.fromCharCode(65 + answers.length);

    setAnswers([
      ...answers,
      {
        id: nextLetter,
        noiDung: "",
      },
    ]);
  };

  const removeAnswer = (id: string) => {
    if (answers.length <= 2) return;

    const newAnswers = answers
      .filter((a) => a.id !== id)
      .map((a, index) => ({
        ...a,
        id: String.fromCharCode(65 + index),
      }));

    setAnswers(newAnswers);

    if (correctAnswer === id) {
      setCorrectAnswer("A");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Đáp án trắc nghiệm</h3>

        <button
          type="button"
          onClick={addAnswer}
          className="flex items-center gap-2 rounded-xl bg-[#0066FF] px-4 py-2 text-white font-semibold hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Thêm đáp án
        </button>
      </div>

      <div className="space-y-4">
        {answers.map((answer) => (
          <div
            key={answer.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#0066FF] transition"
          >
            <div className="flex items-center gap-4">
              <input
                type="radio"
                checked={correctAnswer === answer.id}
                onChange={() => setCorrectAnswer(answer.id)}
                className="w-5 h-5 accent-[#0066FF]"
              />

              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold">
                {answer.id}
              </div>

              <input
                value={answer.noiDung}
                onChange={(e) => updateAnswer(answer.id, e.target.value)}
                placeholder={`Nhập nội dung đáp án ${answer.id}`}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:border-[#0066FF]"
              />

              <button
                type="button"
                onClick={() => removeAnswer(answer.id)}
                className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-[#0066FF] font-semibold">
          ✓ Chọn nút radio bên trái để đánh dấu đáp án đúng.
        </p>
      </div>
    </div>
  );
}
