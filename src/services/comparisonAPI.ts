import type {
  ComparisonSession,
  ComparisonPair,
  JDRequestResponse,
  FeedbackSubmissionResponse,
  ComparisonResult,
} from '@/types/comparison';

class ComparisonAPIService {
  private mockSessions: Map<string, ComparisonSession> = new Map();
  private comparisonMatrix: Map<string, Map<string, 'better' | 'equal' | 'bad'>> = new Map();
  private mockResults: ComparisonResult[] = [];
  private jdCounter: number = 1;

  async requestJDComparison(annotatorId: string): Promise<JDRequestResponse> {
    try {
      // In production, this would call your FastAPI backend
      const response = await fetch(`/api/comparison/request-jd?annotator_id=${annotatorId}`);
      if (!response.ok) {
        throw new Error('Failed to request new JD comparison');
      }
      return await response.json();
    } catch (error) {
      console.log('Using mock API for JD request');
      return this.mockRequestJDComparison(annotatorId);
    }
  }

  async submitFeedback(
    sessionId: string,
    selectedResumeId: string,
    unselectedResumeId: string,
    reasons: string[],
    otherText?: string
  ): Promise<FeedbackSubmissionResponse> {
    try {
      // In production, this would call your FastAPI backend
      const response = await fetch('/api/comparison/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          selected_resume_id: selectedResumeId,
          unselected_resume_id: unselectedResumeId,
          reasons_selected: reasons,
          other_reason_text: otherText,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');
      return await response.json();
    } catch (error) {
      console.log('Using mock API for feedback submission');
      return this.mockSubmitFeedback(sessionId, selectedResumeId, unselectedResumeId, reasons, otherText);
    }
  }

  async getSessionResults(sessionId: string): Promise<{ total_comparisons: number } | undefined> {
    try {
      const response = await fetch(`/api/comparison/session-results?session_id=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to get session results');
      }
      return await response.json();
    } catch (error) {
      console.log('Using mock API for session results');
      return { total_comparisons: this.mockResults.filter(r => r.session_id === sessionId).length };
    }
  }

  private mockRequestJDComparison(annotatorId: string): JDRequestResponse {
    // Mock implementation:
    const jdId = `jd_${this.jdCounter++}`;
    const sessionId = `session_${Date.now()}`;

    // Create a mock session
    const newSession: ComparisonSession = {
      session_id: sessionId,
      jd_id: jdId,
      jd_pdf_url: 'https://www.africau.edu/images/default/sample.pdf', // Replace with a real URL or local path
      annotator_id: annotatorId,
    };
    this.mockSessions.set(sessionId, newSession);

    // Create a mock comparison matrix for this session
    this.comparisonMatrix.set(sessionId, new Map());

    // Create two mock resumes for the first comparison
    const firstComparison: ComparisonPair = {
      resume_id_left: 'resume_1',
      resume_id_right: 'resume_2',
      resume_pdf_url_left: 'https://www.africau.edu/images/default/sample.pdf', // Replace with a real URL or local path
      resume_pdf_url_right: 'https://www.africau.edu/images/default/sample.pdf', // Replace with a real URL or local path
    };

    return {
      jd_available: true,
      session: newSession,
      first_comparison: firstComparison,
    };
  }

  private mockSubmitFeedback(
    sessionId: string,
    selectedResumeId: string,
    unselectedResumeId: string,
    reasons: string[],
    otherText?: string
  ): FeedbackSubmissionResponse {
    // Record the comparison result
    const comparisonResult = {
      comparison_id: `comp_${Date.now()}`,
      session_id: sessionId,
      jd_id: this.mockSessions.get(sessionId)?.jd_id || '',
      resume_id_left: selectedResumeId,
      resume_id_right: unselectedResumeId,
      selected_resume_id: selectedResumeId,
      unselected_resume_id: unselectedResumeId,
      reasons_selected: reasons,
      other_reason_text: otherText,
      display_order_left_right: 'left-right',
      comparison_type: 'normal',
      comparison_index_in_session: this.mockResults.filter(r => r.session_id === sessionId).length + 1,
    };

    this.mockResults.push(comparisonResult);

    // Update the comparison matrix based on the feedback
    const session = this.mockSessions.get(sessionId);
    if (session) {
      this.comparisonMatrix.get(sessionId)?.set(`${selectedResumeId}-${unselectedResumeId}`, 'better');
      this.comparisonMatrix.get(sessionId)?.set(`${unselectedResumeId}-${selectedResumeId}`, 'worse');
    }

    return this.getNextComparison(sessionId);
  }

  private getNextComparison(sessionId: string): FeedbackSubmissionResponse {
    const session = this.mockSessions.get(sessionId);
    if (!session) {
      return { is_session_complete: true, message: 'Session not found' };
    }

    // In a real implementation, you would use an algorithm to determine the next best comparison
    // based on the current state of the comparison matrix.
    // For this mock, we'll just complete the session after a few comparisons.
    if (this.mockResults.filter(r => r.session_id === sessionId).length >= 2) {
      return { is_session_complete: true, message: 'Session complete' };
    }

    // Create two new mock resumes for the next comparison
    const nextComparison: ComparisonPair = {
      resume_id_left: `resume_${Date.now()}`,
      resume_id_right: `resume_${Date.now() + 1}`,
      resume_pdf_url_left: 'https://www.africau.edu/images/default/sample.pdf', // Replace with a real URL or local path
      resume_pdf_url_right: 'https://www.africau.edu/images/default/sample.pdf', // Replace with a real URL or local path
    };

    return {
      is_session_complete: false,
      next_comparison: nextComparison,
    };
  }

  async submitEqualFeedback(
    sessionId: string,
    resumeIdLeft: string,
    resumeIdRight: string,
    reasons: string[],
    otherText?: string
  ): Promise<FeedbackSubmissionResponse> {
    try {
      // In production, this would call your FastAPI backend
      const response = await fetch('/api/comparison/submit-equal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          resume_id_left: resumeIdLeft,
          resume_id_right: resumeIdRight,
          reasons_selected: reasons,
          other_reason_text: otherText,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit equal feedback');
      return await response.json();
    } catch (error) {
      console.log('Using mock API for equal feedback submission');
      // Mock implementation
      return this.mockSubmitEqualFeedback(sessionId, resumeIdLeft, resumeIdRight, reasons, otherText);
    }
  }

  async submitBadFeedback(
    sessionId: string,
    resumeIdLeft: string,
    resumeIdRight: string,
    reasons: string[],
    otherText?: string
  ): Promise<FeedbackSubmissionResponse> {
    try {
      // In production, this would call your FastAPI backend
      const response = await fetch('/api/comparison/submit-bad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          resume_id_left: resumeIdLeft,
          resume_id_right: resumeIdRight,
          reasons_selected: reasons,
          other_reason_text: otherText,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit bad feedback');
      return await response.json();
    } catch (error) {
      console.log('Using mock API for bad feedback submission');
      // Mock implementation
      return this.mockSubmitBadFeedback(sessionId, resumeIdLeft, resumeIdRight, reasons, otherText);
    }
  }

  private mockSubmitEqualFeedback(
    sessionId: string,
    resumeIdLeft: string,
    resumeIdRight: string,
    reasons: string[],
    otherText?: string
  ): FeedbackSubmissionResponse {
    // Record the equal comparison result
    const comparisonResult = {
      comparison_id: `comp_${Date.now()}`,
      session_id: sessionId,
      jd_id: this.mockSessions.get(sessionId)?.jd_id || '',
      resume_id_left: resumeIdLeft,
      resume_id_right: resumeIdRight,
      selected_resume_id: 'equal',
      unselected_resume_id: 'equal',
      reasons_selected: reasons,
      other_reason_text: otherText,
      display_order_left_right: 'left-right',
      comparison_type: 'equal',
      comparison_index_in_session: this.mockResults.filter(r => r.session_id === sessionId).length + 1,
    };

    this.mockResults.push(comparisonResult);

    // Handle equal results in ranking algorithm (both get same score)
    const session = this.mockSessions.get(sessionId);
    if (session) {
      this.comparisonMatrix.get(sessionId)?.set(`${resumeIdLeft}-${resumeIdRight}`, 'equal');
      this.comparisonMatrix.get(sessionId)?.set(`${resumeIdRight}-${resumeIdLeft}`, 'equal');
    }

    return this.getNextComparison(sessionId);
  }

  private mockSubmitBadFeedback(
    sessionId: string,
    resumeIdLeft: string,
    resumeIdRight: string,
    reasons: string[],
    otherText?: string
  ): FeedbackSubmissionResponse {
    // Record the bad comparison result
    const comparisonResult = {
      comparison_id: `comp_${Date.now()}`,
      session_id: sessionId,
      jd_id: this.mockSessions.get(sessionId)?.jd_id || '',
      resume_id_left: resumeIdLeft,
      resume_id_right: resumeIdRight,
      selected_resume_id: 'bad',
      unselected_resume_id: 'bad',
      reasons_selected: reasons,
      other_reason_text: otherText,
      display_order_left_right: 'left-right',
      comparison_type: 'bad',
      comparison_index_in_session: this.mockResults.filter(r => r.session_id === sessionId).length + 1,
    };

    this.mockResults.push(comparisonResult);

    // Handle bad results in ranking algorithm (both get low priority)
    const session = this.mockSessions.get(sessionId);
    if (session) {
      this.comparisonMatrix.get(sessionId)?.set(`${resumeIdLeft}-${resumeIdRight}`, 'bad');
      this.comparisonMatrix.get(sessionId)?.set(`${resumeIdRight}-${resumeIdLeft}`, 'bad');
    }

    return this.getNextComparison(sessionId);
  }
}

export const comparisonAPIService = new ComparisonAPIService();
