from sqlmodel import Session, select, update
from app.crud.base import CRUDBase
from uuid import UUID
from app.models.quiz_pool_rule import QuizPoolRule
from app.schemas.quiz_pool_rule import QuizPoolRuleCreate, QuizPoolRuleUpdate

class CRUDQuizPoolRule(CRUDBase[QuizPoolRule, QuizPoolRuleCreate, QuizPoolRuleUpdate, UUID]):
    def create_rule(
        self, db: Session, *, obj_in: QuizPoolRuleCreate, quiz_id: UUID, pool_id: UUID
    ) -> QuizPoolRule:
        # Chuyển đổi dữ liệu schema thành dict
        obj_in_data = obj_in.model_dump()
        
        # Bổ sung các trường khóa ngoại bắt buộc
        db_obj = QuizPoolRule(**obj_in_data, quiz_id=quiz_id, pool_id=pool_id)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def add_rules_to_quiz(
        self, db: Session, *, quiz_id: UUID, rules_in: list[QuizPoolRuleCreate]
    ) -> list[QuizPoolRule]:
        db_objs = []
        for r in rules_in:
            db_obj = QuizPoolRule(
                quiz_id=quiz_id,
                pool_id=r.pool_id,
                quantity=r.quantity
            )
            db.add(db_obj)
            db_objs.append(db_obj)
            
        db.flush()
        return db_objs

    # 🆕 Lấy danh sách luật bốc pool của 1 quiz
    def get_multi_by_quiz(self, db: Session, quiz_id: UUID) -> list[QuizPoolRule]:
        statement = select(QuizPoolRule).where(QuizPoolRule.quiz_id == quiz_id)
        return db.exec(statement).all()

    # 🆕 Lấy 1 rule, đảm bảo đúng thuộc quiz_id (tránh sửa/xóa nhầm rule của quiz khác)
    def get_by_id_and_quiz(self, db: Session, rule_id: UUID, quiz_id: UUID) -> QuizPoolRule | None:
        statement = select(QuizPoolRule).where(
            QuizPoolRule.rule_id == rule_id,
            QuizPoolRule.quiz_id == quiz_id,
        )
        return db.exec(statement).first()

crud_quiz_pool_rule = CRUDQuizPoolRule(QuizPoolRule)