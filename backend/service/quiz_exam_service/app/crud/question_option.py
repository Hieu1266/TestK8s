from fastapi import HTTPException, status
from sqlmodel import Session, select
from app.crud.base import CRUDBase
from uuid import UUID
from app.models.question_option import QuestionOption
from app.schemas.question_option import QuestionOptionCreate, QuestionOptionUpdate

class CRUDQuestionOption(CRUDBase[QuestionOption, QuestionOptionCreate, QuestionOptionUpdate, UUID]):
    def create(self, db: Session, obj_in: QuestionOptionCreate) -> QuestionOption:
        # 1. Nếu option hiện tại đang được đánh dấu là đáp án đúng (is_correct == True)
        if obj_in.is_correct:
            # Truy vấn tìm xem đã có option nào thuộc câu hỏi này (question_id) được đánh dấu là True chưa
            statement = (
                select(self.model)  # self.model ở đây chính là QuestionOption
                .where(self.model.question_id == obj_in.question_id)
                .where(self.model.is_correct == True)
            )
            existing_correct = db.exec(statement).first()
            
            # 2. Nếu đã tồn tại đáp án đúng rồi, ép thuộc tính is_correct của option mới này về False
            if existing_correct is not None:
                obj_in.is_correct = False
                
        # 3. Gọi hàm create gốc của CRUDBase để tự động map dữ liệu, add, commit và refresh
        return super().create(db, obj_in)
    def get_question_id(self, db: Session, option_id: UUID) -> UUID:
        statement = select(QuestionOption.question_id).where(
            QuestionOption.option_id == option_id
        )
        return db.exec(statement).first()
    def get_options_by_question(self, db: Session, question_id: UUID) -> list[QuestionOption]:
        statement = select(QuestionOption).where(
            QuestionOption.question_id == question_id
        )
        return db.exec(statement).all()
    def get_question_id(self, db: Session, option_id: UUID) -> UUID:
        statement = select(QuestionOption.question_id).where(
            QuestionOption.option_id == option_id
        )
        return db.exec(statement).first()
    def update_multiple_options(
        self, db: Session, question_id: UUID, obj_in_list: list[QuestionOptionUpdate]
    ) -> list[QuestionOption]:
        # 1. Lấy toàn bộ các options hiện có của câu hỏi này trong DB
        db_options = self.get_options_by_question(db, question_id)
        if not db_options:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy phương án nào cho câu hỏi này."
            )
        
        # Tạo mapping từ danh sách update để tra cứu cho nhanh
        update_map = {obj.option_id: obj for obj in obj_in_list}
        
        # 2. Kiểm tra logic: Phải có ĐÚNG 1 đáp án đúng sau khi update
        correct_count = 0
        for db_opt in db_options:
            # Nếu option này nằm trong danh sách update, lấy giá trị is_correct mới, ngược lại giữ giá trị cũ trong DB
            if db_opt.option_id in update_map:
                new_is_correct = update_map[db_opt.option_id].is_correct
                # Nếu client không truyền is_correct (None), thì giữ nguyên giá trị cũ của DB
                is_correct_final = db_opt.is_correct if new_is_correct is None else new_is_correct
            else:
                is_correct_final = db_opt.is_correct
                
            if is_correct_final:
                correct_count += 1

        # Validation: Ép buộc phải có đúng 1 đáp án đúng
        if correct_count != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cập nhật thất bại. Câu hỏi phải có đúng 1 đáp án đúng (Hiện tại có {correct_count} đáp án đúng)."
            )

        # 3. Tiến hành cập nhật vào DB sau khi đã pass qua bước validation
        updated_options = []
        for db_opt in db_options:
            if db_opt.option_id in update_map:
                update_data = update_map[db_opt.option_id].model_dump(exclude_unset=True)
                for field in update_data:
                    if hasattr(db_opt, field):
                        setattr(db_opt, field, update_data[field])
                db.add(db_opt)
                updated_options.append(db_opt)
                
        db.commit()
        for opt in updated_options:
            db.refresh(opt)
            
        return db_options


crud_question_option = CRUDQuestionOption(QuestionOption)

