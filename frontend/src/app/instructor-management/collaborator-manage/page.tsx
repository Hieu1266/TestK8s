"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
    Users,
    ArrowRight,
    ArrowLeft,
    Search,
    X,
    Loader2,
    AlertCircle,
    FolderX,
    BookOpen,
} from "lucide-react";
import { GeneralInfoInstructorSubject } from "@/types/subject";
import { getInstructorGeneralInfoAction } from "@/actions/getSubject";

const getStatusBadge = (statusId: string) => {
    switch (statusId) {
        case "SUBJECT_ACTIVE":
            return {
                text: "Đang giảng dạy",
                className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
                dotColor: "bg-emerald-500",
            };
        case "SUBJECT_DEVELOPING":
            return {
                text: "Đang biên soạn",
                className: "bg-amber-50 text-amber-700 border-amber-200/80",
                dotColor: "bg-amber-500",
            };
        case "SUBJECT_SUSPENDED":
            return {
                text: "Tạm dừng",
                className: "bg-rose-50 text-rose-700 border-rose-200/80",
                dotColor: "bg-rose-500",
            };
        default:
            return {
                text: "Khác",
                className: "bg-slate-100 text-slate-700 border-slate-200",
                dotColor: "bg-slate-400",
            };
    }
};

export default function CollaboratorManagePage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [subjects, setSubjects] = useState<GeneralInfoInstructorSubject[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const timer = setTimeout(() => {
            getInstructorGeneralInfoAction(searchTerm)
                .then((data) => setSubjects(data || []))
                .catch((err) => {
                    console.error("Lỗi tải danh sách môn học:", err?.message || err);
                    setError("Không thể tải danh sách môn học. Vui lòng thử lại sau.");
                })
                .finally(() => setLoading(false));
        }, 400);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans">
            <Navbar />

            {/* Hero Banner - Màu Xanh Chuẩn LUMER */}
            <section className="relative overflow-hidden bg-gradient-to-r from-[#0052CC] via-[#0066FF] to-[#3B82F6] text-white py-12 px-6 shadow-lg">
                <div className="absolute -top-12 -right-12 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 right-1/3 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-wrap items-center gap-2.5 mb-4">
                        <Link_button router={router} />
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/20 text-blue-50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20">
                            <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                            Quản lý Cộng Tác Viên
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                        Phân Công Cộng Tác Viên
                    </h1>
                    <p className="text-blue-100/90 mt-2 text-sm md:text-base max-w-2xl leading-relaxed font-normal">
                        Chọn môn học bên dưới để xem danh sách và phân công Tester làm cộng tác viên hỗ trợ kiểm thử chất lượng môn học.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Search Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Tìm kiếm môn học theo tên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl bg-slate-50 border border-slate-200 py-3 pl-11 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* State Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                        <Loader2 size={36} className="animate-spin text-[#0066FF]" />
                        <p className="text-sm font-semibold text-slate-600">Đang tải danh sách môn học...</p>
                    </div>
                )}

                {/* State Error */}
                {!loading && error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 text-sm flex items-center justify-center gap-2 shadow-sm">
                        <AlertCircle size={20} className="shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Grid môn học */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((subject) => {
                            const statusConfig = getStatusBadge(subject.status_id as string);
                            return (
                                <div
                                    key={subject.subject_id}
                                    onClick={() =>
                                        router.push(`/instructor-management/collaborator-manage/${subject.subject_id}`)
                                    }
                                    className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden relative cursor-pointer"
                                >
                                    {/* Top Active Bar */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0052CC] to-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity z-10" />

                                    <div className="p-6 space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0066FF] transition-colors line-clamp-2 leading-snug">
                                                {subject.title}
                                            </h3>
                                        </div>

                                        <div>
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${statusConfig.className}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                                                {statusConfig.text}
                                            </span>
                                        </div>

                                        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-2 flex-1 font-normal">
                                            {subject.description || "Chưa có mô tả chi tiết cho môn học này."}
                                        </p>
                                    </div>

                                    {/* Card Footer Button */}
                                    <div className="p-6 pt-0">
                                        <button className="w-full bg-slate-50 group-hover:bg-[#0066FF] text-slate-700 group-hover:text-white border border-slate-200/80 group-hover:border-[#0066FF] font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md group-hover:shadow-blue-500/20 active:scale-95">
                                            <Users size={16} />
                                            Quản lý cộng tác viên
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* State Empty */}
                {!loading && !error && subjects.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50/60 flex items-center justify-center text-blue-500 border border-blue-100">
                            <FolderX size={32} />
                        </div>
                        <h4 className="text-base font-bold text-slate-800">Không tìm thấy môn học nào</h4>
                        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                            {searchTerm
                                ? `Không có môn học nào khớp với từ khóa tìm kiếm "${searchTerm}".`
                                : "Bạn hiện chưa được phân công đảm nhận môn học nào trong hệ thống."}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}

function Link_button({ router }: { router: ReturnType<typeof useRouter> }) {
    return (
        <button
            onClick={() => router.push("/instructor-management")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 px-3 py-1.5 rounded-full backdrop-blur-md transition-all active:scale-95"
        >
            <ArrowLeft size={14} /> Bàn làm việc
        </button>
    );
}