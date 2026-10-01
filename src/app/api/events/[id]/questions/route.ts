import { NextRequest, NextResponse } from "next/server";
import { questionService } from "@/lib/services/questionService";
import { rsvpQuestionSchema } from "@/lib/validations/rsvp";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questions = await questionService.getQuestions(id);
    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = rsvpQuestionSchema.parse(body);
    const question = await questionService.addQuestion(id, validated);
    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create question" },
      { status: 400 }
    );
  }
}
