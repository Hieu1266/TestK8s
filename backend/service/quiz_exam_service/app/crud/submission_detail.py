from typing import Optional
from uuid import UUID
from sqlmodel import Session

from app.crud.base import CRUDBase
from app.models.submission_detail import SubmissionDetail
from app.schemas.submission_detail import SubmissionDetailCreate, SubmissionDetailUpdate
from app.crud.quiz_question import crud_quiz_question
from app.crud.quiz_submission import crud_quiz_submission

class CRUDSubmissionDetail(CRUDBase[SubmissionDetail, SubmissionDetailCreate, SubmissionDetailUpdate, UUID]):

    def create(self, db, obj_in):
        submission = crud_quiz_submission.get_by_id(db, obj_in.submission_id)
        quiz_id = submission.quiz.quiz_id
        obj_in.video_trigger_seconds = crud_quiz_question.get_trigger_seconds(db, quiz_id, obj_in.question_id)
        return super().create(db, obj_in)
    
    def update_answer(
        self, 
        db: Session, 
        db_obj: SubmissionDetail, 
        obj_in: SubmissionDetailUpdate
    ) -> SubmissionDetail:
        """Cập nhật nội dung trả lời của sinh viên."""
        return self.update(db=db, db_obj=db_obj, obj_in=obj_in)

crud_submission_detail = CRUDSubmissionDetail(SubmissionDetail)