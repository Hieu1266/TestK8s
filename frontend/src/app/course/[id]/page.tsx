"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import Navbar from "@/components/Navbar";
import LessonNotesPanel from "@/components/LessonNotesPanel";
import { QuizSection } from "@/components/LessonQuizContainer";
import PeerReviewSection from "@/components/course-learning/PeerReviewSection";
import TesterFeedbackPanel from "@/components/course-learning/TesterFeedbackPanel";

import { getLearningCourse } from "@/actions/getCourse";
import {
  attachStatusToLessons,
  completeLessonAction,
} from "@/actions/getLesson";
import { getQuizStatusByLessonAction } from "@/actions/getQuizSubmission";
import { getLessonNotesAction, createNoteAction } from "@/actions/getNotes";
import {
  getOrCreateVideoProgressAction,
  updateVideoProgressAction,
} from "@/actions/getVideoProgress";
import { getLessonResourcesAction } from "@/actions/getLessonResource";

import { LessonResourceItem } from "@/types/lessons";
import { CourseLearningStructure } from "@/types/course";
import { SubjectLearningStructure } from "@/types/subjects";
import { ModuleLearningStructure } from "@/types/modules";
import { UserLessonNote, NoteCreatePayload } from "@/types/progresses";
import { LessonStatus, SubmissionStatus } from "@/types/statuses";
import { VideoProgress } from "@/types/video";

import { TabKey, LessonWithStatus } from "@/components/course-learning/types";

import {
  getSubjectAccent,
  getLastLessonId,
  setLastLessonId,
  getSidebarCollapsed,
  setSidebarCollapsed,
} from "@/components/course-learning/helpers";

import CourseHeaderBar from "@/components/course-learning/CourseHeaderBar";
import CourseSidebar from "@/components/course-learning/CourseSidebar";
import CourseLoadingScreen from "@/components/course-learning/CourseLoadingScreen";
import CourseErrorScreen from "@/components/course-learning/CourseErrorScreen";
import LessonTitleHeader from "@/components/course-learning/LessonTitleHeader";
import LessonTabsNav from "@/components/course-learning/LessonTabsNav";
import LectureTabContent from "@/components/course-learning/LectureTabContent";
import ResourcesTabContent from "@/components/course-learning/ResourcesTabContent";
import TestModeNextButton from "@/components/course-learning/TestModeNextButton";

const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

