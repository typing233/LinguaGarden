export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  preferred_language: string;
  avatar_url: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Vocabulary {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  source_language: string;
  target_language: string;
  definition: string | null;
  example_sentence: string | null;
  pronunciation: string | null;
  difficulty_level: number;
  mastery_level: number;
  source: string;
  image_id: string | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface WordList {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface WordListDetail extends WordList {
  words: Vocabulary[];
}

export interface ExerciseQuestion {
  id: string;
  vocabulary_id: string;
  question_data: {
    type: string;
    prompt?: string;
    hint?: string;
    correct_answer?: string;
    options?: string[];
    correct_index?: number;
    left_cards?: string[];
    right_cards?: string[];
    correct_pairs?: Record<string, number>;
  };
  user_answer: string | null;
  is_correct: boolean | null;
}

export interface Exercise {
  id: string;
  exercise_type: string;
  total_questions: number;
  correct_answers: number;
  score: number | null;
  duration_seconds: number | null;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  questions: ExerciseQuestion[];
}

export interface ProgressSummary {
  total_words: number;
  words_mastered: number;
  total_exercises: number;
  average_score: number | null;
  current_streak: number;
  words_due_review: number;
}

export interface DailyProgress {
  date: string;
  words_reviewed: number;
  exercises_completed: number;
  average_score: number | null;
}

export interface ImageResult {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number | null;
  vision_description: string | null;
  suggested_words: { word: string; translation: string; definition: string }[] | null;
  processed: boolean;
  created_at: string;
}
