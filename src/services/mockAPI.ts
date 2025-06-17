
import type { 
  JDRequestResponse, 
  FeedbackSubmissionResponse, 
  JobDescription, 
  Resume, 
  ComparisonSession,
  ComparisonPair,
  ComparisonResult 
} from '@/types/comparison';

// Mock data for demonstration
class MockAPIService {
  private mockJDs: JobDescription[] = [
    {
      jd_id: 'jd_001',
      jd_pdf_filename: 'software_engineer_jd.pdf',
      jd_pdf_path: '/placeholder.svg',
      jd_status: 'Available',
      assigned_to_annotator_id: null,
      assigned_timestamp: null,
    },
    {
      jd_id: 'jd_002',
      jd_pdf_filename: 'data_scientist_jd.pdf',
      jd_pdf_path: '/placeholder.svg',
      jd_status: 'Available',
      assigned_to_annotator_id: null,
      assigned_timestamp: null,
    },
    {
      jd_id: 'jd_003',
      jd_pdf_filename: 'product_manager_jd.pdf',
      jd_pdf_path: '/placeholder.svg',
      jd_status: 'Available',
      assigned_to_annotator_id: null,
      assigned_timestamp: null,
    },
  ];

  private mockResumes: Resume[] = [
    {
      resume_id: 'resume_001',
      resume_pdf_filename: 'candidate_a_resume.pdf',
      resume_pdf_path: '/placeholder.svg',
      source_algo: 'Algo1',
      original_rank_in_algo: 1,
    },
    {
      resume_id: 'resume_002',
      resume_pdf_filename: 'candidate_b_resume.pdf',
      resume_pdf_path: '/placeholder.svg',
      source_algo: 'Algo2',
      original_rank_in_algo: 1,
    },
    {
      resume_id: 'resume_003',
      resume_pdf_filename: 'candidate_c_resume.pdf',
      resume_pdf_path: '/placeholder.svg',
      source_algo: 'Algo1',
      original_rank_in_algo: 2,
    },
    {
      resume_id: 'resume_004',
      resume_pdf_filename: 'candidate_d_resume.pdf',
      resume_pdf_path: '/placeholder.svg',
      source_algo: 'Algo2',
      original_rank_in_algo: 2,
    },
    {
      resume_id: 'resume_005',
      resume_pdf_filename: 'candidate_e_resume.pdf',
      resume_pdf_path: '/placeholder.svg',
      source_algo: 'Algo1',
      original_rank_in_algo: 3,
    },
  ];

  private activeSessions: Map<string, ComparisonSession> = new Map();
  private sessionComparisons: Map<string, ComparisonPair[]> = new Map();
  private sessionProgress: Map<string, number> = new Map();
  private comparisonResults: ComparisonResult[] = [];

  async requestJDComparison(annotatorId: string): Promise<JDRequestResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find an available JD
    const availableJD = this.mockJDs.find(jd => jd.jd_status === 'Available');
    
    if (!availableJD) {
      return {
        jd_available: false,
        message: "No more JDs available at this time.",
      };
    }

    // Assign the JD to the annotator
    availableJD.jd_status = 'In Progress';
    availableJD.assigned_to_annotator_id = annotatorId;
    availableJD.assigned_timestamp = new Date().toISOString();

    // Create a session
    const sessionId = `session_${Date.now()}_${annotatorId}`;
    const session: ComparisonSession = {
      session_id: sessionId,
      jd_id: availableJD.jd_id,
      jd_pdf_url: availableJD.jd_pdf_path,
      annotator_id: annotatorId,
    };

    // Generate comparison pairs for this session
    const comparisons = this.generateComparisonPairs(availableJD.jd_id);
    
    this.activeSessions.set(sessionId, session);
    this.sessionComparisons.set(sessionId, comparisons);
    this.sessionProgress.set(sessionId, 0);

    return {
      jd_available: true,
      session: session,
      first_comparison: comparisons[0],
    };
  }

  async submitFeedback(
    sessionId: string,
    selectedResumeId: string,
    unselectedResumeId: string,
    reasonsSelected: string[],
    otherReasonText?: string
  ): Promise<FeedbackSubmissionResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const session = this.activeSessions.get(sessionId);
    const comparisons = this.sessionComparisons.get(sessionId);
    const currentProgress = this.sessionProgress.get(sessionId) || 0;

    if (!session || !comparisons) {
      throw new Error('Invalid session');
    }

    // Store the comparison result
    const comparisonResult: ComparisonResult = {
      comparison_id: `comp_${Date.now()}_${Math.random()}`,
      session_id: sessionId,
      jd_id: session.jd_id,
      resume_id_left: comparisons[currentProgress].resume_id_left,
      resume_id_right: comparisons[currentProgress].resume_id_right,
      selected_resume_id: selectedResumeId,
      unselected_resume_id: unselectedResumeId,
      reasons_selected: reasonsSelected,
      other_reason_text: otherReasonText,
      display_order_left_right: 'randomized',
      comparison_type: 'Algo1_vs_Algo2', // This would be determined by algorithm logic
      comparison_index_in_session: currentProgress + 1,
    };

    this.comparisonResults.push(comparisonResult);

    // Update progress
    const nextProgress = currentProgress + 1;
    this.sessionProgress.set(sessionId, nextProgress);

    // Check if session is complete
    if (nextProgress >= comparisons.length) {
      // Mark JD as completed
      const jd = this.mockJDs.find(j => j.jd_id === session.jd_id);
      if (jd) {
        jd.jd_status = 'Completed';
        jd.assigned_to_annotator_id = null;
      }

      // Clean up session data
      this.activeSessions.delete(sessionId);
      this.sessionComparisons.delete(sessionId);
      this.sessionProgress.delete(sessionId);

      return {
        is_session_complete: true,
        message: "Comparisons Done for this JD!",
      };
    }

    // Return next comparison
    return {
      is_session_complete: false,
      next_comparison: comparisons[nextProgress],
    };
  }

  private generateComparisonPairs(jdId: string): ComparisonPair[] {
    // For demo purposes, create a fixed set of comparisons
    // In a real implementation, this would use sophisticated algorithm logic
    const pairs: ComparisonPair[] = [];
    
    // Generate 5 comparison pairs (this could be dynamic based on algorithm needs)
    for (let i = 0; i < 5; i++) {
      const leftResume = this.mockResumes[i % this.mockResumes.length];
      const rightResume = this.mockResumes[(i + 1) % this.mockResumes.length];
      
      // Randomize left/right positioning
      const randomize = Math.random() > 0.5;
      
      pairs.push({
        resume_id_left: randomize ? leftResume.resume_id : rightResume.resume_id,
        resume_id_right: randomize ? rightResume.resume_id : leftResume.resume_id,
        resume_pdf_url_left: randomize ? leftResume.resume_pdf_path : rightResume.resume_pdf_path,
        resume_pdf_url_right: randomize ? rightResume.resume_pdf_path : leftResume.resume_pdf_path,
      });
    }
    
    return pairs;
  }

  // Method to get session results (for future admin/analysis features)
  getSessionResults(sessionId: string): ComparisonResult[] {
    return this.comparisonResults.filter(result => result.session_id === sessionId);
  }

  // Method to reset all JDs to available (for testing purposes)
  resetAllJDs(): void {
    this.mockJDs.forEach(jd => {
      jd.jd_status = 'Available';
      jd.assigned_to_annotator_id = null;
      jd.assigned_timestamp = null;
    });
    
    this.activeSessions.clear();
    this.sessionComparisons.clear();
    this.sessionProgress.clear();
    this.comparisonResults = [];
  }
}

export const mockAPIService = new MockAPIService();
