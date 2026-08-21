from sqlalchemy import create_engine
from app.core.config import settings
from sqlmodel import SQLModel, Session, select, func
from app.models.role import Role
from app.models.status_catalog import StatusCatalog, UserStatus
from app.models.user import User
from app.models.profile import Profile
from app.core.security import hash_password
engine = create_engine(settings.USERS_DB_URL)


def get_db():
    with Session(engine) as session:
        yield session


def init_db() -> None:
    import app.models.user
    import app.models.role
    import app.models.status_catalog
    import app.models.profile
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Kiểm tra xem bảng Role đã có dữ liệu chưa 
        statement = select(func.count()).select_from(Role)
        role_count = session.exec(statement).one()

        if role_count == 0:
            print("Database trống! Đang tiến hành khởi tạo dữ liệu mẫu")
            # Khởi tạo dữ liệu cho bảng vai trò
            admin_role = Role(role_id=1, role_name="Admin", description="Quản trị viên hệ thống")
            user_role = Role(role_id=2, role_name="User", description="Người dùng")
            tester_role = Role(role_id=3, role_name="Tester", description="Người kiểm thử")
            instructor_role = Role(role_id=4, role_name="Instructor", description="Giảng viên")
            manager_role = Role(role_id=5, role_name="Manager", description="Quản lý đào tạo")

            session.add(admin_role)
            session.add(user_role)
            session.add(tester_role)
            session.add(instructor_role)
            session.add(manager_role)

            # Khởi tạo dữ liệu cho bảng trạng thái
            active_status = StatusCatalog(
                status_id="ACTIVE",
                status_key=UserStatus.ACTIVE,
                display_name="Hoạt động",
                description="Tài khoản đang hoạt động"
            )
            unactive_status = StatusCatalog(
                status_id="UNACTIVE",
                status_key=UserStatus.UNACTIVE,
                display_name="Không hoạt động",
                description="Tài khoản không hoạt động"
            )
            banned_status = StatusCatalog(
                status_id="BANNED",
                status_key=UserStatus.BANNED,
                display_name="Bị khóa",
                description="Tài khoản vi phạm chính sách"
            )
            session.add(active_status)
            session.add(unactive_status)
            session.add(banned_status)
            session.commit()

            sample_user = User(
                role_id=1,  # Vai trò quản trị viên
                username="admin",
                email="admin@gmail.com",
                password=hash_password("admin123"),  
                status_id="ACTIVE"
            )
            session.add(sample_user)
            session.commit() 
            session.refresh(sample_user)

            # Khởi tạo bảng dữ liệu profile
            sample_profile = Profile(
                user_id=sample_user.user_id, # Lấy UUID của user vừa tạo
                firstname="Hệ Thống",
                lastname="Quản Trị",
                bio="Tài khoản admin mặc định của hệ thống",
                avatar_url="https://example.com/avatar.png"
            )
            session.add(sample_profile)
            
            # Lưu lại toàn bộ
            session.commit()
            print("Thêm dữ liệu mẫu thành công!")
        else:
            print("Database đã có dữ liệu. Bỏ qua bước thêm dữ liệu mẫu.")
