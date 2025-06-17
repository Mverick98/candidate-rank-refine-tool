
export interface AnnotatorInfo {
  id: string;
  username: string;
}

export interface ComparisonSession {
  session_id: string;
  jd_id: string;
  jd_pdf_url: string;
  annotator_id: string;
}

export interface ComparisonPair {
  resume_id_left: string;
  resume_id_right: string;
  resume_pdf_url_left: string;
  resume_pdf_url_right: string;
}

export interface JDRequestResponse {
  jd_available: boolean;
  message?: string;
  session?: ComparisonSession;
  first_comparison?: ComparisonPair;
}

export interface FeedbackSubmissionResponse {
  is_session_complete: boolean;
  message?: string;
  next_comparison?: ComparisonPair;
}

export interface JobDescription {
  jd_id: string;
  jd_pdf_filename: string;
  jd_pdf_path: string;
  jd_status: 'Available' | 'In Progress' | 'Completed';
  assigned_to_annotator_id: string | null;
  assigned_timestamp: string | null;
}

export interface Resume {
  resume_id: string;
  resume_pdf_filename: string;
  resume_pdf_path: string;
  source_algo: 'Algo1' | 'Algo2';
  original_rank_in_algo: number;
}

export interface ComparisonResult {
  comparison_id: string;
  session_id: string;
  jd_id: string;
  resume_id_left: string;
  resume_id_right: string;
  selected_resume_id: string;
  unselected_resume_id: string;
  reasons_selected: string[];
  other_reason_text?: string;
  display_order_left_right: string;
  comparison_type: string;
  comparison_index_in_session: number;
}
