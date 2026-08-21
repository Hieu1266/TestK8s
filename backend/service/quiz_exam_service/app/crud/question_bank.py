from uuid import UUID
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.question_option import QuestionOption
from app.models.rubric_criteria import RubricCriteria
from app.schemas.question_bank import QuestionCreate, QuestionUpdate


class CRUDQuestionBank:
    def create(self, db: Session, obj_in: QuestionCreate) -> Question:
        # 1. Ép kiểu question_type thành chuỗi in hoa an toàn
        raw_type = obj_in.question_type
        q_type_str = str(raw_type.value if hasattr(raw_type, "value") else raw_type).upper()

        # 2. Tạo đối tượng Question chính
        db_question = Question(
            subject_id=obj_in.subject_id,
            question_title=obj_in.question_title or "",
            body_content=obj_in.body_content,
            question_type=q_type_str,
            max_points=obj_in.max_points or 10.0,
        )
        db.add(db_question)
        db.flush()  

        # 3. Tạo Rubrics (dành cho ESSAY)
        rubrics_list = getattr(obj_in, "rubrics", []) or []
        if "ESSAY" in q_type_str or len(rubrics_list) > 0:
            for rub in rubrics_list:
                rub_dict = (
                    rub.model_dump()
                    if hasattr(rub, "model_dump")
                    else (rub if isinstance(rub, dict) else rub.__dict__)
                )
                
                pct_val = rub_dict.get("percentage") if rub_dict.get("percentage") is not None else rub_dict.get("percent")
                pct = float(pct_val if pct_val is not None else 0.0)

                db_rubric = RubricCriteria(
                    question_id=db_question.question_id,
                    title=rub_dict.get("title", ""),
                    description=rub_dict.get("description", "") or "",
                    percentage=pct,
                )
                db.add(db_rubric)

        # 4. Tạo QuestionOption (Cho CHOICE, TRUE_FALSE và FILL_IN_BLANK)
        options_list = getattr(obj_in, "options", []) or []
        
        if ("CHOICE" in q_type_str or "TRUE_FALSE" in q_type_str or "BLANK" in q_type_str) and len(options_list) > 0:
            for idx, opt in enumerate(options_list):
                opt_dict = (
                    opt.model_dump()
                    if hasattr(opt, "model_dump")
                    else (opt if isinstance(opt, dict) else opt.__dict__)
                )

                option_kwargs = dict(
                    question_id=db_question.question_id,
                    option_text=opt_dict.get("option_text", ""),
                    is_correct=bool(opt_dict.get("is_correct", False)),
                )

                raw_option_id = opt_dict.get("option_id")
                if raw_option_id:
                    try:
                        option_kwargs["option_id"] = UUID(str(raw_option_id))
                    except (ValueError, AttributeError):
                        pass

                db_option = QuestionOption(**option_kwargs)
                db.add(db_option)

        db.commit()
        db.refresh(db_question)
        return db_question

    def get(self, db: Session, question_id: UUID) -> Optional[Question]:
        return db.query(Question).filter(Question.question_id == question_id).first()

    get_by_id = get  # Alias tương thích

    def get_multi_by_subject(
        self, db: Session, subject_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Question]:
        return (
            db.query(Question)
            .filter(Question.subject_id == subject_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    get_by_subject = get_multi_by_subject  # Alias tương thích

    def update(self, db: Session, db_obj: Question, obj_in: QuestionUpdate) -> Question:
        update_data = obj_in.model_dump(exclude_unset=True)

        basic_fields = ["question_title", "body_content", "question_type", "max_points"]
        for field in basic_fields:
            if field in update_data and update_data[field] is not None:
                val = update_data[field]
                if field == "question_type":
                    val = str(val.value if hasattr(val, "value") else val).upper()
                setattr(db_obj, field, val)

        db.flush()

        # 2. Cập nhật Rubrics nếu client truyền danh sách mới
        if "rubrics" in update_data and update_data["rubrics"] is not None:
            db.query(RubricCriteria).filter(RubricCriteria.question_id == db_obj.question_id).delete()
            
            for rub in update_data["rubrics"]:
                rub_dict = rub if isinstance(rub, dict) else rub.model_dump()
                pct_val = rub_dict.get("percentage") if rub_dict.get("percentage") is not None else rub_dict.get("percent")
                pct = float(pct_val if pct_val is not None else 0.0)

                db_rubric = RubricCriteria(
                    question_id=db_obj.question_id,
                    title=rub_dict.get("title", ""),
                    description=rub_dict.get("description", "") or "",
                    percentage=pct,
                )
                db.add(db_rubric)

        # 3. Cập nhật Options nếu client truyền danh sách mới
        if "options" in update_data and update_data["options"] is not None:
            db.query(QuestionOption).filter(QuestionOption.question_id == db_obj.question_id).delete()
            db.flush()

            for idx, opt in enumerate(update_data["options"]):
                opt_dict = opt if isinstance(opt, dict) else opt.model_dump()

                option_kwargs = dict(
                    question_id=db_obj.question_id,
                    option_text=opt_dict.get("option_text", ""),
                    is_correct=bool(opt_dict.get("is_correct", False)),
                )
                # 🎯 Giống create(): chỉ dùng option_id của client nếu là UUID thật
                # (option cũ đang sửa lại). Option mới / nhãn chữ cái -> để model
                # tự sinh UUID mới, tránh lỗi UUID parsing hoặc lỗi insert.
                raw_option_id = opt_dict.get("option_id")
                if raw_option_id:
                    try:
                        option_kwargs["option_id"] = UUID(str(raw_option_id))
                    except (ValueError, AttributeError):
                        pass

                db_option = QuestionOption(**option_kwargs)
                db.add(db_option)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, question_id: UUID) -> Optional[Question]:
        obj = db.query(Question).filter(Question.question_id == question_id).first()
        if obj:
            db.query(RubricCriteria).filter(RubricCriteria.question_id == question_id).delete()
            db.query(QuestionOption).filter(QuestionOption.question_id == question_id).delete()
            db.delete(obj)
            db.commit()
            return obj
        return None

    delete = remove 
    
crud_question_bank = CRUDQuestionBank()