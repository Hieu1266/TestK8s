import { SyllabusStatus } from "./statuses";

export interface Syllabus {
  id: string;
  subjectId: string;
  description: string;
  fileUrl?: string | null;
  status_id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SyllabusData {
  syllabus_id: string;
  subject_id: string;
  instructor_id?: string | null;
  assigner_id?: string | null;
  description?: string | null;
  syllabus_file_path: string;
  status_id: SyllabusStatus;
}

export interface SyllabusCreatePayload {
  subject_id: string;
  syllabus_file_path: string;
  status_id?: SyllabusStatus | string;
  instructor_id?: string;
  assigner_id?: string;
  description?: string;
}

export interface SyllabusUpdatePayload {
  syllabus_file_path?: string | null;
  status_id?: SyllabusStatus | string;
  instructor_id?: string;
  assigner_id?: string;
  description?: string;
}

export interface UploadSyllabusResponse {
  status: string;
  file_path: string;
  file_name?: string;
}

export interface SyllabusCardProps {
  subjectId: string;
}