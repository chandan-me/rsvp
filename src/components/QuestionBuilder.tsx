"use client";

import { useState } from "react";
import { Plus, Trash2, HelpCircle, CheckSquare, ListOrdered, AlignLeft, Check, Loader2 } from "lucide-react";
import { RsvpQuestion, QuestionType } from "@/types/database";

interface QuestionBuilderProps {
  eventId: string;
  questions: RsvpQuestion[];
  onRefresh: () => void;
}

export function QuestionBuilder({ eventId, questions, onRefresh }: QuestionBuilderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("single_choice");
  const [isRequired, setIsRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("Option 1\nOption 2\nOption 3");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      let options: { label: string; value: string; order_index: number }[] | undefined;

      if (questionType === "single_choice" || questionType === "multiple_choice") {
        const lines = optionsText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        options = lines.map((label, idx) => ({
          label,
          value: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
          order_index: idx + 1,
        }));
      }

      const res = await fetch(`/api/events/${eventId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          question_type: questionType,
          is_required: isRequired,
          options,
        }),
      });

      if (res.ok) {
        setPrompt("");
        setIsAdding(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${eventId}/questions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  const getTypeIcon = (type: QuestionType) => {
    switch (type) {
      case "single_choice":
        return <ListOrdered className="h-4 w-4 text-sky-600" />;
      case "multiple_choice":
        return <CheckSquare className="h-4 w-4 text-indigo-600" />;
      case "boolean":
        return <Check className="h-4 w-4 text-emerald-600" />;
      default:
        return <AlignLeft className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Custom RSVP Questions</h3>
          <p className="text-xs text-slate-500">
            Collect dietary preferences, meal choices, session breakouts, or custom information from your guests.
          </p>
        </div>

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Question</span>
          </button>
        )}
      </div>

      {/* Add Question Card */}
      {isAdding && (
        <form
          onSubmit={handleAddQuestion}
          className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-xs space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-sky-100">
            <span className="text-sm font-semibold text-sky-900">New RSVP Question</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Question Prompt <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Do you have any dietary restrictions?"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Question Type
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="single_choice">Single Choice (Radio Buttons)</option>
                <option value="multiple_choice">Multiple Choice (Checkboxes)</option>
                <option value="text">Short Text Answer</option>
                <option value="textarea">Long Text / Paragraph</option>
                <option value="boolean">Yes / No Toggle</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span>Mandatory response (Required field)</span>
              </label>
            </div>
          </div>

          {(questionType === "single_choice" || questionType === "multiple_choice") && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Choices / Options (One per line)
              </label>
              <textarea
                rows={3}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Vegetarian&#10;Vegan&#10;Gluten-Free&#10;Standard"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-sky-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Question</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Existing Questions List */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <HelpCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No custom questions configured yet.</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Guests will only be asked for their contact details and attendance confirmation.
            </p>
          </div>
        ) : (
          questions.map((q, index) => (
            <div
              key={q.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{q.prompt}</span>
                    {q.is_required && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-medium text-rose-600 border border-rose-200/50">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 capitalize">
                      {getTypeIcon(q.question_type)}
                      {q.question_type.replace("_", " ")}
                    </span>
                    {q.options && q.options.length > 0 && (
                      <span>• {q.options.length} options ({q.options.map((o) => o.label).join(", ")})</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(q.id)}
                disabled={deletingId === q.id}
                title="Delete question"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
              >
                {deletingId === q.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
