"use client";

import { useParams } from "next/navigation";
import LiveQuizEditor from "@/components/admin/live-quiz-editor";

export default function EditLiveQuizPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <LiveQuizEditor quizId={id} />;
}
