import { NextRequest, NextResponse } from "next/server";
import { questionService } from "@/lib/services/questionService";
import { rsvpQuestionSchema } from "@/lib/validations/rsvp";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const body = await req.json();
    const validated = rsvpQuestionSchema.partial().parse(body);
    const updated = await questionService.updateQuestion(questionId, validated);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, question: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update question" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const success = await questionService.deleteQuestion(questionId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete question" },
      { status: 500 }
    );
  }
}
