from uuid import UUID
from typing import Optional, Union
from sqlmodel import Session, select, func, col

from app.crud.base import CRUDBase
from app.models.module import Module
from app.models.lesson import Lesson
from app.models.subject import Subject
from app.models.syllabus import Syllabus
from app.schemas.module import ModuleCreate, ModuleUpdate


class CRUDModule(CRUDBase[Module, ModuleCreate, ModuleUpdate, UUID]):
    # Lấy danh sách module theo subject_id (Sắp xếp theo thứ tự order_index)
    def get_by_subject(self, db: Session, subject_id: UUID) -> list[Module]:
        statement = (
            select(Module)
            .where(Module.subject_id == subject_id)
            .order_by(Module.order_index.asc())
        )
        return db.exec(statement).all()

    def get_course_owner(self, db: Session, module_id: UUID) -> Optional[UUID]:
        statement = (
            select(Syllabus.instructor_id)
            .select_from(Module)
            .join(Subject, Module.subject_id == Subject.subject_id)
            .join(Syllabus, Subject.subject_id == Syllabus.subject_id)
            .where(Module.module_id == module_id)
        )
        return db.exec(statement).first()

    def get_total_module_by_subject(self, db: Session, subject_id: UUID) -> int:
        statement = (
            select(func.count(Module.module_id))
            .where(Module.subject_id == subject_id)
        )
        return db.exec(statement).first() or 0

    def get_total_module_by_instructor(self, db: Session, instructor_id: UUID) -> int:
        statement = (
            select(func.count(Module.module_id))
            .join(Subject, Subject.subject_id == Module.subject_id)
            .join(Syllabus, Syllabus.subject_id == Subject.subject_id)
            .where(Syllabus.instructor_id == instructor_id)
        )
        return db.exec(statement).first() or 0

    # 1. TẠO MỚI (Sử dụng subject_id)
    def create(self, db: Session, obj_in: Union[ModuleCreate, Module, dict]) -> Module:
        if isinstance(obj_in, self.model):
            obj_data = obj_in.model_dump()
        elif isinstance(obj_in, dict):
            obj_data = obj_in.copy()
        else:
            obj_data = obj_in.model_dump()

        obj_data.pop("syllabus_id", None)

        # 1. Ép kiểu subject_id về UUID để so sánh chính xác trong SQL
        subject_id = obj_data.get("subject_id")
        if isinstance(subject_id, str):
            subject_id = UUID(subject_id)
        obj_data["subject_id"] = subject_id

        order_index = obj_data.get("order_index")

        # 2. Nếu không truyền order_index (hoặc truyền <= 0) -> Tự động lấy max + 1
        if order_index is None or order_index <= 0:
            max_stmt = (
                select(func.max(Module.order_index))
                .where(Module.subject_id == subject_id)
            )
            max_order = db.exec(max_stmt).first()
            
            # Nếu chưa có module nào thì max_order là None -> gán = 1
            obj_data["order_index"] = (max_order or 0) + 1
            
        else:
            # 3. Nếu người dùng chủ động chọn vị trí order_index cụ thể -> Dồn các module phía sau
            shift_stmt = (
                select(Module)
                .where(Module.subject_id == subject_id)
                .where(Module.order_index >= order_index)
            )
            items_to_shift = db.exec(shift_stmt).all()
            for item in items_to_shift:
                item.order_index += 1
                db.add(item)

        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # 2. CẬP NHẬT (Sắp xếp lại theo subject_id)
    def update(self, db: Session, db_obj: Module, obj_in: ModuleUpdate) -> Module:
        update_data = obj_in.model_dump(exclude_unset=True, exclude_none=True)
        old_order = db_obj.order_index
        new_order = update_data.get("order_index")

        if new_order is not None and new_order != old_order:
            subject_id = db_obj.subject_id

            if new_order > old_order:
                # Chuyển xuống vị trí lớn hơn -> Giảm order_index các phần tử ở giữa đi 1
                shift_stmt = (
                    select(Module)
                    .where(Module.subject_id == subject_id)
                    .where(Module.order_index > old_order)
                    .where(Module.order_index <= new_order)
                )
                items = db.exec(shift_stmt).all()
                for item in items:
                    item.order_index -= 1
                    db.add(item)
            else:
                # Chuyển lên vị trí nhỏ hơn -> Tăng order_index các phần tử ở giữa lên 1
                shift_stmt = (
                    select(Module)
                    .where(Module.subject_id == subject_id)
                    .where(Module.order_index >= new_order)
                    .where(Module.order_index < old_order)
                )
                items = db.exec(shift_stmt).all()
                for item in items:
                    item.order_index += 1
                    db.add(item)

        # Cập nhật các trường còn lại
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # 3. XÓA (Tự động cập nhật order_index theo subject_id)
    def delete(self, db: Session, id: UUID) -> Module | None:
        db_obj = db.get(self.model, id)
        if not db_obj:
            return None

        deleted_order = db_obj.order_index
        subject_id = db_obj.subject_id

        # Xóa bản ghi hiện tại
        db.delete(db_obj)

        # Cập nhật lại thứ tự của các module phía sau
        if deleted_order is not None:
            shift_stmt = (
                select(Module)
                .where(Module.subject_id == subject_id)
                .where(Module.order_index > deleted_order)
            )
            remaining_items = db.exec(shift_stmt).all()
            for item in remaining_items:
                item.order_index -= 1
                db.add(item)

        db.commit()
        return db_obj
    
    def count_lessons(self, db: Session, module_id: UUID) -> int:
        """
        Đếm tổng số bài học trong 1 module cụ thể
        """
        if isinstance(module_id, str):
            module_id = UUID(module_id)

        statement = (
            select(func.count(Lesson.lesson_id))
            .where(Lesson.module_id == module_id)
        )
        
        count = db.exec(statement).first()
        return count or 0

    def get_ids_by_subject_ids(self, db: Session, subject_ids: list[UUID]) -> list[UUID]:
            if not subject_ids:
                return []
            statement = select(Module.module_id).where(Module.subject_id.in_(subject_ids))
            return db.exec(statement).all()

    
crud_module = CRUDModule(Module)