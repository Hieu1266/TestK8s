from enum import Enum

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE" # Trắc nghiệm (Một hoặc nhiều đáp án)
    ESSAY = "ESSAY"                     # Tự luận (Hỗ trợ text, LaTeX, đồ thị)
    TRUE_FALSE = "TRUE_FALSE"           # Câu hỏi đúng sai
    FILL_IN_BLANK = "FILL_IN_BLANK"     # Câu hỏi điền khuyết (Điền từ vào chỗ trống)

class QuizPlacementType(str, Enum):
    STANDALONE_LESSON = "STANDALONE_LESSON"  # Là một bài học độc lập trong module
    INSIDE_LESSON = "INSIDE_LESSON"          # Đính kèm hiển thị bên trong một bài đọc
    IN_VIDEO = "IN_VIDEO"                    # Nhúng vào mốc thời gian cụ thể của video

class SubmissionStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS" # Thí sinh đang làm bài (chưa nộp)
    SUBMITTED = "SUBMITTED"     # Đã nộp bài (Chờ chấm điểm nếu có tự luận)
    GRADED = "GRADED"           # Đã chấm xong điểm hoàn toàn

class ReviewStatus(str, Enum):
    PENDING = "PENDING"       # Được giao nhưng chưa chấm
    COMPLETED = "COMPLETED"   # Đã chấm xong
    SKIPPED = "SKIPPED"       # Bị bỏ qua (nếu hết hạn hoặc lý do đặc biệt)

class QuizType(str, Enum):
    RANDOM_QUESTION = "RANDOM_QUESTION" # Đề thi bốc ngẫu nhiên câu hỏi từ pool
    FIXED_QUESTION = "FIXED_QUESTION" # Đề thi có câu hỏi cố định