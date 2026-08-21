"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { fetchCurrentUser, fetchUserProfile, updateUserData, updateUserProfile } from "@/actions/getUser";
import { fetchUserStatistics, fetchInprogressCourses, fetchCompletedCourses } from "@/actions/getEnrollment";
import { fetchUserCertificates } from "@/actions/getCertificate";
import { CertificateItem } from "@/types/certificate";
import { UserDataInfo, ProfileInfo } from "@/types/user";
import { GeneralUserEnrollmentInfo, CourseInProgress } from "@/types/enrollment";

const ROLE_TRANSLATIONS: Record<string, string> = {
  "Admin": "Quản trị viên hệ thống",
  "User": "Người dùng",
  "Tester": "Người kiểm thử",
  "Instructor": "Giảng viên",
  "Manager": "Quản lý đào tạo"
};

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("learning");
  const [user, setUser] = useState<UserDataInfo | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statistics, setStatistics] = useState<GeneralUserEnrollmentInfo>({
    inprogress_courses: 0,
    completed_courses: 0,
    certificate: 0
  });
  const [learningCourses, setLearningCourses] = useState<CourseInProgress[]>([]);
  const [completedCourses, setCompletedCourses] = useState<CourseInProgress[]>([]);

  // State lưu danh sách chứng chỉ thật từ API
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    birthdate: "",
    firstname: "",
    lastname: "",
    bio: "",
    avatar_url: ""
  });

  async function loadAllData() {
    try {
      setLoading(true);
      setError(null);

      const [
        userData,
        profileData,
        statsData,
        inprogressData,
        completedData,
        certificatesData
      ] = await Promise.all([
        fetchCurrentUser(),
        fetchUserProfile(),
        fetchUserStatistics(),
        fetchInprogressCourses(),
        fetchCompletedCourses(),
        fetchUserCertificates()
      ]);

      setUser(userData);
      setProfile(profileData);
      setStatistics(statsData);
      setLearningCourses(inprogressData);
      setCompletedCourses(completedData);
      setCertificates(certificatesData);

      if (userData && profileData) {
        setFormData({
          username: userData.username || "",
          birthdate: userData.birthdate || "",
          firstname: profileData.firstname || "",
          lastname: profileData.lastname || "",
          bio: profileData.bio || "",
          avatar_url: profileData.avatar_url || ""
        });
      }
    } catch (err: any) {
      console.error("Lỗi khi tải thông tin:", err);
      setError(err.message || "Đã xảy ra lỗi khi kết nối hệ thống.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Hàm chuyển trang sang chi tiết khóa học khi bấm Tiếp tục học
  const handleContinueLearning = (courseId: string | number) => {
    router.push(`/course/${courseId}`);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) {
      setError("Không tìm thấy ID người dùng để cập nhật.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubmitSuccess(null);

    try {
      const userPayload = {
        username: formData.username,
        birthdate: formData.birthdate,
      };

      const profilePayload = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        bio: formData.bio,
        avatar_url: formData.avatar_url,
      };

      const [userOk, profileOk] = await Promise.all([
        updateUserData(user.user_id, userPayload),
        updateUserProfile(profilePayload)
      ]);

      if (userOk && profileOk) {
        setSubmitSuccess("Cập nhật thông tin hồ sơ thành công!");
        setIsEditing(false);
        await loadAllData();
      } else {
        setError("Cập nhật thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (err: any) {
      console.error("Lỗi khi cập nhật:", err);
      setError("Đã xảy ra lỗi trong quá trình lưu dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa cập nhật";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN");
    } catch {
      return dateString;
    }
  };

  const fullName = profile ? `${profile.lastname} ${profile.firstname}`.trim() : "";
  const defaultAvatar = "https://www.w3schools.com/howto/img_avatar.png";
  const userAvatar = profile?.avatar_url || defaultAvatar;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />

      {/* Hero Banner */}
      <section className="bg-blue-500 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <span className="bg-blue-100 text-[#0056D2] px-4 py-2 rounded-full text-sm font-medium">
            Hệ thống đào tạo trực tuyến
          </span>

          <h1 className="text-5xl font-bold text-white mt-4">LUMER</h1>
          <p className="text-lg text-white mt-3">
            Nền tảng đào tạo từ xa dành cho sinh viên và giảng viên
          </p>

          <div className="flex items-center gap-4 mt-10">
            {loading ? (
              <div className="w-16 h-16 rounded-full bg-blue-400 animate-pulse border-2 border-slate-200" />
            ) : (
              <img
                src={userAvatar}
                alt="avatar"
                className="w-16 h-16 rounded-full border-2 border-slate-200 object-cover"
              />
            )}

            <div>
              {loading ? (
                <div className="h-8 w-48 bg-blue-400 animate-pulse rounded"></div>
              ) : error && !user ? (
                <h2 className="text-2xl font-semibold text-red-200">Không thể tải tên</h2>
              ) : (
                <h2 className="text-2xl font-semibold text-white">
                  Xin chào, {fullName || user?.username || "Thành viên"}
                </h2>
              )}
              <p className="text-white mt-1">Theo dõi tiến độ học tập của bạn</p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="max-w-5xl mx-auto px-6 -mt-6">
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard title={statistics.inprogress_courses.toString()} text="Khóa học đang học" />
          <StatCard title={statistics.completed_courses.toString()} text="Khóa học hoàn thành" />
          <StatCard title={statistics.certificate.toString()} text="Chứng chỉ" />
        </div>
      </section>

      {/* Tabs */}
      <section className="max-w-5xl mx-auto px-6 mt-10">
        <div className="border-b border-slate-200">
          <div className="flex gap-8 overflow-x-auto">
            {["learning", "completed", "certificate", "profile"].map((tab) => {
              const tabLabels: Record<string, string> = {
                learning: "Đang học", completed: "Hoàn thành", certificate: "Chứng chỉ", profile: "Hồ sơ"
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 font-medium transition ${activeTab === tab
                    ? "border-b-2 border-[#0056D2] text-[#0056D2]"
                    : "text-slate-500 hover:text-[#0056D2]"
                    }`}
                >
                  {tabLabels[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Content Area */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="w-full">

          {/* TAB: ĐANG HỌC */}
          {activeTab === "learning" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Khóa học đang học</h2>
              <div className="space-y-6">
                {learningCourses.length > 0 ? (
                  learningCourses.map((course, index) => (
                    <CourseProgressCard
                      key={course.course_id || index}
                      courseId={course.course_id}
                      title={course.course_title}
                      progress={course.current_overall_progress}
                      onContinue={handleContinueLearning}
                    />
                  ))
                ) : (
                  <p className="text-slate-500 py-12 text-center">Bạn chưa tham gia khóa học nào.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: HOÀN THÀNH */}
          {activeTab === "completed" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Khóa học hoàn thành</h2>
              <div className="space-y-4">
                {completedCourses.length > 0 ? (
                  completedCourses.map((course, index) => (
                    <CompletedCourse
                      key={course.course_id || index}
                      courseId={course.course_id}
                      title={course.course_title}
                      onReview={handleContinueLearning}
                    />
                  ))
                ) : (
                  <p className="text-slate-500 py-12 text-center">Bạn chưa hoàn thành khóa học nào.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: CHỨNG CHỈ */}
          {activeTab === "certificate" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Chứng chỉ đã đạt được</h2>
              {certificates.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {certificates.map((cert, index) => (
                    <CertificateCard
                      key={index}
                      title={cert.course_name}
                      date={formatDate(cert.created_at)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 py-12 text-center">Bạn chưa nhận được chứng chỉ nào.</p>
              )}
            </div>
          )}

          {/* TAB: HỒ SƠ */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Hồ sơ cá nhân</h2>
                {!isEditing && user && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-[#0056D2] hover:bg-[#0046AE] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                )}
              </div>

              {submitSuccess && (
                <div className="p-4 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold">
                  {submitSuccess}
                </div>
              )}

              {error && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {loading && !isEditing ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-5 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                </div>
              ) : isEditing ? (
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Họ</label>
                      <input
                        type="text"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleInputChange}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nguyễn"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tên</label>
                      <input
                        type="text"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleInputChange}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Văn A"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên tài khoản (Username)</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label>
                    <input
                      type="date"
                      name="birthdate"
                      value={formData.birthdate}
                      onChange={handleInputChange}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh đại diện (URL)</label>
                    <input
                      type="url"
                      name="avatar_url"
                      value={formData.avatar_url}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tiểu sử / Giới thiệu bản thân</label>
                    <textarea
                      name="bio"
                      rows={3}
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Một vài dòng viết về bản thân bạn..."
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2 border-t">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setIsEditing(false);
                        setError(null);
                      }}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-[#0056D2] hover:bg-[#0046AE] text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                    >
                      {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              ) : user ? (
                <div className="space-y-4 text-slate-700">
                  <div className="flex items-center gap-4 border-b pb-4">
                    <strong className="text-slate-500 w-32 shrink-0">Ảnh đại diện:</strong>
                    <img src={userAvatar} alt="avatar mini" className="w-12 h-12 rounded-full border object-cover" />
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <strong className="text-slate-500 w-32 shrink-0">Họ và tên:</strong>
                    <span className="font-semibold text-slate-900">{fullName || "Chưa cập nhật"}</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <strong className="text-slate-500 w-32 shrink-0">Tên tài khoản:</strong>
                    <span className="text-slate-900">{user.username}</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <strong className="text-slate-500 w-32 shrink-0">Email:</strong>
                    <span className="text-slate-900">{user.email}</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <strong className="text-slate-500 w-32 shrink-0">Ngày sinh:</strong>
                    <span className="text-slate-900">{formatDate(user.birthdate)}</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <strong className="text-slate-500 w-32 shrink-0">Vai trò:</strong>
                    <span className="bg-blue-50 text-[#0056D2] px-2.5 py-0.5 rounded-full text-xs font-semibold self-start">
                      {ROLE_TRANSLATIONS[user.role_name] || user.role_name}
                    </span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <strong className="text-slate-500 w-32 shrink-0">Trạng thái:</strong>
                    <span className="text-green-600 font-semibold text-sm">{user.display_status}</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <strong className="text-slate-500 w-32 shrink-0">Ngày tham gia:</strong>
                    <span className="text-slate-900">{formatDate(user.created_at)}</span>
                  </div>

                  <div className="pt-2">
                    <strong className="text-slate-500 block mb-1">Tiểu sử / Giới thiệu:</strong>
                    <div className="bg-slate-50 border rounded-xl p-4 text-sm text-slate-600 italic">
                      {profile?.bio || "Chưa có thông tin giới thiệu bản thân."}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Sub-components
function StatCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-md transition">
      <h3 className="text-3xl font-bold text-[#0056D2]">{title}</h3>
      <p className="text-slate-500 mt-2">{text}</p>
    </div>
  );
}

interface CourseProgressCardProps {
  courseId: string | number;
  title: string;
  progress: number;
  onContinue: (id: string | number) => void;
}

function CourseProgressCard({ title, progress, courseId, onContinue }: CourseProgressCardProps) {
  return (
    <div className="border border-slate-200 rounded-xl p-5">
      <div className="flex justify-between mb-3">
        <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
        <span className="font-semibold text-[#0056D2]">{progress}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full">
        <div
          className="bg-[#0056D2] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <button
        type="button"
        className="mt-4 bg-[#0056D2] hover:bg-[#0046AE] text-white px-5 py-2 rounded-md font-medium transition cursor-pointer"
        onClick={() => onContinue(courseId)}
      >
        Tiếp tục học
      </button>
    </div>
  );
}

interface CompletedCourseProps {
  courseId: string | number;
  title: string;
  onReview: (id: string | number) => void;
}

function CompletedCourse({ courseId, title, onReview }: CompletedCourseProps) {
  return (
    <div className="flex justify-between items-center border border-slate-200 rounded-lg p-4 hover:shadow-sm transition">
      <span className="font-semibold text-slate-900">{title}</span>
      <button
        type="button"
        onClick={() => onReview(courseId)}
        className="bg-slate-100 hover:bg-slate-200 text-[#0056D2] font-medium px-4 py-2 rounded-lg text-sm transition cursor-pointer"
      >
        Xem lại
      </button>
    </div>
  );
}

function CertificateCard({ title, date }: { title: string; date: string }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">Ngày cấp: {date}</p>
      <div className="flex gap-2 mt-4">
        <button className="flex-1 border border-[#0056D2] text-[#0056D2] py-2 rounded-md hover:bg-blue-50 transition">
          Xem
        </button>
        <button className="flex-1 bg-[#0056D2] text-white py-2 rounded-md hover:bg-[#0046AE] transition">
          Tải PDF
        </button>
      </div>
    </div>
  );
}