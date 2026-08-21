from sqlalchemy import create_engine
from app.core.config import settings
from sqlmodel import SQLModel, Session, select, func
from app.models.status_catalog import StatusCatalog


engine = create_engine(settings.COURSES_DB_URL)

STATUS_SEED_DATA = [
    # 1. TRẠNG THÁI CỦA CHƯƠNG TRÌNH ĐÀO TẠO (entity_type: "CURRICULUM")
    StatusCatalog(
        status_id="CURRICULUM_DRAFT",
        entity_type="CURRICULUM",
        status_key="DRAFT",
        display_name="Biên soạn",
        description="Chương trình đào tạo đang trong giai đoạn dự thảo, xây dựng cấu trúc."
    ),
    StatusCatalog(
        status_id="CURRICULUM_PENDING",
        entity_type="CURRICULUM",
        status_key="PENDING_APPROVAL",
        display_name="Chờ phê duyệt",
        description="Chương trình đào tạo đã hoàn thiện, đang chờ Hội đồng Khoa/Trường thẩm định."
    ),
    StatusCatalog(
        status_id="CURRICULUM_ACTIVE",
        entity_type="CURRICULUM",
        status_key="ACTIVE",
        display_name="Đang áp dụng",
        description="Chương trình đào tạo đã được ký duyệt quyết định ban hành và đang áp dụng giảng dạy."
    ),
    StatusCatalog(
        status_id="CURRICULUM_ARCHIVED",
        entity_type="CURRICULUM",
        status_key="ARCHIVED",
        display_name="Ngưng áp dụng",
        description="Chương trình đào tạo cũ, ngừng tuyển sinh mới nhưng lưu vết để quản lý sinh viên khóa cũ."
    ),

    # 2. TRẠNG THÁI CỦA ĐỀ CƯƠNG MÔN HỌC (entity_type: "SYLLABUS")
    StatusCatalog(
        status_id="SYLLABUS_DRAFT",
        entity_type="SYLLABUS",
        status_key="DRAFT",
        display_name="Đang soạn thảo",
        description="Giảng viên đang biên soạn nội dung, đề mục, chuẩn đầu ra và tài liệu tham khảo."
    ),
    StatusCatalog(
        status_id="SYLLABUS_REVIEWING",
        entity_type="SYLLABUS",
        status_key="REVIEWING",
        display_name="Đang thẩm định",
        description="Đề cương đang được Bộ môn/Hội đồng khoa học xem xét, góp ý chỉnh sửa."
    ),
    StatusCatalog(
        status_id="SYLLABUS_APPROVED",
        entity_type="SYLLABUS",
        status_key="APPROVED",
        display_name="Đã phê duyệt",
        description="Đề cương môn học được thông qua chính thức, sẵn sàng liên kết vào môn học."
    ),
    StatusCatalog(
        status_id="SYLLABUS_REJECTED",
        entity_type="SYLLABUS",
        status_key="REJECTED",
        display_name="Bị từ chối",
        description="Đề cương không đạt yêu cầu chuyên môn, cần chỉnh sửa tái thẩm định."
    ),

    # 3. TRẠNG THÁI CỦA MÔN HỌC / HỌC PHẦN (entity_type: "SUBJECT")
    StatusCatalog(
        status_id="SUBJECT_DEVELOPING",
        entity_type="SUBJECT",
        status_key="DEVELOPING",
        display_name="Đang xây dựng",
        description="Môn học mới được phê duyệt danh mục, đang đợi cấu hình nội dung và đề cương chi tiết."
    ),
    StatusCatalog(
        status_id="SUBJECT_ACTIVE",
        entity_type="SUBJECT",
        status_key="ACTIVE",
        display_name="Sẵn sàng giảng dạy",
        description="Môn học đã hoàn thiện đầy đủ pháp lý, sẵn sàng mở các lớp học phần học kỳ."
    ),
    StatusCatalog(
        status_id="SUBJECT_SUSPENDED",
        entity_type="SUBJECT",
        status_key="SUSPENDED",
        display_name="Tạm ngưng mở",
        description="Tạm thời không tổ chức giảng dạy môn học này trong một vài học kỳ."
    ),

    # 4. TRẠNG THÁI CỦA KHÓA HỌC / LỚP HỌC PHẦN (entity_type: "COURSE")
    StatusCatalog(
        status_id="COURSE_REGISTRATION",
        entity_type="COURSE",
        status_key="REGISTRATION_OPEN",
        display_name="Đang mở đăng ký",
        description="Khóa học/Lớp học phần trực tuyến đang mở, cho phép học viên bấm ghi danh/đăng ký."
    ),
    StatusCatalog(
        status_id="COURSE_UPCOMING",
        entity_type="COURSE",
        status_key="UPCOMING",
        display_name="Sắp diễn ra",
        description="Đã đóng cổng đăng ký, khóa học đang chờ đến ngày khai giảng cấu hình thời gian."
    ),
    StatusCatalog(
        status_id="COURSE_ONGOING",
        entity_type="COURSE",
        status_key="ONGOING",
        display_name="Đang diễn ra",
        description="Khóa học đang trong thời gian giảng dạy, học viên đang tương tác học tập."
    ),
    StatusCatalog(
        status_id="COURSE_COMPLETED",
        entity_type="COURSE",
        status_key="COMPLETED",
        display_name="Đã kết thúc",
        description="Khóa học đã đóng luồng tương tác, kết thúc thi cử và ghi nhận điểm số đóng băng."
    )
]

def seed_status_catalog(session: Session) -> None:
    existing_ids = set(session.exec(select(StatusCatalog.status_id)).all())
    
    has_new_records = False
    for status_item in STATUS_SEED_DATA:
        if status_item.status_id not in existing_ids:
            session.add(status_item)
            has_new_records = True
            
    if has_new_records:
        session.commit()

def init_db() -> None:
    import app.models.course
    import app.models.curriculum
    import app.models.lesson
    import app.models.lesson_resource
    import app.models.module
    import app.models.status_catalog
    import app.models.course_instructor_link
    import app.models.course_tag_link
    import app.models.subject
    import app.models.syllabus
    import app.models.tag
    import app.models.presentation
    import app.models.presentation_slide
    import app.models.content_annotation
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_status_catalog(session)