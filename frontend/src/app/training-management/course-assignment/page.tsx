'use client';

import { useState, useEffect, useMemo } from "react";
import Navbar from '@/components/Navbar';
import { Course, Module } from '@/types/course'; 
import { getCoursesAction } from "@/actions/getCourse";  
import { getCurriculums } from "@/actions/getCurriculum";
import { getrInstructorList, User } from "@/actions/getUser"; 
import { assignInstructorAction } from "@/actions/getAssignment";

export default function CourseAssignment() {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [curriculums, setCurriculums] = useState<any[]>([]);
    const [lecturers, setLecturers] = useState<User[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [form, setForm] = useState({
        course_id: "",
        title: "",
        description: "",
        price: 0,
        curriculum_id: "", 
    });

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [coursesData, curriculumsData, usersResult] = await Promise.all([
                getCoursesAction(), 
                getCurriculums(),
                getrInstructorList(1, 100, 4, "ACTIVE")
            ]);
            
            const validCourses: Course[] = coursesData || [];
            const validCurriculums = curriculumsData || [];
            
            if (usersResult && usersResult.success && usersResult.list) {
                setLecturers(usersResult.list);
            } else if (Array.isArray(usersResult)) {
                setLecturers(usersResult);
            } else {
                setLecturers([]);
            }

            const synchronizedData = validCourses.map((course: Course) => {
                const targetCurriculum = validCurriculums.find((c: any) => {
                    const cId = c.curriculum_id || c.id;
                    const courseCId = course.curriculum_id;
                    return String(cId).toLowerCase() === String(courseCId).toLowerCase();
                });
                return { 
                    ...course, 
                    modules: targetCurriculum?.modules || course.modules || [],
                    // Đồng bộ từ instructor_id nếu có sẵn từ database của bạn
                    assignedLecturerId: (course as any).assignedLecturerId || (course as any).instructor_id || "" 
                };
            });

            setCourses(synchronizedData);
            setCurriculums(validCurriculums);
            
            if (synchronizedData.length > 0 && !selectedCourseId) {
                setSelectedCourseId(synchronizedData[0].course_id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        fetchInitialData();
    }, []);

    const curriculumMap = useMemo(() => {
        const map = new Map<string, { type: string; finishedMonths: string | number; name: string }>();
        curriculums.forEach(c => {
            const targetId = c.curriculum_id || c.id;
            if (!targetId) return;
            const targetIdStr = String(targetId).toLowerCase();
            const type = c.course_type || "SHORT_TERM";
            const finishedMonths = c.course_finished_months !== undefined ? c.course_finished_months : "Chưa rõ";
            const name = c.curriculum_name || "N/A";
            map.set(targetIdStr, { type: String(type).toUpperCase(), finishedMonths, name });
        });
        return map;
    }, [curriculums]);

    // Lấy thông tin khóa học đang được chọn dựa trên selectedCourseId
    const activeCourse = useMemo(() => {
        return courses.find(c => c.course_id === selectedCourseId) || courses[0];
    }, [courses, selectedCourseId]);

    // Tìm thông tin chi tiết giảng viên đang phụ trách khóa học hiện tại
    const activeLecturer = useMemo(() => {
        if (!activeCourse) return undefined;
        return lecturers.find(l => l.user_id === (activeCourse as any).assignedLecturerId);
    }, [activeCourse, lecturers]);

    const totalCourses = courses.length;
    const assignedCoursesCount = courses.filter(c => (c as any).assignedLecturerId && (c as any).assignedLecturerId !== "").length;
    const unassignedCoursesCount = totalCourses - assignedCoursesCount;

    const handleAssignLecturer = (courseId: string, lecturerId: string) => {
        // Cập nhật lại mảng tổng, do activeCourse sử dụng useMemo phụ thuộc vào state `courses`
        // nên khi `courses` thay đổi, giao diện bên phải sẽ tự động re-render theo chính xác.
        setCourses(prevCourses =>
            prevCourses.map(course =>
                course.course_id === courseId
                    ? { ...course, assignedLecturerId: lecturerId }
                    : course
            )
        );
    };

    const handleSubmit = async () => {
    if (!activeCourse) return;

    const lecturerId = (activeCourse as any)?.assignedLecturerId;
    if (!lecturerId) return alert("Vui lòng chọn giảng viên.");

    setIsLoading(true);

    try {
        // 1. Kiểm tra nếu khóa học ĐÃ CÓ giảng viên từ trước
        if ((activeCourse as any).instructor_id) {
            // Thực hiện gọi API DELETE bản ghi cũ trước tại đây nếu có hàm xóa
            // await deleteInstructorAction(activeCourse.course_id);
        }

        // 2. Gọi hàm gán mới sau khi đã dọn dẹp bản ghi cũ
        const result = await assignInstructorAction({
            course_id: activeCourse.course_id,
            instructor_id: lecturerId
        });

        if (result.success) {
            alert("🎉 Thay đổi giảng viên thành công!");
            setCourses(prevCourses =>
                prevCourses.map(course =>
                    course.course_id === activeCourse.course_id
                        ? { ...course, instructor_id: lecturerId, assignedLecturerId: lecturerId }
                        : course
                )
            );
        } else {
            alert(`Lỗi từ database: ${result.error}`);
        }
    } catch (error: any) {
        alert(`Lỗi: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
};




    return (
        <>
            <Navbar />
            
            <div className="min-h-screen bg-[#f4f8fc] text-gray-800 antialiased pb-12">
                <div className="bg-[#0066ff] text-white pt-10 pb-20 px-4 sm:px-8 relative">
                    <div className="max-w-7xl mx-auto space-y-4">
                        <a href="/training-management" className="inline-flex items-center text-xs font-semibold text-white/80 hover:text-white transition-colors">
                            ← Quay về Dashboard Phòng Đào Tạo
                        </a>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">PHÂN CÔNG GIẢNG DẠY</h1>
                            <p className="text-sm text-white/80 mt-1 max-w-2xl font-light">
                                Chọn tài liệu và chỉ định giảng viên chính thức quản trị nội dung môn học từ danh sách nhân sự.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-10 space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-md border border-[#e1ebf5] text-center flex flex-col justify-center items-center">
                            <span className="text-3xl font-extrabold text-[#0066ff]">{isLoading ? "..." : totalCourses}</span>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Tổng khóa học</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-md border border-[#e1ebf5] text-center flex flex-col justify-center items-center">
                            <span className="text-3xl font-extrabold text-[#10b981]">{isLoading ? "..." : assignedCoursesCount}</span>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Đã phân công</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-md border border-[#e1ebf5] text-center col-span-2 md:col-span-1 flex flex-col justify-center items-center">
                            <span className="text-3xl font-extrabold text-amber-500">{isLoading ? "..." : unassignedCoursesCount}</span>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Chưa phân công</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <div className="lg:col-span-1 space-y-3">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                                Danh sách môn học ({totalCourses})
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                {isLoading && courses.length === 0 ? (
                                    <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 text-xs text-gray-400">
                                        Đang kết nối API hệ thống...
                                    </div>
                                ) : courses.length === 0 ? (
                                    <div className="p-8 rounded-2xl border-2 border-dashed border-[#d1e2f3] bg-white text-center text-xs text-gray-400">
                                        Không có dữ liệu khóa học.
                                    </div>
                                ) : (
                                    courses.map((course: Course) => {
                                        const assignedTeacher = lecturers.find(l => l.user_id === (course as any).assignedLecturerId);
                                        const isSelected = course.course_id === selectedCourseId;

                                        return (
                                            <div
                                                key={course.course_id}
                                                onClick={() => setSelectedCourseId(course.course_id)}
                                                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 shadow-sm ${
                                                    isSelected
                                                        ? 'bg-white border-2 border-[#0066ff] ring-4 ring-[#0066ff]/10'
                                                        : 'bg-white border-[#e1ebf5] hover:border-[#0066ff]/50 hover:shadow-md'
                                                }`}
                                            >
                                                <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-snug line-clamp-2">
                                                    {course.title}
                                                </h3>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    🏷️ Hình thức: <span className="text-gray-600 font-medium">{course.course_type}</span>
                                                </p>

                                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                                    <span className="text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                                                        📦 {course.modules?.length || 0} Chương học
                                                    </span>

                                                    {assignedTeacher ? (
                                                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                                            👨‍🏫 {assignedTeacher.username}
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                                                            ⚠️ Trống
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            {activeCourse ? (
                                <>
                                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e1ebf5] shadow-sm space-y-5">
                                        <div className="border-b border-[#f4f8fc] pb-4">
                                            <span className="text-[10px] font-bold uppercase tracking-widest bg-[#e6f2ff] text-[#0066ff] px-3 py-1.5 rounded-lg">
                                                ID: {activeCourse.course_id}
                                            </span>
                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-950 mt-3.5 leading-snug">
                                                {activeCourse.title}
                                            </h2>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm text-gray-600">
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <span className="text-gray-400 font-medium block">Loại hình môn học</span>
                                                <strong className="text-[#0066ff] text-base font-bold block mt-1">{activeCourse.course_type}</strong>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <span className="text-gray-400 font-medium block">Học phí</span>
                                                <strong className="text-gray-800 text-base font-bold block mt-1">
                                                    {activeCourse.price?.toLocaleString('vi-VN')} VND
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="text-xs sm:text-sm">
                                            <span className="text-gray-400 font-semibold block mb-1.5">Mô tả tóm tắt:</span>
                                            <p className="text-gray-600 bg-gray-50/55 p-3 rounded-xl border border-gray-100 leading-relaxed">
                                                {activeCourse.description || "Chưa có nội dung mô tả."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e1ebf5] shadow-sm">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                            Khung chương trình đào tạo liên kết ({activeCourse.modules?.length || 0} Chương)
                                        </h3>
                                        <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                                            {!activeCourse.modules || activeCourse.modules.length === 0 ? (
                                                <p className="text-xs text-gray-400 py-2">Chưa cấu hình chương học.</p>
                                            ) : (
                                                activeCourse.modules.map((mod: Module, idx: number) => (
                                                    <div key={mod.module_id} className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                                                                Chương {idx + 1}: {mod.title}
                                                            </h4>
                                                            <span className="text-[10px] font-bold text-[#0066ff] bg-[#e6f2ff] px-2 py-0.5 rounded-md">
                                                                {mod.lessons?.length || 0} bài học
                                                            </span>
                                                        </div>
                                                        {mod.lessons && mod.lessons.length > 0 && (
                                                            <div className="pl-4 border-l-2 border-gray-200 space-y-1.5 mt-2">
                                                                {mod.lessons.map((lesson) => (
                                                                    <div key={lesson.lesson_id} className="flex justify-between items-center text-xs text-gray-600">
                                                                        <span>• {lesson.title}</span>
                                                                        <span className="text-gray-400 text-[11px]">{lesson.duration}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e1ebf5] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-base font-bold text-[#0066ff]">Chỉ định nhân sự giảng dạy</h3>
                                                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                                                    Danh sách tài khoản hiển thị phía dưới được lấy trực tiếp từ database hệ thống thuộc quyền Giảng viên.
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-gray-500">Chọn giảng viên:</label>
                                                <select
                                                    value={(activeCourse as any).assignedLecturerId || ""}
                                                    // ĐÃ FIX: Truyền chính xác ID khoá học hiện tại cùng với ID giảng viên mới chọn
                                                    onChange={(e) => handleAssignLecturer(activeCourse.course_id, e.target.value)}
                                                    className="w-full text-xs bg-white border border-[#d1e2f3] rounded-xl p-3 focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] text-gray-700 cursor-pointer shadow-sm outline-none"
                                                >
                                                    <option value="">-- Chưa chỉ định giảng viên --</option>
                                                    {lecturers.map((lecturer) => (
                                                        <option key={lecturer.user_id} value={lecturer.user_id}>
                                                            {lecturer.username} ({lecturer.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center">
                                            {activeLecturer ? (
                                                <div className="bg-[#e6f2ff]/30 p-5 rounded-xl border border-[#d1e2f3] text-xs space-y-2">
                                                    <p className="text-[#0066ff] font-bold text-sm">Hồ sơ phụ trách:</p>
                                                    <div className="space-y-1 text-gray-600">
                                                        <p><span className="text-gray-400 font-medium">Username:</span> <span className="text-gray-800 font-semibold">{activeLecturer.username}</span></p>
                                                        <p><span className="text-gray-400 font-medium">Email hệ thống:</span> <span className="text-gray-800">{activeLecturer.email}</span></p>
                                                        <p><span className="text-gray-400 font-medium">Trạng thái:</span> <span className="text-emerald-600 font-medium">{activeLecturer.status_id}</span></p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-amber-50 border border-amber-100 text-amber-800 p-5 rounded-xl text-xs leading-relaxed flex items-start gap-2.5">
                                                    <span className="text-base">⚠️</span>
                                                    <span>
                                                        <strong>Chưa phân công:</strong> Môn học này chưa có giảng viên phụ trách. Hãy chọn một tài khoản từ danh sách.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isLoading}
                                            className={`px-8 py-3.5 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200 ${
                                                isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#0066ff] hover:bg-[#0052cc]"
                                            }`}
                                        >
                                            {isLoading ? "Đang xử lý..." : "Xác nhận & Lưu thay đổi"}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white p-16 text-center rounded-2xl border border-[#e1ebf5] text-gray-400 text-sm shadow-sm">
                                    Vui lòng chọn một chương trình đào tạo ở danh sách bên trái.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}