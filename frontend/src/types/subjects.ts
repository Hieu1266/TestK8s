import { SubjectStatus } from "./statuses";
import { Module, ModuleLearningStructure } from "./modules";

export interface Subject {
    subjectId: string;
    courseId: string;
    title: string;
    description: string;
    orderIndex: number;
    statusId: SubjectStatus;
    modules: Module[];
}

export interface SubjectLearningStructure {
    title: string;
    subject_id: string;
    modules: ModuleLearningStructure[];
}

export interface SubjectData {
    subject_id: string;
    course_id: string;
    title: string;
    description?: string;
    order_index: number;
    status_id: SubjectStatus;
    created_at?: string;
    updated_at?: string;
}

export interface SubjectUpdateInput {
    title?: string;
    description?: string;
    order_index?: number;
    status_id?: SubjectStatus;
    course_id?: string;
}

export interface GeneralInfoInstructorSubject {
    subject_id: string;
    title: string;
    description?: string;
    status_id: SubjectStatus;
    total_modules?: number;
    total_lessons?: number;
}