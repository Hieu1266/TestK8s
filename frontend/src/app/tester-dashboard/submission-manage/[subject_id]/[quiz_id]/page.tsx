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

export default function TesterQuizUsersPage({
  params,
}: {
  params: Promise<{ subject_id: string; quiz_id: string }>;
}) {
  const { subject_id, quiz_id } = use(params);

  // Danh sách học viên
  const [users, setUsers] = useState<QuizUserSummaryItem[]>([]);

  // Thông tin đề thi có bật chấm chéo hay không
  const [isPeerReviewQuiz, setIsPeerReviewQuiz] = useState(false);
  const [peerReviewInfoLoading, setPeerReviewInfoLoading] = useState(true);

  // Tab đang chọn: "normal" (bài nộp thường) hoặc "peer_review" (chấm chéo)
  const [activeTab, setActiveTab] = useState<SubmissionTabKey>("normal");

  // Mục 1: Bài nộp thường (is_peer_review = False)
  const [normalSubmissions, setNormalSubmissions] = useState<
    SubmissionListItem[]
  >([]);
  const [normalLoading, setNormalLoading] = useState(true);
  const [normalError, setNormalError] = useState<string | null>(null);

  // Mục 2: Chấm chéo (is_peer_review = True)
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

  // Mục 1: Bài nộp thường
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

  // Mục 2: Chấm chéo
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
    if (quiz_id) fetchPeer();
  }, [quiz_id, isPeerReviewQuiz]);

  const needsAttentionCount = peerSubmissions.filter(
    (s) => s.is_discrepant,
  ).length;

  const renderNormalStatusBadge = (item: SubmissionListItem) => {
    switch (item.status) {
      case "GRADED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Đã chấm
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
            <AlertCircle size={12} className="text-amber-600" />
            Cần chấm
          </span>
        );
      case "IN_PROGRESS":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Clock size={12} className="text-slate-400" />
            Đang làm
          </span>
        );
    }
  };

  const renderPeerStatusBadge = (item: SubmissionListItem) => {
    if (item.is_discrepant) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/70">
          <Scale size={12} className="text-rose-600" />
          Lệch điểm - cần chấm lại
        </span>
      );
    }
    if (item.total_score !== null) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
          <CheckCircle2 size={12} className="text-emerald-600" />
          Đã chấm chéo xong
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <Clock size={12} className="text-slate-400" />
        Đang chờ đủ lượt chấm
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />

      {/* Header / Banner Section - Giữ màu Xanh bg-blue-600 chuẩn phong cách gốc */}
      <section className="bg-blue-600 text-white py-7 px-4 sm:px-6 lg:px-8 border-b border-blue-700">
        <div className="max-w-7xl mx-auto">
          <Link
            href={`/tester-dashboard/submission-manage/${subject_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-100 hover:text-white bg-blue-700/50 hover:bg-blue-700 px-2.5 py-1 rounded-md transition-colors border border-blue-500/30 mb-3"
          >
            <ArrowLeft size={13} /> Quay lại danh sách bài thi
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Danh sách bài nộp
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Switcher */}
        {!peerReviewInfoLoading && isPeerReviewQuiz && (
          <div className="inline-flex items-center p-1 bg-slate-200/80 rounded-lg border border-slate-300/60 mb-6">
            <button
              onClick={() => setActiveTab("normal")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "normal"
                  ? "bg-white text-blue-600 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardCheck size={14} /> Bài nộp thường
            </button>
            <button
              onClick={() => setActiveTab("peer_review")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "peer_review"
                  ? "bg-white text-blue-600 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Scale size={14} /> Chấm chéo
              {peerSubmissions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700">
                  {peerSubmissions.length}
                </span>
              )}
              {needsAttentionCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-600 text-white font-bold">
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
              <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
                <Loader2
                  size={20}
                  className="animate-spin text-blue-600 mr-2"
                />
                <span className="text-xs text-slate-500 font-medium">
                  Đang tải danh sách...
                </span>
              </div>
            )}

            {!normalLoading && normalError && (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-3 text-rose-700 text-xs">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{normalError}</span>
              </div>
            )}

            {!normalLoading &&
              !normalError &&
              normalSubmissions.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-6">
                  <Inbox size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-medium text-slate-700">
                    Chưa có bài nộp nào
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Chưa tìm thấy bài nộp thường cho bài thi này.
                  </p>
                </div>
              )}

            {!normalLoading && !normalError && normalSubmissions.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 sm:px-5">Học viên</th>
                        <th className="py-3 px-4 sm:px-5">Lượt</th>
                        <th className="py-3 px-4 sm:px-5">Trạng thái</th>
                        <th className="py-3 px-4 sm:px-5">Điểm</th>
                        <th className="py-3 px-4 sm:px-5">Thời gian nộp</th>
                        <th className="py-3 px-4 sm:px-5 text-right">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {normalSubmissions.map((s) => {
                        const student = usersById.get(s.user_id);
                        const username = student?.username || s.user_id;
                        return (
                          <tr
                            key={s.submission_id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-3.5 px-4 sm:px-5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                                  {username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800">
                                    {username}
                                  </div>
                                  {student?.email && (
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <Mail size={10} />
                                      {student.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 sm:px-5">
                              <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 font-medium">
                                #{s.attempt_number}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 sm:px-5">
                              {renderNormalStatusBadge(s)}
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 font-mono text-slate-900 font-semibold">
                              {s.total_score !== null ? s.total_score : "—"}
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 text-slate-500 text-[11px]">
                              {s.submitted_at
                                ? new Date(s.submitted_at).toLocaleString(
                                    "vi-VN",
                                  )
                                : "—"}
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 text-right">
                              <Link
                                href={`/tester-dashboard/submission-manage/grade/${s.submission_id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-2xs"
                              >
                                {s.status === "SUBMITTED"
                                  ? "Chấm bài"
                                  : "Xem chi tiết"}
                                <ChevronRight size={13} />
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
            <div className="mb-4 p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 text-xs leading-relaxed flex items-start gap-2.5">
              <Scale size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <span>
                Danh sách các bài nộp chấm chéo. Bài có chênh lệch điểm từ{" "}
                {"\u2265"} 5 điểm sẽ yêu cầu Giảng viên chấm lại thủ công. Các
                bài còn lại hệ thống tự động chốt theo điểm trung bình.
              </span>
            </div>

            {peerLoading && (
              <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
                <Loader2
                  size={20}
                  className="animate-spin text-blue-600 mr-2"
                />
                <span className="text-xs text-slate-500 font-medium">
                  Đang tải danh sách...
                </span>
              </div>
            )}

            {!peerLoading && peerError && (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-3 text-rose-700 text-xs">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{peerError}</span>
              </div>
            )}

            {!peerLoading && !peerError && peerSubmissions.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-6">
                <Inbox size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-700">
                  Chưa có bài chấm chéo nào
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chưa có học viên nào chọn tham gia chấm chéo ở bài thi này.
                </p>
              </div>
            )}

            {!peerLoading && !peerError && peerSubmissions.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 sm:px-5">Học viên</th>
                        <th className="py-3 px-4 sm:px-5">Lượt</th>
                        <th className="py-3 px-4 sm:px-5">Trạng thái</th>
                        <th className="py-3 px-4 sm:px-5">Đã chấm</th>
                        <th className="py-3 px-4 sm:px-5">Điểm TB</th>
                        <th className="py-3 px-4 sm:px-5">Điểm cuối</th>
                        <th className="py-3 px-4 sm:px-5">Thời gian nộp</th>
                        <th className="py-3 px-4 sm:px-5 text-right">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {peerSubmissions.map((s) => {
                        const student = usersById.get(s.user_id);
                        const username = student?.username || s.user_id;
                        return (
                          <tr
                            key={s.submission_id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-3.5 px-4 sm:px-5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                                  {username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800">
                                    {username}
                                  </div>
                                  {student?.email && (
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <Mail size={10} />
                                      {student.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 sm:px-5">
                              <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 font-medium">
                                #{s.attempt_number}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 sm:px-5">
                              {renderPeerStatusBadge(s)}
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 text-slate-600">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                                <User size={11} className="text-slate-400" />
                                {s.completed_review_count} người
                              </span>
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 font-mono text-slate-600">
                              {s.peer_avg_score !== null
                                ? s.peer_avg_score
                                : "—"}
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 font-mono text-slate-900 font-semibold">
                              {s.total_score !== null ? s.total_score : "—"}
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 text-slate-500 text-[11px]">
                              {s.submitted_at
                                ? new Date(s.submitted_at).toLocaleString(
                                    "vi-VN",
                                  )
                                : "—"}
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 text-right">
                              <Link
                                href={`/tester-dashboard/submission-manage/grade/${s.submission_id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-2xs"
                              >
                                {s.is_discrepant ? "Chấm lại" : "Xem / Sửa"}
                                <ChevronRight size={13} />
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
      </main>
    </div>
  );
}
