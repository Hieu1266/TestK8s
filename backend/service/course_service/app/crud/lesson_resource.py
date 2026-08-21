from uuid import UUID
from typing import List
from sqlmodel import Session, select
from app.crud.base import CRUDBase
from app.models.lesson_resource import LessonResource

# CreateSchemaType/UpdateSchemaType tạm để `dict` vì thao tác tạo được xử lý trực tiếp
# bằng cách truyền vào một instance LessonResource đã dựng sẵn (xem CRUDBase.create,
# nhánh isinstance(obj_in, self.model)); resource hiện chỉ có upload + xóa, không có update.
class CRUDLessonResource(CRUDBase[LessonResource, dict, dict, UUID]):
    def get_multi_by_lesson(self, db: Session, lesson_id: UUID) -> List[LessonResource]:
        statement = select(LessonResource).where(LessonResource.lesson_id == lesson_id)
        return db.exec(statement).all()

crud_lesson_resource = CRUDLessonResource(LessonResource)