import { db } from "./dbProvider";
import { RsvpQuestion, RsvpQuestionOption } from "@/types/database";
import { RsvpQuestionInput } from "@/lib/validations/rsvp";
import { generateProfessionalId } from "@/lib/utils";

export class QuestionService {
  public async getQuestions(
    eventId: string
  ): Promise<(RsvpQuestion & { options?: RsvpQuestionOption[] })[]> {
    const questions = db.questions.filter((q) => q.event_id === eventId);
    return questions.sort((a, b) => a.order_index - b.order_index);
  }

  public async addQuestion(
    eventId: string,
    input: RsvpQuestionInput
  ): Promise<RsvpQuestion & { options?: RsvpQuestionOption[] }> {
    const event = db.events.find((e) => e.id === eventId);
    const currentQuestions = db.questions.filter((q) => q.event_id === eventId);
    const orderIndex = input.order_index || currentQuestions.length + 1;
    const qId = generateProfessionalId(
      event?.title || "Event",
      event?.start_date,
      `Q${orderIndex}`
    );

    const options: RsvpQuestionOption[] = (input.options || []).map((opt, i) => ({
      id: generateProfessionalId(
        event?.title || "Event",
        event?.start_date,
        `OPT-${orderIndex}-${i + 1}`
      ),
      question_id: qId,
      label: opt.label,
      value: opt.value,
      order_index: opt.order_index || i + 1,
      created_at: new Date().toISOString(),
    }));

    const newQuestion: RsvpQuestion & { options?: RsvpQuestionOption[] } = {
      id: qId,
      event_id: eventId,
      prompt: input.prompt,
      question_type: input.question_type,
      is_required: input.is_required,
      order_index: orderIndex,
      created_at: new Date().toISOString(),
      options,
    };

    db.questions.push(newQuestion);
    return newQuestion;
  }

  public async updateQuestion(
    id: string,
    input: Partial<RsvpQuestionInput>
  ): Promise<(RsvpQuestion & { options?: RsvpQuestionOption[] }) | null> {
    const index = db.questions.findIndex((q) => q.id === id);
    if (index === -1) return null;

    const existing = db.questions[index];
    let updatedOptions = existing.options;

    if (input.options) {
      updatedOptions = input.options.map((opt, i) => ({
        id: `o${Date.now().toString(36)}_${i}`,
        question_id: id,
        label: opt.label,
        value: opt.value,
        order_index: opt.order_index || i + 1,
        created_at: new Date().toISOString(),
      }));
    }

    const updated: RsvpQuestion & { options?: RsvpQuestionOption[] } = {
      ...existing,
      prompt: input.prompt ?? existing.prompt,
      question_type: input.question_type ?? existing.question_type,
      is_required: input.is_required ?? existing.is_required,
      order_index: input.order_index ?? existing.order_index,
      options: updatedOptions,
    };

    db.questions[index] = updated;
    return updated;
  }

  public async deleteQuestion(id: string): Promise<boolean> {
    const initialLen = db.questions.length;
    db.questions = db.questions.filter((q) => q.id !== id);
    return db.questions.length < initialLen;
  }
}

export const questionService = new QuestionService();
