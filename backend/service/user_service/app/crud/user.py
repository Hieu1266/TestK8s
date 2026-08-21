from sqlmodel import Session, select
from pydantic import EmailStr
from app.crud.base import CRUDBase
from app.models.user import User
from app.models.profile import Profile
from app.schemas.user import UserCreate, UserUpdate
from uuid import UUID

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate, UUID]):
    def create(self, db: Session, obj_in: UserCreate) -> User:
        if obj_in.role_id is None:
            db_user = self.model.model_validate(obj_in, update={"role_id": 2}) #Gán role cho người dùng mới tạo là user có id là 2
        db_user = self.model.model_validate(obj_in)
        db.add(db_user)
        db.flush()
        
        auto_profile = Profile(
            user_id=db_user.user_id,
            firstname=db_user.username,
            lastname=None,
            bio=None,
            avatar_url=None
        )
        db.add(auto_profile)
        db.commit()
        db.refresh(db_user)
        
        return db_user
        
    # Lấy danh sách user dựa theo role
    def get_multi_by_role(self, db: Session, role_id: int, skip: int = 0, limit: int = 10) -> list[User]:
        statement = select(self.model).where(self.model.role_id == role_id).offset(skip).limit(limit)
        return db.exec(statement).all()
    # Lấy danh sách user dựa theo status
    def get_multi_by_status(self, db: Session, status_id: str, skip: int = 0, limit: int = 10) -> list[User]:
        statement = select(self.model).where(self.model.status_id == status_id).offset(skip).limit(limit)
        return db.exec(statement).all()


    # Lay ds theo instructor
    def get_instructor_list(self, db: Session, status_id: str, role_id: 5, skip: int = 0, limit: int = 1000) -> list[User]:
        statement = select(self.model).where(self.model.status_id == status_id, self.model.role_id == role_id).offset(skip).limit(limit)
        return db.exec(statement).all()

    def get_name_by_id(self, db: Session, user_id: UUID) -> str:
        statement = select(User.username).where(
            User.user_id == user_id
        )    
        return db.exec(statement).first()
    # Lấy thông tin user dựa theo email
    def get_by_email(self, db: Session, email: EmailStr) -> User | None:
        statement = select(self.model).where(self.model.email == email)
        return db.exec(statement).first()
    def get_or_create_google_user(self, db: Session, google_payload: dict) -> User:
        email = google_payload.get("email")
        full_name = google_payload.get("name") or google_payload.get("given_name", "")
        picture = google_payload.get("picture")

        # 1. Kiểm tra xem User đã tồn tại qua Email chưa
        user = self.get_by_email(db, email=email)
        
        # 2. Nếu đã tồn tại, trả về luôn để xử lý đăng nhập
        if user:
            return user

        # 3. Nếu chưa tồn tại, tiến hành tạo mới tài khoản tự động (Đăng ký)
        try:
            default_username = email.split("@")[0]
            
            # Khởi tạo thực thể User (Dùng mật khẩu là None vì qua Google)
            db_user = self.model(
                role_id=2,  # Mặc định là role user thông thường
                username=default_username[:50],
                email=email,
                password=None,
                birthdate=None
            )
            db.add(db_user)
            db.flush()  # Sinh ra user_id tạm thời phục vụ cho Profile khóa ngoại

            # Tách chuỗi Họ và Tên từ chuỗi full_name của Google
            name_parts = full_name.strip().split(" ")
            if len(name_parts) > 1:
                firstname = name_parts[-1]
                lastname = " ".join(name_parts[:-1])
            else:
                firstname = full_name if full_name else default_username
                lastname = None

            # Khởi tạo Profile đi kèm với dữ liệu từ Google Mail
            auto_profile = Profile(
                user_id=db_user.user_id,
                firstname=firstname[:50],
                lastname=lastname[:50] if lastname else None,
                bio="Tài khoản khởi tạo qua Google Auth.",
                avatar_url=picture
            )
            db.add(auto_profile)
            db.commit()
            db.refresh(db_user)
            return db_user

        except Exception as e:
            db.rollback()
            raise e

    def is_tester(self, db: Session, user_id: UUID) -> bool:
        statement = select(User.user_id).where(
            User.user_id == user_id,
            User.role_id == 3
        )

        rs = db.exec(statement).first()
        return rs is not None

    def get_tester_list(self, db: Session, skip: int = 0, limit: int = 100) -> list[User]:
        statement = (
            select(self.model)
            .where(self.model.role_id == 3)
            .offset(skip)
            .limit(limit)
        )
        return db.exec(statement).all()

crud_user = CRUDUser(User)

