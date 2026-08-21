from uuid import UUID

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models.content_annotation import ContentAnnotation
from app.schemas.content_annotation import (
    AnnotationContentType,
    ContentAnnotationCreate,
    ContentAnnotationUpdate,
)


class CRUDContentAnnotation(
    CRUDBase[
        ContentAnnotation,
        ContentAnnotationCreate,
        ContentAnnotationUpdate,
        UUID,
    ]
):
    def get_by_content(
        self,
        db: Session,
        content_type: AnnotationContentType,
        content_id: UUID,
    ) -> list[ContentAnnotation]:
        """
        Lấy toàn bộ chú giải của một lesson hoặc một slide.
        """

        statement = (
            select(ContentAnnotation)
            .where(
                ContentAnnotation.content_type
                == content_type.value,

                ContentAnnotation.content_id
                == content_id,
            )
            .order_by(
                ContentAnnotation.created_at.asc()
            )
        )

        return list(
            db.exec(statement).all()
        )

    def delete_by_content(
        self,
        db: Session,
        content_type: AnnotationContentType,
        content_id: UUID,
    ) -> None:
        """
        Xóa toàn bộ chú giải khi lesson hoặc slide bị xóa.
        """

        annotations = self.get_by_content(
            db=db,
            content_type=content_type,
            content_id=content_id,
        )

        for annotation in annotations:
            db.delete(annotation)

        if annotations:
            db.commit()


crud_content_annotation = CRUDContentAnnotation(
    ContentAnnotation
)