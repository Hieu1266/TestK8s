"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  ChevronRight,
  User,
  Mail,
  Inbox,
  Scale,
  ClipboardCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { getQuizUsersSummaryAction } from "@/actions/getQuizSubmission";
import {
  getQuizPeerReviewInfoAction,
  getQuizSubmissionsAction,
} from "@/actions/getPeerReview";
import { QuizUserSummaryItem } from "@/types/quiz-submission";
import { SubmissionListItem } from "@/types/peer-review";

type SubmissionTabKey = "normal" | "peer_review";

export default function QuizUsersPage({
  params,
}: {
  params: Promise<{ subject_id: string; quiz_id: string }>;
}) {
  const { subject_id, quiz_id } = use(params);

  // Danh sách học viên (chỉ dùng để tra cứu username/email theo user_id cho cả 2 mục)
  const [users, setUsers] = useState<QuizUserSummaryItem[]>([]);

  // 🆕 Thông tin đề thi có bật chấm chéo hay không (quyết định có hiển thị 2 mục hay không)
  const [isPeerReviewQuiz, setIsPeerReviewQuiz] = useState(false);
  const [peerReviewInfoLoading, setPeerReviewInfoLoading] = useState(true);

  // 🆕 Tab đang chọn: "normal" (bài nộp thường) hoặc "peer_review" (chấm chéo)
  const [activeTab, setActiveTab] = useState<SubmissionTabKey>("normal");

  // Mục 1: Bài nộp thường (is_peer_review = False)
  const [normalSubmissions, setNormalSubmissions] = useState<
    SubmissionListItem[]
  >([]);
  const [normalLoading, setNormalLoading] = useState(true);
  const [normalError, setNormalError] = useState<string | null>(null);

  // Mục 2: Chấm chéo (is_peer_review = True) — gồm cả đã chốt điểm lẫn lệch điểm
  const [peerSubmissions, setPeerSubmissions] = useState<SubmissionListItem[]>(
    [],
  );
  const [peerLoading, setPeerLoading] = useState(false);
  const [peerError, setPeerError] = useState<string | null>(null);

  // Tra cứu username/email theo user_id
  const usersById = useMemo(() => {
    const map = new Map<string, QuizUserSummaryItem>();
    users.forEach((u) => map.set(u.user_id, u));
    return map;
  }, [users]);

  useEffect(() => {
    async function fetchUsers() {
      const res = await getQuizUsersSummaryAction(quiz_id);
      if (res.success && res.data) setUsers(res.data);
    }
    if (quiz_id) fetchUsers();
  }, [quiz_id]);

  // Kiểm tra đề thi có bật chấm chéo hay không
  useEffect(() => {
    async function fetchPeerReviewInfo() {
      setPeerReviewInfoLoading(true);
      const res = await getQuizPeerReviewInfoAction(quiz_id);
      setIsPeerReviewQuiz(Boolean(res.success && res.data?.is_peer_review));
      setPeerReviewInfoLoading(false);
    }
    if (quiz_id) fetchPeerReviewInfo();
  }, [quiz_id]);

  // Mục 1: Bài nộp thường — luôn lọc is_peer_review=false, kể cả khi quiz không bật chấm chéo
  // (khi đó mọi bài nộp vốn dĩ đều có is_peer_review=false nên không ảnh hưởng gì)
  useEffect(() => {
    async function fetchNormal() {
      setNormalLoading(true);
      setNormalError(null);
      const res = await getQuizSubmissionsAction(quiz_id, false);
      if (res.success && res.data) {
        setNormalSubmissions(res.data);
      } else {
        setNormalError(res.error || "Không thể tải danh sách bài nộp.");
      }
      setNormalLoading(false);
    }
    if (quiz_id) fetchNormal();
  }, [quiz_id]);

  // Mục 2: Chấm chéo — chỉ tải khi đề thi có bật chấm chéo
  useEffect(() => {
    async function fetchPeer() {
      setPeerLoading(true);
      setPeerError(null);
      const res = await getQuizSubmissionsAction(quiz_id, true);
      if (res.success && res.data) {
        setPeerSubmissions(res.data);
      } else {
        setPeerError(res.error || "Không thể tải danh sách bài chấm chéo.");
      }
      setPeerLoading(false);
    }
    if (quiz_id && isPeerReviewQuiz) fetchPeer();
  }, [quiz_id, isPeerReviewQuiz]);

  const needsAttentionCount = peerSubmissions.filter(
    (s) => s.is_discrepant,
  ).length;

  const renderNormalStatusBadge = (item: SubmissionListItem) => {
    switch (item.status) {
      case "GRADED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Đã chấm
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle size={12} /> Cần chấm
          </span>
        );
      case "IN_PROGRESS":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} /> Đang làm
          </span>
        );
    }
  };

  const renderPeerStatusBadge = (item: SubmissionListItem) => {
    if (item.is_discrepant) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Scale size={12} /> Lệch điểm - cần chấm lại
        </span>
      );
    }
    if (item.total_score !== null) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} /> Đã chấm chéo xong
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <Clock size={12} /> Đang chờ đủ lượt chấm
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <Link
            href={`/instructor-management/submission-manage/${subject_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full mb-3 transition"
          >
            <ArrowLeft size={14} /> Quay lại danh sách bài thi
          </Link>
          <h1 className="text-3xl font-bold">Danh sách bài nộp</h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab switcher: chỉ hiển thị khi đề thi có bật chấm chéo */}
        {!peerReviewInfoLoading && isPeerReviewQuiz && (
          <div className="flex items-center gap-2 mb-6 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit shadow-sm">
            <button
              onClick={() => setActiveTab("normal")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "normal"
                  ? "bg-[#0066FF] text-white shadow"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <ClipboardCheck size={14} /> Bài nộp thường
            </button>
            <button
              onClick={() => setActiveTab("peer_review")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "peer_review"
                  ? "bg-[#0066FF] text-white shadow"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Scale size={14} /> Chấm chéo
              {peerSubmissions.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-current text-[10px] font-bold">
                  {peerSubmissions.length}
                </span>
              )}
              {needsAttentionCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {needsAttentionCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ---------------- MỤC 1: BÀI NỘP THƯỜNG (is_peer_review = False) ---------------- */}
        {activeTab === "normal" && (
          <>
            {normalLoading && (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
                <Loader2
                  size={32}
                  className="animate-spin text-[#0066FF] mb-2"
                />
                <span className="text-xs text-slate-500 font-medium">
                  Đang tải danh sách bài nộp...
                </span>
              </div>
            )}

            {!normalLoading && normalError && (
              <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-2xl border border-red-200 text-center p-6">
                <AlertCircle size={36} className="text-red-500 mb-2" />
                <h3 className="text-sm font-bold text-red-700">
                  Đã xảy ra lỗi
                </h3>
                <p className="text-xs text-red-600 mt-1">{normalError}</p>
              </div>
            )}

            {!normalLoading &&
              !normalError &&
              normalSubmissions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-6">
                  <Inbox size={40} className="text-slate-300 mb-2" />
                  <h3 className="text-base font-bold text-slate-700">
                    Chưa có bài nộp nào
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Chưa tìm thấy bài nộp thường (không chấm chéo) nào cho bài
                    thi này.
                  </p>
                </div>
              )}

            {!normalLoading && !normalError && normalSubmissions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Học viên</th>
                        <th className="py-3.5 px-6">Lượt</th>
                        <th className="py-3.5 px-6">Trạng thái</th>
                        <th className="py-3.5 px-6">Điểm</th>
                        <th className="py-3.5 px-6">Thời gian nộp</th>
                        <th className="py-3.5 px-6 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {normalSubmissions.map((s) => {
                        const student = usersById.get(s.user_id);
                        return (
                          <tr
                            key={s.submission_id}
                            className="hover:bg-slate-50/80 transition"
                          >
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <User size={14} className="text-slate-400" />
                                  {student?.username ||
                                    "Chưa xác định học viên"}
                                </span>
                                {student?.email && (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Mail
                                      size={12}
                                      className="text-slate-400"
                                    />
                                    {student.email}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-600">
                              Lần #{s.attempt_number}
                            </td>
                            <td className="py-4 px-6">
                              {renderNormalStatusBadge(s)}
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800 text-sm">
                              {s.total_score !== null ? s.total_score : "--"}
                            </td>
                            <td className="py-4 px-6 text-slate-600">
                              {s.submitted_at
                                ? new Date(s.submitted_at).toLocaleString(
                                    "vi-VN",
                                  )
                                : "--"}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Link
                                href={`/instructor-management/submission-manage/grade/${s.submission_id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0066FF] text-white font-semibold hover:bg-blue-700 transition"
                              >
                                {s.status === "SUBMITTED"
                                  ? "Chấm bài"
                                  : "Xem chi tiết"}
                                <ChevronRight size={14} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------------- MỤC 2: CHẤM CHÉO (is_peer_review = True) ---------------- */}
        {activeTab === "peer_review" && (
          <>
            <div className="mb-5 flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-2xl">
              <Scale size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                Danh sách toàn bộ bài nộp mà học viên đã chọn tham gia chấm
                chéo. Bài lệch điểm giữa các người chấm (từ {"\u2265"} 5 điểm)
                cần giảng viên chấm lại thủ công; các bài còn lại đã được hệ
                thống tự động chốt điểm dựa trên điểm trung bình của các người
                chấm.
              </p>
            </div>

            {peerLoading && (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
                <Loader2
                  size={32}
                  className="animate-spin text-[#0066FF] mb-2"
                />
                <span className="text-xs text-slate-500 font-medium">
                  Đang tải danh sách bài chấm chéo...
                </span>
              </div>
            )}

            {!peerLoading && peerError && (
              <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-2xl border border-red-200 text-center p-6">
                <AlertCircle size={36} className="text-red-500 mb-2" />
                <h3 className="text-sm font-bold text-red-700">
                  Đã xảy ra lỗi
                </h3>
                <p className="text-xs text-red-600 mt-1">{peerError}</p>
              </div>
            )}

            {!peerLoading && !peerError && peerSubmissions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-6">
                <Inbox size={40} className="text-slate-300 mb-2" />
                <h3 className="text-base font-bold text-slate-700">
                  Chưa có bài chấm chéo nào
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chưa có học viên nào chọn tham gia chấm chéo cho bài thi này.
                </p>
              </div>
            )}

            {!peerLoading && !peerError && peerSubmissions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Học viên</th>
                        <th className="py-3.5 px-6">Lượt</th>
                        <th className="py-3.5 px-6">Trạng thái</th>
                        <th className="py-3.5 px-6">Số người đã chấm</th>
                        <th className="py-3.5 px-6">Điểm TB từ chấm chéo</th>
                        <th className="py-3.5 px-6">Điểm cuối cùng</th>
                        <th className="py-3.5 px-6">Thời gian nộp</th>
                        <th className="py-3.5 px-6 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {peerSubmissions.map((s) => {
                        const student = usersById.get(s.user_id);
                        return (
                          <tr
                            key={s.submission_id}
                            className="hover:bg-slate-50/80 transition"
                          >
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <User size={14} className="text-slate-400" />
                                  {student?.username ||
                                    "Chưa xác định học viên"}
                                </span>
                                {student?.email && (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Mail
                                      size={12}
                                      className="text-slate-400"
                                    />
                                    {student.email}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-600">
                              Lần #{s.attempt_number}
                            </td>
                            <td className="py-4 px-6">
                              {renderPeerStatusBadge(s)}
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                                {s.completed_review_count} người
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-700">
                              {s.peer_avg_score !== null
                                ? s.peer_avg_score
                                : "--"}
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800 text-sm">
                              {s.total_score !== null ? s.total_score : "--"}
                            </td>
                            <td className="py-4 px-6 text-slate-600">
                              {s.submitted_at
                                ? new Date(s.submitted_at).toLocaleString(
                                    "vi-VN",
                                  )
                                : "--"}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Link
                                href={`/instructor-management/submission-manage/grade/${s.submission_id}`}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-semibold transition ${
                                  s.is_discrepant
                                    ? "bg-amber-500 hover:bg-amber-600"
                                    : "bg-[#0066FF] hover:bg-blue-700"
                                }`}
                              >
                                {s.is_discrepant
                                  ? "Chấm lại"
                                  : "Xem / Sửa điểm"}
                                <ChevronRight size={14} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
