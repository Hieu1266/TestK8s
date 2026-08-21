from typing import Generic, TypeVar, Union
from sqlmodel import Session, select
from pydantic import BaseModel

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)
IDType = TypeVar("IDType")

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType, IDType]):
    def __init__(self, model: type[ModelType]):
        self.model = model
    
    def get_by_id(self, db: Session, id: IDType) -> ModelType | None:
        return db.get(self.model, id)
    
    def get_multi(self, db: Session, skip: int = 0, limit: int = 10) -> list[ModelType]:
        statement = select(self.model).offset(skip).limit(limit)
        return db.exec(statement).all()
    
    def create(self, db: Session, obj_in: Union[CreateSchemaType, ModelType, dict]) -> ModelType:
        # 1. Trường hợp obj_in ĐÃ LÀ instance của Database Model (ví dụ: Subject(...))
        if isinstance(obj_in, self.model):
            db_obj = obj_in

        # 2. Trường hợp obj_in là Dictionary
        elif isinstance(obj_in, dict):
            db_obj = self.model(**obj_in)

        # 3. Trường hợp obj_in là Pydantic / SQLModel Schema (ví dụ: SubjectCreate)
        else:
            db_obj = self.model(**obj_in.model_dump())

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, db_obj: ModelType, obj_in: UpdateSchemaType) -> ModelType:
        # Trích xuất dữ liệu dạng dict, bỏ qua các trường không được truyền lên
        update_data = obj_in.model_dump(exclude_unset=True, exclude_none=True)
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: IDType) -> ModelType | None:
        db_obj = db.get(self.model, id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
        return db_obj