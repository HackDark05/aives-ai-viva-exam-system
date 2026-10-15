"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  MicIcon,
  MicOffIcon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  TriangleAlertIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n/locale-provider";
import { useSTT } from "@/lib/stt-service";
import {
  checkZeroTTSStatus,
  detectSpeechLang,
  playTTS,
  stopTTS,
  ZEROTTS_VOICES,
  type SpeechLang,
} from "@/lib/tts-service";

type Session = {
  id: string;
  title: string;
  format: string;
  subjectName: string;
  teacherName: string;
  entered: boolean;
  score: number | null;
};

type Question = {
  id: string;
  prompt: string;
  bloom: string;
  criteria: string;
  maxScore: number;
};

type EvaluationItem = {
  turnId: string;
  questionId: string;
  score: number;
  isSufficient: boolean;
  feedback: string;
  followUpQuestion?: string | null;
  /** "AI", or "RULE_BASED" when the AI grader was unavailable and the score is provisional. */
  evaluator: "AI" | "RULE_BASED";
  fallbackReason?: string | null;
  criteria?: CriterionScore[];
};

type SubmitResult = {
  score: number;
  answeredQuestions: number;
  totalQuestions: number;
};

type CriterionScore = {
  name: string;
  points: number;
  maxPoints: number;
  comment: string;
};

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export function StudentTests() {
  const { t } = useLocale();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  function load() {
    api<Session[]>("/api/student/exams", { auth: true })
      .then(setSessions)
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Could not load tests.");
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function enter(session: Session) {
    setLoadingQuestions(true);
    try {
      await api(`/api/student/exams/${session.id}/enter`, { method: "POST", auth: true });
      const next = await api<Question[]>(`/api/student/exams/${session.id}/questions`, {
        auth: true,
      });
      setActiveSession(session);
      setQuestions(next);
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not enter that test.");
    } finally {
      setLoadingQuestions(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          {t("student.tests.eyebrow")}
        </p>
        <h1 className="font-serif text-4xl tracking-tight">{t("student.tests.title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {t("student.tests.lead")}
        </p>
      </section>

      {activeSession ? (
        <VivaExamRoom
          session={activeSession}
          questions={questions}
          onClose={() => {
            stopTTS();
            setActiveSession(null);
            load();
          }}
          onComplete={() => {
            stopTTS();
            setActiveSession(null);
            load();
          }}
        />
      ) : (
        <ul className="space-y-4">
          {sessions.map((session) => (
            <li key={session.id}>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="font-serif text-2xl">{session.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-6">
                  <p className="text-sm text-muted-foreground">
                    {session.teacherName} · {session.subjectName} ·{" "}
                    {session.format === "ORAL"
                      ? t("student.tests.oral")
                      : t("student.tests.multipleChoice")}
                    {session.score != null ? ` · ${t("student.tests.score")} ${session.score}` : ""}
                  </p>
                  <Button
                    type="button"
                    disabled={loadingQuestions}
                    onClick={() => void enter(session)}
                  >
                    {session.entered ? t("student.tests.open") : t("student.tests.enter")}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VivaExamRoom({
  session,
  questions,
  onClose,
  onComplete,
}: {
  session: Session;
  questions: Question[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const { t } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeVoice, setActiveVoice] = useState("maichi");
  const [isZeroTTSOnline, setIsZeroTTSOnline] = useState<boolean | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationItem>>({});
  const [evaluating, setEvaluating] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);

  // Follow-up state
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [evaluatingFollowUp, setEvaluatingFollowUp] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentEvaluation = currentQuestion ? evaluations[currentQuestion.id] : undefined;
  const speechLang: SpeechLang = detectSpeechLang(
    currentEvaluation?.followUpQuestion || currentQuestion?.prompt || ""
  );

  const {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error: sttError,
  } = useSTT({ lang: speechLang });

  useEffect(() => {
    let cancelled = false;
    checkZeroTTSStatus().then((online) => {
      if (!cancelled) setIsZeroTTSOnline(online);
    });
    return () => {
      cancelled = true;
      stopTTS();
    };
  }, []);

  function handleSpeak(text: string) {
    if (isSpeaking) {
      stopTTS();
      setIsSpeaking(false);
      return;
    }

    const lang = detectSpeechLang(text);
    setIsSpeaking(true);
    playTTS(text, {
      voice: activeVoice,
      lang,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  async function handleSendAnswer() {
    if (!currentQuestion) return;
    const answerText = transcript.trim();
    if (!answerText) {
      toast.error("Vui lòng nói câu trả lời trước khi gửi!");
      return;
    }

    stopListening();
    setEvaluating(true);

    try {
      const result = await api<EvaluationItem>(
        `/api/student/exams/${session.id}/questions/${currentQuestion.id}/answer`,
        {
          method: "POST",
          auth: true,
          body: { answer: answerText, durationMs: 15000 },
        }
      );

      setEvaluations((prev) => ({ ...prev, [currentQuestion.id]: result }));
      if (result.evaluator === "RULE_BASED") {
        toast.warning(t("student.tests.ruleBasedToast"));
      } else {
        toast.success("AI đã đánh giá câu trả lời của bạn.");
      }

      // Nếu có câu hỏi phụ, tự động phát âm thanh câu hỏi phụ!
      if (result.followUpQuestion) {
        setTimeout(() => {
          const followUpLang = detectSpeechLang(result.followUpQuestion || currentQuestion.prompt);
          const lead =
            followUpLang === "en-US"
              ? "You covered part of it. "
              : "Bạn đã trả lời được một phần. ";
          handleSpeak(lead + result.followUpQuestion);
        }, 500);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể gửi câu trả lời.");
    } finally {
      setEvaluating(false);
    }
  }

  async function handleSendFollowUp() {
    if (!currentQuestion || !currentEvaluation?.turnId) return;
    const answerText = (isListening ? transcript : followUpAnswer).trim();
    if (!answerText) {
      toast.error("Vui lòng nói hoặc nhập câu trả lời cho câu hỏi phụ!");
      return;
    }

    stopListening();
    setEvaluatingFollowUp(true);

    try {
      const result = await api<EvaluationItem>(
        `/api/student/exams/${session.id}/turns/${currentEvaluation.turnId}/answer`,
        {
          method: "POST",
          auth: true,
          body: { answer: answerText, durationMs: 10000 },
        }
      );

      // Cập nhật lại evaluation
      setEvaluations((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          ...result,
          followUpQuestion: null, // Đã hoàn thành câu hỏi phụ
        },
      }));

      setFollowUpAnswer("");
      resetTranscript();
      toast.success("Đã ghi nhận câu trả lời bổ sung!");

      handleSpeak(
        detectSpeechLang(currentQuestion.prompt) === "en-US"
          ? "Thank you. Your follow-up answer has been recorded."
          : "Cảm ơn bạn. Câu trả lời bổ sung đã được ghi nhận."
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể gửi câu trả lời phụ.");
    } finally {
      setEvaluatingFollowUp(false);
    }
  }

  async function handleFinishExam() {
    setSubmittingExam(true);
    try {
      // Điểm cuối cùng do server tính từ các câu trả lời đã lưu.
      const result = await api<SubmitResult>(`/api/student/exams/${session.id}/submit`, {
        method: "POST",
        auth: true,
      });

      toast.success(
        t("student.tests.examFinishedWithScore", {
          score: String(result.score),
          answered: String(result.answeredQuestions),
          total: String(result.totalQuestions),
        }),
      );
      onComplete();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi nộp bài thi.");
    } finally {
      setSubmittingExam(false);
    }
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <p className="text-muted-foreground">{t("student.tests.noQuestions")}</p>
          <Button variant="outline" onClick={onClose}>
            Quay lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="space-y-6">
      {/* Thanh điều khiển trên cùng */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">{session.title}</h2>
          <p className="text-xs text-muted-foreground">
            {session.subjectName} · Giảng viên: {session.teacherName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`size-2 rounded-full ${
                speechLang === "en-US"
                  ? "bg-sky-500"
                  : isZeroTTSOnline
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-sky-500"
              }`}
            />
            <span className="font-medium text-muted-foreground">
              {speechLang === "en-US"
                ? t("student.tests.detectedLangEn")
                : t("student.tests.detectedLangVi")}
              {speechLang === "vi-VN"
                ? isZeroTTSOnline
                  ? " · ZeroTTS"
                  : " · Google vi-VN"
                : " · Google en-US"}
            </span>
          </div>

          {speechLang === "vi-VN" ? (
            <div className="flex items-center gap-1 text-xs">
              <label htmlFor="voice-select" className="text-muted-foreground">
                {t("student.tests.voiceSelect")}
              </label>
              <select
                id="voice-select"
                value={activeVoice}
                onChange={(e) => setActiveVoice(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {ZEROTTS_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <Button variant="ghost" size="sm" onClick={onClose}>
            Thoát ca thi
          </Button>
        </div>
      </div>

      {/* Tabs danh sách các câu hỏi */}
      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) => {
          const evaluated = evaluations[q.id];
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                stopTTS();
                setIsSpeaking(false);
                resetTranscript();
                setCurrentIndex(idx);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                currentIndex === idx
                  ? "border-primary bg-primary/10 text-primary"
                  : evaluated
                    ? "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {evaluated ? (
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
              ) : null}
              Câu {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Card Câu hỏi hiện tại */}
      {currentQuestion && (
        <Card className="border-2 border-primary/20 shadow-sm">
          <CardHeader className="flex flex-col gap-2 border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Câu {currentIndex + 1} / {questions.length}
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Bloom: {currentQuestion.bloom}
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Điểm tối đa: {currentQuestion.maxScore}
              </span>
            </div>

            {/* Nút TTS - AI Đọc câu hỏi */}
            <Button
              type="button"
              variant={isSpeaking ? "destructive" : "outline"}
              size="sm"
              onClick={() => handleSpeak(currentQuestion.prompt)}
              className="flex items-center gap-2 text-xs"
            >
              {isSpeaking ? (
                <>
                  <VolumeXIcon className="size-4 animate-pulse" />
                  {t("student.tests.stopSpeaking")}
                </>
              ) : (
                <>
                  <Volume2Icon className="size-4 text-primary" />
                  {t("student.tests.listenQuestion")}
                </>
              )}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Nội dung câu hỏi */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-lg font-medium leading-relaxed">{currentQuestion.prompt}</p>
              {currentQuestion.criteria && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tiêu chí chấm: {currentQuestion.criteria}
                </p>
              )}
            </div>

            {/* Khung Trả lời bằng Giọng nói (STT) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-foreground">
                  Câu trả lời của bạn:
                </label>

                {isListening && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 animate-pulse">
                    <span className="size-2 rounded-full bg-rose-500" />
                    {t("student.tests.speakingActive")}
                  </span>
                )}
              </div>

              {/* Textarea hiển thị transcript thời gian thực */}
              <div className="relative">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={t("student.tests.answerPlaceholder")}
                  rows={4}
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>

              {sttError && (
                <p className="text-xs text-destructive">{sttError}</p>
              )}

              {/* Các nút hành động STT & Gửi */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isListening ? "destructive" : "default"}
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }}
                    className="flex items-center gap-2 text-sm"
                  >
                    {isListening ? (
                      <>
                        <MicOffIcon className="size-4" />
                        {t("student.tests.stopListening")}
                      </>
                    ) : (
                      <>
                        <MicIcon className="size-4 animate-bounce" />
                        {t("student.tests.startSpeaking")}
                      </>
                    )}
                  </Button>

                  {transcript ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => resetTranscript()}
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <RotateCcwIcon className="size-3.5" />
                      Làm mới
                    </Button>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={evaluating || !transcript.trim()}
                  onClick={handleSendAnswer}
                  className="flex items-center gap-2"
                >
                  <SendIcon className="size-4" />
                  {evaluating ? t("student.tests.evaluating") : t("student.tests.sendToAi")}
                </Button>
              </div>
            </div>

            {/* Khung Kết quả Đánh giá của AI */}
            {currentEvaluation && (
              <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-3">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-4 text-primary" />
                    <span className="font-semibold text-sm">
                      {t("student.tests.aiFeedback")}
                    </span>
                  </div>
                  <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-bold text-primary">
                    {currentEvaluation.evaluator === "RULE_BASED"
                      ? t("student.tests.provisionalScore", { score: String(currentEvaluation.score) })
                      : t("student.tests.aiScore", { score: String(currentEvaluation.score) })}
                  </span>
                </div>

                {currentEvaluation.evaluator === "RULE_BASED" && (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-100">
                    <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {t("student.tests.ruleBasedNotice")}
                  </p>
                )}

                <p className="text-sm leading-relaxed text-foreground/90">
                  {currentEvaluation.feedback}
                </p>

                {currentEvaluation.criteria && currentEvaluation.criteria.length > 0 && (
                  <ul className="space-y-1.5 text-xs">
                    {currentEvaluation.criteria.map((criterion) => (
                      <li key={criterion.name} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                        <span className="font-medium">{criterion.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatPoints(criterion.points)} / {formatPoints(criterion.maxPoints)}
                        </span>
                        {criterion.comment ? (
                          <span className="w-full text-muted-foreground">{criterion.comment}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Nếu AI yêu cầu câu hỏi phụ (Follow-up) */}
                {currentEvaluation.followUpQuestion && (
                  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {t("student.tests.followUpTitle")}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleSpeak(currentEvaluation.followUpQuestion || "")
                        }
                        className="h-7 text-xs text-amber-900 dark:text-amber-200"
                      >
                        <Volume2Icon className="size-3.5 mr-1" />
                        Nghe câu hỏi phụ
                      </Button>
                    </div>

                    <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                      {currentEvaluation.followUpQuestion}
                    </p>

                    {/* Vùng trả lời câu hỏi phụ */}
                    <div className="space-y-2 pt-2">
                      <textarea
                        value={isListening ? transcript : followUpAnswer}
                        onChange={(e) => setFollowUpAnswer(e.target.value)}
                        placeholder="Nhấn Micro hoặc nhập câu trả lời bổ sung..."
                        rows={2}
                        className="w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant={isListening ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isListening) {
                              stopListening();
                              setFollowUpAnswer(transcript);
                            } else {
                              resetTranscript();
                              startListening();
                            }
                          }}
                          className="text-xs flex items-center gap-1.5"
                        >
                          <MicIcon className="size-3.5" />
                          {isListening ? "Dừng nói" : "Bật Mic trả lời ý này"}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            evaluatingFollowUp ||
                            (!followUpAnswer.trim() && !transcript.trim())
                          }
                          onClick={handleSendFollowUp}
                          className="text-xs flex items-center gap-1.5"
                        >
                          {evaluatingFollowUp ? "Đang gửi..." : "Gửi câu trả lời bổ sung"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Điều hướng Next hoặc Hoàn thành */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => {
                  stopTTS();
                  setIsSpeaking(false);
                  resetTranscript();
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
              >
                Câu trước
              </Button>

              <div className="flex items-center gap-2">
                {!isLastQuestion ? (
                  <Button
                    type="button"
                    onClick={() => {
                      stopTTS();
                      setIsSpeaking(false);
                      resetTranscript();
                      setCurrentIndex((prev) =>
                        Math.min(questions.length - 1, prev + 1)
                      );
                    }}
                    className="flex items-center gap-1.5"
                  >
                    {t("student.tests.nextQuestion")}
                    <ChevronRightIcon className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="default"
                    disabled={submittingExam}
                    onClick={handleFinishExam}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    {submittingExam ? "Đang nộp..." : t("student.tests.finishExam")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
