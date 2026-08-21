export interface PresentationSlide {
  slide_id: string;
  presentation_id: string;
  title?: string | null;
  content_body: string;
  slide_order: number;
}

export interface Presentation {
  presentation_id: string;
  lesson_id: string;
  title?: string | null;
  slides: PresentationSlide[];
}

export interface PresentationCreatePayload {
  lesson_id: string;
  title?: string | null;
}

export interface PresentationSlideCreatePayload {
  title?: string | null;
  content_body: string;
  slide_order?: number;
}

export interface PresentationSlideUpdatePayload {
  title?: string | null;
  content_body?: string;
  slide_order?: number;
}