export default function CourseLearningPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = params?.id as string;

  // Tester mode: chỉ bật khi URL có ?tester=1
  const isTester = searchParams.get("tester") === "1";

  const [course, setCourse] = useState<CourseLearningStructure | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // =========================================================
  // LESSON / SUBJECT STATE
  // =========================================================

  const [currentLesson, setCurrentLesson] = useState<
    LessonWithStatus | undefined
  >(undefined);

  const [currentSubject, setCurrentSubject] = useState<
    SubjectLearningStructure | undefined
  >(undefined);

  const [expandedSubjects, setExpandedSubjects] = useState<
    Record<string, boolean>
  >({});

  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  const [activeTab, setActiveTab] = useState<TabKey>("lecture");

  // =========================================================
  // SIDEBAR
  // =========================================================

  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    setSidebarCollapsedState(getSidebarCollapsed());
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      setSidebarCollapsed(next);
      return next;
    });
  };

  // =========================================================
  // NOTES
  // =========================================================

  const [notes, setNotes] = useState<UserLessonNote[]>([]);

  const [notesLoading, setNotesLoading] = useState(false);

  // =========================================================
  // VIDEO
  // =========================================================

  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(
    null,
  );

  const [videoProgressLoading, setVideoProgressLoading] = useState(false);

  // =========================================================
  // RESOURCES
  // =========================================================

  const [resources, setResources] = useState<LessonResourceItem[]>([]);

  const [resourcesLoading, setResourcesLoading] = useState(false);

  // =========================================================
  // QUICK NOTE
  // =========================================================

  const [quickNoteOpen, setQuickNoteOpen] = useState(false);

  const [quickNoteContent, setQuickNoteContent] = useState("");

  const [quickNoteSaving, setQuickNoteSaving] = useState(false);

  // =========================================================
  // COMPLETION
  // =========================================================

  const [completing, setCompleting] = useState(false);
  const [slideFocusMode, setSlideFocusMode] = useState(false);

  const slideCompletionInFlightRef = useRef(false);

  const [hasViewedAllSlides, setHasViewedAllSlides] = useState(false);

  // =========================================================
  // QUIZ / PEER REVIEW
  // =========================================================

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const [activeQuizStatus, setActiveQuizStatus] = useState<string | null>(null);

  const [quizStatusRefreshKey, setQuizStatusRefreshKey] = useState(0);

  // =========================================================
  // SCROLL
  // =========================================================

  const lessonContentScrollRef = useRef<HTMLDivElement>(null);

  // =========================================================
  // LOAD COURSE
  // =========================================================

  useEffect(() => {
    if (!id) return;

    async function fetchLearningData() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const rawCourse = await getLearningCourse(id);

        const updatedSubjects = await Promise.all(
          rawCourse.subjects.map(async (subject) => {
            const updatedModules = await Promise.all(
              subject.modules.map(async (mod) => {
                const lessonsWithStatus = await attachStatusToLessons(
                  mod.lessons,
                );

                return {
                  ...mod,
                  lessons: lessonsWithStatus,
                };
              }),
            );

            return {
              ...subject,
              modules: updatedModules,
            };
          }),
        );

        const courseWithStatus: CourseLearningStructure = {
          ...rawCourse,
          subjects: updatedSubjects,
        };

        setCourse(courseWithStatus);

        const firstSubject = courseWithStatus.subjects[0];

        const firstModule = firstSubject?.modules[0];

        const firstLesson = firstModule?.lessons[0] as
          | LessonWithStatus
          | undefined;

        let targetSubject = firstSubject;
        let targetModule = firstModule;
        let targetLesson = firstLesson;

        const savedLessonId = getLastLessonId(id);

        if (savedLessonId) {
          for (const subject of courseWithStatus.subjects) {
            for (const mod of subject.modules) {
              const found = mod.lessons.find(
                (les) => les.lesson_id === savedLessonId,
              ) as LessonWithStatus | undefined;

              if (found && found.status !== LessonStatus.LOCKED) {
                targetSubject = subject;
                targetModule = mod;
                targetLesson = found;
              }
            }
          }
        }

        if (targetSubject) {
          setCurrentSubject(targetSubject);

          setExpandedSubjects({
            [targetSubject.subject_id]: true,
          });
        }

        if (targetModule) {
          setExpandedModules({
            [targetModule.module_id]: true,
          });
        }

        if (targetLesson) {
          setCurrentLesson(targetLesson);

          setActiveTab(targetLesson.is_quiz ? "quiz" : "lecture");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Không thể lấy dữ liệu khóa học");
      } finally {
        setLoading(false);
      }
    }

    fetchLearningData();
  }, [id]);

  // =========================================================
  // RESET WHEN CHANGE LESSON
  // =========================================================

  useEffect(() => {
    if (!slideFocusMode) {
      return;
    }

    const handleFocusModeKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSlideFocusMode(false);
      }
    };

    window.addEventListener("keydown", handleFocusModeKeyDown);

    return () => {
      window.removeEventListener("keydown", handleFocusModeKeyDown);
    };
  }, [slideFocusMode]);

  useEffect(() => {
    setVideoCurrentTime(0);
    setSeekTarget(null);

    setHasViewedAllSlides(false);
    setSlideFocusMode(false);

    setQuickNoteOpen(false);
    setQuickNoteContent("");

    setActiveQuizId(null);
    setActiveQuizStatus(null);
  }, [currentLesson?.lesson_id]);

  // Scroll content về đầu khi đổi lesson
  useEffect(() => {
    lessonContentScrollRef.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [currentLesson?.lesson_id]);

  // =========================================================
  // LOAD NOTES
  // =========================================================

  useEffect(() => {
    if (!currentLesson?.lesson_id) {
      setNotes([]);
      return;
    }

    if (activeTab !== "notes") {
      setNotes([]);
      setNotesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setNotesLoading(true);

        const data = await getLessonNotesAction(currentLesson.lesson_id);

        if (!cancelled) {
          setNotes(data);
        }
      } finally {
        if (!cancelled) {
          setNotesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id, activeTab]);

  // =========================================================
  // LOAD RESOURCES
  // =========================================================

  // Lấy danh sách tài liệu
  useEffect(() => {
    if (!currentLesson?.lesson_id) {
      setResources([]);
      return;
    }

    if (activeTab !== "resources") {
      setResources([]);
      setResourcesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setResourcesLoading(true);

        const data = await getLessonResourcesAction(currentLesson.lesson_id);

        if (!cancelled) {
          setResources(data);
        }
      } finally {
        if (!cancelled) {
          setResourcesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id, activeTab]);

  // =========================================================
  // FLAT LESSONS
  // =========================================================

  const flatLessons = useMemo(() => {
    if (!course) return [];

    const flat: {
      subject: SubjectLearningStructure;
      module: ModuleLearningStructure;
      lesson: LessonWithStatus;
    }[] = [];

    course.subjects.forEach((subject) => {
      subject.modules.forEach((mod) => {
        mod.lessons.forEach((lesson) => {
          flat.push({
            subject,
            module: mod,
            lesson: lesson as LessonWithStatus,
          });
        });
      });
    });

    return flat;
  }, [course]);

  // =========================================================
  // PROGRESS
  // =========================================================

  const completedCount = flatLessons.filter(
    (item) => item.lesson.status === LessonStatus.COMPLETED,
  ).length;

  const progressPercent =
    flatLessons.length > 0
      ? Math.round((completedCount / flatLessons.length) * 100)
      : 0;

  // =========================================================
  // LAST LESSON
  // =========================================================

  const isLastLesson = useMemo(() => {
    if (!currentLesson || flatLessons.length === 0) {
      return false;
    }

    const idx = flatLessons.findIndex(
      (item) => item.lesson.lesson_id === currentLesson.lesson_id,
    );

    return idx === flatLessons.length - 1;
  }, [currentLesson, flatLessons]);

  // =========================================================
  // FIND NEXT LOCKED LESSON
  // =========================================================

  const findNextLockedLesson = (startIndex: number) => {
    for (let i = startIndex; i < flatLessons.length; i++) {
      if (flatLessons[i].lesson.status === LessonStatus.LOCKED) {
        return flatLessons[i];
      }
    }

    return null;
  };

  // =========================================================
  // VIDEO PROGRESS
  // =========================================================

  const handleProgressUpdate = async (updatedProgress: VideoProgress) => {
    if (!updatedProgress.video_progress_id) {
      return;
    }

    const result = await updateVideoProgressAction(
      updatedProgress.video_progress_id,
      {
        last_watched_second: updatedProgress.last_watched_second,

        max_watched_second: updatedProgress.max_watched_second,

        completion_percentage: updatedProgress.completion_percentage,

        is_finished: updatedProgress.is_finished,
      },
    );

    if (!result.success) {
      console.error("Đồng bộ tiến độ video thất bại:", result.error);
    }
  };

  // =========================================================
  // SELECT LESSON
  // =========================================================

  const selectLesson = (
    subject: SubjectLearningStructure,
    lesson: LessonWithStatus,
  ) => {
    if (lesson.status === LessonStatus.LOCKED) {
      return;
    }

    const isChangingLesson = lesson.lesson_id !== currentLesson?.lesson_id;

    const mustFinishCurrentSlides =
      !isTester &&
      isChangingLesson &&
      currentLesson?.is_slide_presentation &&
      currentLesson.status !== LessonStatus.COMPLETED &&
      !hasViewedAllSlides;

    if (mustFinishCurrentSlides) {
      alert(
        "Bạn cần xem tất cả slide của bài học hiện tại trước khi chuyển sang bài khác.",
      );
      return;
    }

    setCurrentSubject(subject);
    setCurrentLesson(lesson);

    setLastLessonId(id, lesson.lesson_id);

    setActiveTab(lesson.is_quiz ? "quiz" : "lecture");
  };

  // =========================================================
  // MODULE SLIDE NAVIGATION
  // =========================================================

  const moduleLessonNavigation = useMemo(() => {
    if (!course || !currentLesson) {
      return {
        previous: null,
        next: null,
      };
    }

    for (const subject of course.subjects) {
      for (const mod of subject.modules) {
        const currentLessonIndex = mod.lessons.findIndex(
          (lesson) => lesson.lesson_id === currentLesson.lesson_id,
        );

        if (currentLessonIndex === -1) {
          continue;
        }

        const previousLesson = mod.lessons[currentLessonIndex - 1] as
          | LessonWithStatus
          | undefined;

        const nextLesson = mod.lessons[currentLessonIndex + 1] as
          | LessonWithStatus
          | undefined;

        return {
          previous:
            previousLesson && previousLesson.status !== LessonStatus.LOCKED
              ? {
                  subject,
                  module: mod,
                  lesson: previousLesson,
                }
              : null,

          next: nextLesson
            ? {
                subject,
                module: mod,
                lesson: nextLesson,
              }
            : null,
        };
      }
    }

    return {
      previous: null,
      next: null,
    };
  }, [course, currentLesson]);

  const navigateToModuleLesson = (direction: "previous" | "next") => {
    const target = moduleLessonNavigation[direction];

    if (!target) return;

    selectLesson(target.subject, target.lesson);

    setExpandedSubjects((prev) => ({
      ...prev,
      [target.subject.subject_id]: true,
    }));

    setExpandedModules((prev) => ({
      ...prev,
      [target.module.module_id]: true,
    }));
  };

  // =========================================================
  // SYNC QUIZ LESSON UI STATE
  // =========================================================

  const syncLessonUiState = (
    submissionStatus: string | undefined,

    markCurrentCompleted: boolean,

    unlockNext: boolean,
  ) => {
    if (!currentLesson || !course) {
      return;
    }

    const currentIndex = flatLessons.findIndex(
      (item) => item.lesson.lesson_id === currentLesson.lesson_id,
    );

    const nextItem =
      currentIndex !== -1 && currentIndex + 1 < flatLessons.length
        ? flatLessons[currentIndex + 1]
        : null;

    const nextAlreadyAccessible =
      !!nextItem &&
      nextItem.lesson.status !== LessonStatus.LOCKED &&
      !nextItem.lesson.is_optional;

    const unlockTarget =
      unlockNext && currentIndex !== -1 && !nextAlreadyAccessible
        ? findNextLockedLesson(currentIndex + 1)
        : null;

    setCourse((prevCourse) => {
      if (!prevCourse) {
        return prevCourse;
      }

      return {
        ...prevCourse,

        subjects: prevCourse.subjects.map((sub) => ({
          ...sub,

          modules: sub.modules.map((mod) => ({
            ...mod,

            lessons: mod.lessons.map((les: any) => {
              if (les.lesson_id === currentLesson.lesson_id) {
                return {
                  ...les,

                  submit_status: submissionStatus ?? les.submit_status,

                  ...(markCurrentCompleted
                    ? {
                        status: LessonStatus.COMPLETED,
                      }
                    : {}),
                };
              }

              if (
                unlockTarget &&
                les.lesson_id === unlockTarget.lesson.lesson_id
              ) {
                return {
                  ...les,
                  status: LessonStatus.UNLOCKED,
                };
              }

              return les;
            }),
          })),
        })),
      };
    });

    setCurrentLesson((prev: LessonWithStatus | undefined) =>
      prev
        ? {
            ...prev,

            submit_status: (submissionStatus ??
              prev.submit_status) as LessonWithStatus["submit_status"],

            ...(markCurrentCompleted
              ? {
                  status: LessonStatus.COMPLETED,
                }
              : {}),
          }
        : prev,
    );
  };

  // =========================================================
  // QUIZ PASSED
  // =========================================================

  const handleQuizPassed = (submissionStatus?: string, isPass?: boolean) => {
    const isFailed = isPass === false;

    if (isFailed) {
      return;
    }

    syncLessonUiState(submissionStatus, true, true);
  };

  // =========================================================
  // QUIZ SUBMITTED -> UNLOCK ONLY
  // =========================================================

  const handleNextLessonUnlockedOnly = (submissionStatus?: string) => {
    syncLessonUiState(submissionStatus, false, true);
  };

  // =========================================================
  // PEER REVIEW SUBMITTED
  // =========================================================

  const handlePeerReviewSubmitted = async (
    isAllAssignmentsCompleted: boolean,
  ) => {
    if (!currentLesson) {
      return;
    }

    const res = await getQuizStatusByLessonAction(currentLesson.lesson_id);

    if (res.success && res.data) {
      const newStatus = res.data.status ?? null;

      setActiveQuizStatus(newStatus);

      if (
        isAllAssignmentsCompleted &&
        newStatus === SubmissionStatus.GRADED &&
        res.data.is_passed === true
      ) {
        handleQuizPassed(newStatus, true);
      }
    }

    // Force QuizSection remount
    setQuizStatusRefreshKey((key) => key + 1);
  };

  // =========================================================
  // GO TO NEXT LESSON
  // =========================================================

  const handleGoToNextLesson = () => {
    if (!currentLesson) {
      return;
    }

    const currentIndex = flatLessons.findIndex(
      (item) => item.lesson.lesson_id === currentLesson.lesson_id,
    );

    if (currentIndex !== -1 && currentIndex + 1 < flatLessons.length) {
      const nextItem = flatLessons[currentIndex + 1];

      if (nextItem.lesson.status !== LessonStatus.LOCKED) {
        selectLesson(nextItem.subject, nextItem.lesson);

        setExpandedSubjects((prev) => ({
          ...prev,
          [nextItem.subject.subject_id]: true,
        }));

        setExpandedModules((prev) => ({
          ...prev,
          [nextItem.module.module_id]: true,
        }));
      }
    }
  };

  // =========================================================
  // COMPLETE AND NEXT
  // =========================================================

  const handleCompleteAndNext = async () => {
    if (!currentLesson || !course) {
      return;
    }

    if (
      !isTester &&
      currentLesson.is_slide_presentation &&
      currentLesson.status !== LessonStatus.COMPLETED &&
      !hasViewedAllSlides
    ) {
      alert("Bạn cần xem tất cả slide trước khi chuyển sang bài tiếp theo.");
      return;
    }

    const targetLessonId = currentLesson.lesson_id;

    const isOptionalLesson = Boolean(currentLesson.is_optional);

    setCompleting(true);

    try {
      const result = await completeLessonAction(targetLessonId);

      if (!result.success) {
        alert(result.error || "Có lỗi xảy ra khi xác nhận hoàn thành bài học.");

        return;
      }

      const currentIndex = flatLessons.findIndex(
        (item) => item.lesson.lesson_id === currentLesson.lesson_id,
      );

      const nextItem =
        currentIndex !== -1 && currentIndex + 1 < flatLessons.length
          ? flatLessons[currentIndex + 1]
          : null;

      const unlockTarget =
        !isOptionalLesson && currentIndex !== -1
          ? findNextLockedLesson(currentIndex + 1)
          : null;

      setCourse((prevCourse) => {
        if (!prevCourse) {
          return prevCourse;
        }

        return {
          ...prevCourse,

          subjects: prevCourse.subjects.map((sub) => ({
            ...sub,

            modules: sub.modules.map((mod) => ({
              ...mod,

              lessons: mod.lessons.map((les: any) => {
                if (les.lesson_id === currentLesson.lesson_id) {
                  return {
                    ...les,
                    status: LessonStatus.COMPLETED,
                  };
                }

                if (
                  unlockTarget &&
                  les.lesson_id === unlockTarget.lesson.lesson_id
                ) {
                  return {
                    ...les,
                    status: LessonStatus.UNLOCKED,
                  };
                }

                return les;
              }),
            })),
          })),
        };
      });

      setCurrentLesson((prev) =>
        prev
          ? {
              ...prev,
              status: LessonStatus.COMPLETED,
            }
          : prev,
      );

      // Nếu còn bài tiếp theo
      if (!isOptionalLesson && nextItem) {
        const updatedNextStatus =
          nextItem.lesson.status === LessonStatus.LOCKED
            ? LessonStatus.UNLOCKED
            : nextItem.lesson.status;

        const nextLessonUpdated: LessonWithStatus = {
          ...nextItem.lesson,
          status: updatedNextStatus,
        };

        selectLesson(nextItem.subject, nextLessonUpdated);

        setExpandedSubjects((prev) => ({
          ...prev,
          [nextItem.subject.subject_id]: true,
        }));

        setExpandedModules((prev) => ({
          ...prev,
          [nextItem.module.module_id]: true,
        }));
      } else if (isLastLesson) {
        alert("Chúc mừng! Bạn đã hoàn thành bài học cuối cùng của khóa học.");
      }
    } catch (err) {
      console.error("Lỗi khi bấm hoàn thành:", err);

      alert("Không thể lưu tiến độ. Vui lòng thử lại.");
    } finally {
      setCompleting(false);
    }
  };

  // =========================================================
  // SLIDE NEXT
  // =========================================================

  // Điều hướng chuyển Slide bài giảng và tự động hoàn thành bài học
  const handleSlideNext = async () => {
    if (
      !currentLesson ||
      !course ||
      completing ||
      slideCompletionInFlightRef.current
    ) {
      return;
    }

    if (
      !isTester &&
      currentLesson.is_slide_presentation &&
      currentLesson.status !== LessonStatus.COMPLETED &&
      !hasViewedAllSlides
    ) {
      alert("Bạn cần xem tất cả slide trước khi chuyển sang bài tiếp theo.");
      return;
    }

    if (currentLesson.status === LessonStatus.COMPLETED) {
      navigateToModuleLesson("next");
      return;
    }

    const target = moduleLessonNavigation.next;

    if (!target) {
      return;
    }

    const previousLesson = currentLesson;

    const previousSubject = currentSubject;

    const previousLessonStatus = currentLesson.status;

    const previousTargetStatus = target.lesson.status;

    const nextLesson: LessonWithStatus = {
      ...target.lesson,

      status:
        target.lesson.status === LessonStatus.LOCKED
          ? LessonStatus.UNLOCKED
          : target.lesson.status,
    };

    slideCompletionInFlightRef.current = true;

    setCompleting(true);

    // Optimistic UI
    setCourse((prevCourse) => {
      if (!prevCourse) {
        return prevCourse;
      }

      return {
        ...prevCourse,

        subjects: prevCourse.subjects.map((subject) => ({
          ...subject,

          modules: subject.modules.map((mod) => ({
            ...mod,

            lessons: mod.lessons.map((lesson: any) => {
              if (lesson.lesson_id === previousLesson.lesson_id) {
                return {
                  ...lesson,
                  status: LessonStatus.COMPLETED,
                };
              }

              if (lesson.lesson_id === nextLesson.lesson_id) {
                return {
                  ...lesson,
                  status: nextLesson.status,
                };
              }

              return lesson;
            }),
          })),
        })),
      };
    });

    selectLesson(target.subject, nextLesson);

    setExpandedSubjects((prev) => ({
      ...prev,
      [target.subject.subject_id]: true,
    }));

    setExpandedModules((prev) => ({
      ...prev,
      [target.module.module_id]: true,
    }));

    try {
      const result = await completeLessonAction(previousLesson.lesson_id);

      if (!result.success) {
        throw new Error(
          result.error || "Không thể lưu trạng thái hoàn thành bài học.",
        );
      }
    } catch (error) {
      console.error("Đồng bộ tiến độ bài học thất bại:", error);

      // Rollback
      setCourse((prevCourse) => {
        if (!prevCourse) {
          return prevCourse;
        }

        return {
          ...prevCourse,

          subjects: prevCourse.subjects.map((subject) => ({
            ...subject,

            modules: subject.modules.map((mod) => ({
              ...mod,

              lessons: mod.lessons.map((lesson: any) => {
                if (lesson.lesson_id === previousLesson.lesson_id) {
                  return {
                    ...lesson,
                    status: previousLessonStatus,
                  };
                }

                if (lesson.lesson_id === nextLesson.lesson_id) {
                  return {
                    ...lesson,
                    status: previousTargetStatus,
                  };
                }

                return lesson;
              }),
            })),
          })),
        };
      });

      if (previousSubject) {
        setCurrentSubject(previousSubject);
      }

      setCurrentLesson(previousLesson);

      setLastLessonId(id, previousLesson.lesson_id);

      alert(
        error instanceof Error
          ? error.message
          : "Không thể lưu tiến độ. Vui lòng thử lại.",
      );
    } finally {
      slideCompletionInFlightRef.current = false;

      setCompleting(false);
    }
  };

  // =========================================================
  // VIDEO COMPLETED
  // =========================================================

  const handleVideoCompleted = () => {
    if (!currentLesson || !course) {
      return;
    }

    const targetLessonId = currentLesson.lesson_id;

    const isOptionalLesson = Boolean(currentLesson.is_optional);

    const currentIndex = flatLessons.findIndex(
      (item) => item.lesson.lesson_id === currentLesson.lesson_id,
    );

    const nextItem =
      currentIndex !== -1 && currentIndex + 1 < flatLessons.length
        ? flatLessons[currentIndex + 1]
        : null;

    const unlockTarget =
      !isOptionalLesson && currentIndex !== -1
        ? findNextLockedLesson(currentIndex + 1)
        : null;

    setCourse((prevCourse) => {
      if (!prevCourse) {
        return prevCourse;
      }

      return {
        ...prevCourse,

        subjects: prevCourse.subjects.map((sub) => ({
          ...sub,

          modules: sub.modules.map((mod) => ({
            ...mod,

            lessons: mod.lessons.map((les: any) => {
              if (les.lesson_id === targetLessonId) {
                return {
                  ...les,
                  status: LessonStatus.COMPLETED,
                };
              }

              if (
                unlockTarget &&
                les.lesson_id === unlockTarget.lesson.lesson_id
              ) {
                return {
                  ...les,
                  status: LessonStatus.UNLOCKED,
                };
              }

              return les;
            }),
          })),
        })),
      };
    });

    setCurrentLesson((prev) =>
      prev
        ? {
            ...prev,
            status: LessonStatus.COMPLETED,
          }
        : prev,
    );

    if (!isOptionalLesson && nextItem) {
      const updatedNextStatus =
        nextItem.lesson.status === LessonStatus.LOCKED
          ? LessonStatus.UNLOCKED
          : nextItem.lesson.status;

      const nextLessonUpdated: LessonWithStatus = {
        ...nextItem.lesson,
        status: updatedNextStatus,
      };

      selectLesson(nextItem.subject, nextLessonUpdated);

      setExpandedSubjects((prev) => ({
        ...prev,
        [nextItem.subject.subject_id]: true,
      }));

      setExpandedModules((prev) => ({
        ...prev,
        [nextItem.module.module_id]: true,
      }));
    }
  };

  // =========================================================
  // TESTER FUNCTIONS
  // =========================================================

  const handleTestNext = () => {
    handleCompleteAndNext();
  };

  const handleTestPrev = () => {
    if (!currentLesson) {
      return;
    }

    const currentIndex = flatLessons.findIndex(
      (item) => item.lesson.lesson_id === currentLesson.lesson_id,
    );

    if (currentIndex <= 0) {
      return;
    }

    const prevItem = flatLessons[currentIndex - 1];

    selectLesson(prevItem.subject, prevItem.lesson);

    setExpandedSubjects((prev) => ({
      ...prev,
      [prevItem.subject.subject_id]: true,
    }));

    setExpandedModules((prev) => ({
      ...prev,
      [prevItem.module.module_id]: true,
    }));
  };

  const hideNextButton = useMemo(() => {
    return isLastLesson && currentLesson?.status === LessonStatus.COMPLETED;
  }, [isLastLesson, currentLesson?.status]);

  const testNextDisabled = useMemo(() => {
    if (!currentLesson || completing) {
      return true;
    }

    const idx = flatLessons.findIndex(
      (item) => item.lesson.lesson_id === currentLesson.lesson_id,
    );

    return idx === -1;
  }, [currentLesson, flatLessons, completing]);

  const testPrevDisabled = useMemo(() => {
    if (!currentLesson) {
      return true;
    }

    const idx = flatLessons.findIndex(
      (item) => item.lesson.lesson_id === currentLesson.lesson_id,
    );

    return idx <= 0;
  }, [currentLesson, flatLessons]);

  // =========================================================
  // TESTER KEYBOARD SHORTCUT
  // =========================================================

  useEffect(() => {
    if (!isTester) {
      return;
    }

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleTestNext();
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleTestPrev();
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [currentLesson, flatLessons, isTester]);

  // =========================================================
  // SIDEBAR EXPAND
  // =========================================================

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const isAllExpanded = useMemo(() => {
    if (!course) {
      return false;
    }

    const allSubjectIds = course.subjects.map((subject) => subject.subject_id);

    return allSubjectIds.every((subjectId) => expandedSubjects[subjectId]);
  }, [course, expandedSubjects]);

  const toggleAll = () => {
    if (!course) {
      return;
    }

    const nextState = !isAllExpanded;

    const newSubjects: Record<string, boolean> = {};

    const newModules: Record<string, boolean> = {};

    course.subjects.forEach((sub) => {
      newSubjects[sub.subject_id] = nextState;

      sub.modules.forEach((mod) => {
        newModules[mod.module_id] = nextState;
      });
    });

    setExpandedSubjects(newSubjects);

    setExpandedModules(newModules);
  };

  // =========================================================
  // VIDEO
  // =========================================================

  const hasVideo = Boolean(
    currentLesson?.video_url && currentLesson.video_url.trim() !== "",
  );

  const lessonTabs = useMemo(() => {
    const tabs: [TabKey, string][] = [
      ["lecture", "Bài giảng"],

      [
        "resources",
        `Tài liệu${resources.length ? ` (${resources.length})` : ""}`,
      ],

      ["notes", `Ghi chú${notes.length ? ` (${notes.length})` : ""}`],
    ];

    if (currentLesson?.had_quiz && !hasVideo) {
      tabs.push(["quiz", "Bài thi"]);
    }

    return tabs;
  }, [currentLesson?.had_quiz, hasVideo, resources.length, notes.length]);

  useEffect(() => {
    if (!currentLesson?.lesson_id || !hasVideo) {
      setVideoProgress(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setVideoProgressLoading(true);

        const data = await getOrCreateVideoProgressAction(
          currentLesson.lesson_id,
          currentLesson.duration_seconds ?? 0,
        );

        if (!cancelled) {
          setVideoProgress(data);
        }
      } finally {
        if (!cancelled) {
          setVideoProgressLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id, hasVideo]);

  // =========================================================
  // QUICK NOTE
  // =========================================================

  const handleQuickCreateNote = async () => {
    if (!quickNoteContent.trim() || !currentLesson || !course) {
      return;
    }

    setQuickNoteSaving(true);

    const payload: NoteCreatePayload = {
      course_id: id,
      lesson_id: currentLesson.lesson_id,
      timestamp_seconds: Math.floor(videoCurrentTime),
      content: quickNoteContent.trim(),
    };

    const result = await createNoteAction(payload);

    setQuickNoteSaving(false);

    if (result.success && result.data) {
      setNotes((prev) => [...prev, result.data as UserLessonNote]);

      setQuickNoteContent("");
      setQuickNoteOpen(false);
    } else {
      alert(result.error || "Tạo ghi chú thất bại.");
    }
  };

  // =========================================================
  // LOADING / ERROR
  // =========================================================

  if (loading) {
    return <CourseLoadingScreen />;
  }

  if (errorMessage || !course) {
    return (
      <CourseErrorScreen
        errorMessage={errorMessage}
        onBackHome={() => router.push("/home")}
      />
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className="h-screen overflow-hidden bg-[#F7F8FB] flex flex-col text-[#161826]"
      style={{
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {!slideFocusMode && (
        <>
          <Navbar />

          <CourseHeaderBar
            courseTitle={course.title}
            progressPercent={progressPercent}
            onLeaveCourse={() => router.push("/dashboard-student")}
          />
        </>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!slideFocusMode && (
          <CourseSidebar
            course={course}
            expandedSubjects={expandedSubjects}
            expandedModules={expandedModules}
            onToggleSubject={toggleSubject}
            onToggleModule={toggleModule}
            isAllExpanded={isAllExpanded}
            onToggleAll={toggleAll}
            completedCount={completedCount}
            totalLessons={flatLessons.length}
            currentLessonId={currentLesson?.lesson_id}
            onSelectLesson={selectLesson}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
          />
        )}

        {/* Khung hiển thị nội dung bài học */}
        <div
          ref={lessonContentScrollRef}
          className={`flex min-h-0 flex-1 flex-col bg-[#F7F8FB] ${
            slideFocusMode ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          <div
            className={
              slideFocusMode
                ? "flex min-h-0 max-w-none flex-1 flex-col"
                : "max-w-7xl flex-1 space-y-6 px-10 pt-8"
            }
          >
            {!slideFocusMode && (
              <LessonTitleHeader
                subjectTitle={currentSubject?.title}
                subjectAccentColor={
                  currentSubject
                    ? getSubjectAccent(course, currentSubject.subject_id)
                    : "#5B5FEF"
                }
                isOptional={currentLesson?.is_optional}
                lessonTitle={currentLesson?.title}
              />
            )}

            {!slideFocusMode && !currentLesson?.is_quiz && (
              <LessonTabsNav
                tabs={lessonTabs}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            )}

            {/* =====================================================
                TAB BÀI GIẢNG
            ===================================================== */}

            {activeTab === "lecture" &&
              !currentLesson?.is_quiz &&
              currentLesson && (
                <div
                  key="lecture"
                  className={
                    slideFocusMode
                      ? "flex min-h-0 flex-1 flex-col"
                      : "anim-fade-up space-y-6 pb-12"
                  }
                >
                  <LectureTabContent
                    courseId={id}
                    currentLesson={currentLesson}
                    isFocusMode={slideFocusMode}
                    onFocusModeChange={setSlideFocusMode}
                    hasVideo={hasVideo}
                    videoProgress={videoProgress}
                    videoProgressLoading={videoProgressLoading}
                    onProgressUpdate={handleProgressUpdate}
                    onTimeUpdate={setVideoCurrentTime}
                    onVideoEnded={handleVideoCompleted}
                    quickNoteOpen={quickNoteOpen}
                    quickNoteContent={quickNoteContent}
                    quickNoteSaving={quickNoteSaving}
                    videoCurrentTime={videoCurrentTime}
                    onQuickNoteOpen={() => setQuickNoteOpen(true)}
                    onQuickNoteContentChange={setQuickNoteContent}
                    onQuickNoteSave={handleQuickCreateNote}
                    onQuickNoteCancel={() => {
                      setQuickNoteOpen(false);
                      setQuickNoteContent("");
                    }}
                    completing={completing}
                    onCompleteAndNext={handleCompleteAndNext}
                    hasPreviousLesson={Boolean(moduleLessonNavigation.previous)}
                    hasNextLesson={
                      Boolean(moduleLessonNavigation.next) && !completing
                    }
                    onPreviousLesson={() => navigateToModuleLesson("previous")}
                    onNextLesson={handleSlideNext}
                    hasViewedAllSlides={hasViewedAllSlides}
                    onSlideProgressChange={setHasViewedAllSlides}
                  />

                  {/* Tester feedback */}
                  {isTester && (
                    <TesterFeedbackPanel
                      courseId={id}
                      lessonId={currentLesson.lesson_id}
                      lessonTitle={currentLesson.title}
                    />
                  )}
                </div>
              )}

            {/* =====================================================
                TAB RESOURCES
            ===================================================== */}

            {activeTab === "resources" && !currentLesson?.is_quiz && (
              <div key="resources" className="anim-fade-up space-y-3 pb-12">
                <ResourcesTabContent
                  loading={resourcesLoading}
                  resources={resources}
                  courseBackendUrl={COURSE_URL}
                />
              </div>
            )}

            {/* =====================================================
                TAB NOTES
            ===================================================== */}

            {activeTab === "notes" &&
              !currentLesson?.is_quiz &&
              currentLesson && (
                <div key="notes" className="anim-fade-up pb-12">
                  <LessonNotesPanel
                    courseId={id}
                    lessonId={currentLesson.lesson_id}
                    hasVideo={hasVideo}
                    videoCurrentTime={videoCurrentTime}
                    notes={notes}
                    loading={notesLoading}
                    onNotesChange={setNotes}
                    onSeekRequest={(seconds) => {
                      setSeekTarget(seconds);
                      setActiveTab("lecture");
                    }}
                  />
                </div>
              )}

            {/* =====================================================
                TAB QUIZ
            ===================================================== */}

            {(activeTab === "quiz" || currentLesson?.is_quiz) &&
              currentLesson && (
                <div key="quiz" className="anim-fade-up space-y-6 pb-12">
                  <QuizSection
                    key={`${currentLesson.lesson_id}-${quizStatusRefreshKey}`}
                    lessonId={currentLesson.lesson_id}
                    courseId={id}
                    onQuizPassed={handleQuizPassed}
                    onNextLessonUnlocked={handleNextLessonUnlockedOnly}
                    isPeerReview={currentLesson.is_peer_review}
                    onQuizIdResolved={(quizId, status) => {
                      setActiveQuizId(quizId);

                      setActiveQuizStatus(status ?? null);
                    }}
                  />

                  {/* =================================================
                      PEER REVIEW
                  ================================================= */}

                  {currentLesson.is_peer_review &&
                    activeQuizId &&
                    (activeQuizStatus === SubmissionStatus.SUBMITTED ||
                      activeQuizStatus === SubmissionStatus.GRADED) && (
                      <PeerReviewSection
                        quizId={activeQuizId}
                        onReviewSubmitted={handlePeerReviewSubmitted}
                      />
                    )}

                  {/* =================================================
                      NEXT LESSON BUTTON FOR QUIZ
                  ================================================= */}

                  {(activeQuizStatus === SubmissionStatus.SUBMITTED ||
                    activeQuizStatus === SubmissionStatus.GRADED ||
                    currentLesson.status === LessonStatus.COMPLETED) && (
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleGoToNextLesson}
                        disabled={isLastLesson}
                        className="px-6 py-2.5 bg-[#5B5FEF] text-white font-medium rounded-lg hover:bg-[#4B4FEF] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                      >
                        <span>Bài tiếp theo</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* =========================================================
          TESTER NAVIGATION
      ========================================================= */}

      {isTester && (
        <TestModeNextButton
          onNext={handleTestNext}
          onPrev={handleTestPrev}
          disabled={testNextDisabled}
          disabledPrev={testPrevDisabled}
          isLast={isLastLesson}
          hideNext={hideNextButton}
        />
      )}
    </div>
  );
}
