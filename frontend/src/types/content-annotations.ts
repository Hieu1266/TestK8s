export type AnnotationContentType = "LESSON_CONTENT" | "PRESENTATION_SLIDE";

export interface ContentAnnotation {
  annotation_id: string;

  content_type: AnnotationContentType;

  content_id: string;

  selected_text: string;

  title: string;

  description: string;

  created_by: string;

  created_at: string;
}

export interface ContentAnnotationCreatePayload {
  content_type: AnnotationContentType;

  content_id: string;

  selected_text: string;

  title: string;

  description: string;
}

export interface ContentAnnotationUpdatePayload {
  title?: string;

  description?: string;
}
