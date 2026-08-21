import { Lesson, LessonLearningStructure } from "./lessons";

export interface Module {
    moduleId: string;
    subjectId: string;
    title: string;
    orderIndex: number;
    lessons: Lesson[];
}

export interface ModuleLearningStructure {
    title: string;
    module_id: string;
    lessons: LessonLearningStructure[];
}

export interface ModuleData {
    module_id: string;
    syllabus_id?: string;
    subject_id?: string;
    title?: string;
    description?: string | null;
    order_index: number;
    total_lessons?: number;
}

export interface CreateModuleInput {
    subject_id: string;
    title: string;
    description?: string;
    syllabus_id?: string;
}

export interface ModuleUpdatePayload {
    title?: string;
    description?: string;
    order_index?: number;
}