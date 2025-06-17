
import type { 
  JDRequestResponse, 
  FeedbackSubmissionResponse, 
  JobDescription, 
  Resume, 
  ComparisonSession,
  ComparisonPair,
  ComparisonResult 
} from '@/types/comparison';

interface AlgorithmRanking {
  jd_id: string;
  resume_id: string;
  source_algo: 'Algo1' | 'Algo2';
  original_rank: number;
}

interface ComparisonState {
  algo1_candidates: Resume[];
  algo2_candidates: Resume[];
  merged_ranking: Resume[];
  pending_comparisons: ComparisonPair[];
  completed_comparisons: ComparisonResult[];
}

class ComparisonAPIService {
  private baseURL = '/api'; // This would be your backend URL
  private sessionStates: Map<string, ComparisonState> = new Map();
  
  // PDF serving - assumes PDFs are stored in /pdfs/ folder structure
  private getPDFUrl(filePath: string): string {
    // Remove any leading slash and ensure proper path
    const cleanPath = filePath.replace(/^\/+/, '');
    return `/pdfs/${cleanPath}`;
  }

  // Load algorithm rankings from parquet data
  private async loadAlgorithmRankings(jdId: string): Promise<{algo1: Resume[], algo2: Resume[]}> {
    try {
      // This would typically fetch from your backend that has parsed the parquet files
      const response = await fetch(`${this.baseURL}/rankings/${jdId}`);
      const data = await response.json();
      
      return {
        algo1: data.algo1_rankings.map((r: AlgorithmRanking) => ({
          resume_id: r.resume_id,
          resume_pdf_filename: `${r.resume_id}.pdf`,
          resume_pdf_path: this.getPDFUrl(`resumes/${r.resume_id}.pdf`),
          source_algo: 'Algo1' as const,
          original_rank_in_algo: r.original_rank
        })),
        algo2: data.algo2_rankings.map((r: AlgorithmRanking) => ({
          resume_id: r.resume_id,
          resume_pdf_filename: `${r.resume_id}.pdf`,
          resume_pdf_path: this.getPDFUrl(`resumes/${r.resume_id}.pdf`),
          source_algo: 'Algo2' as const,
          original_rank_in_algo: r.original_rank
        }))
      };
    } catch (error) {
      console.error('Error loading algorithm rankings:', error);
      // Fallback to mock data for development
      return this.getMockRankings(jdId);
    }
  }

  // Mock data fallback for development
  private getMockRankings(jdId: string): {algo1: Resume[], algo2: Resume[]} {
    const algo1: Resume[] = [
      {
        resume_id: 'resume_a1_1',
        resume_pdf_filename: 'candidate_a1_1.pdf',
        resume_pdf_path: this.getPDFUrl('resumes/candidate_a1_1.pdf'),
        source_algo: 'Algo1',
        original_rank_in_algo: 1,
      },
      {
        resume_id: 'resume_a1_2',
        resume_pdf_filename: 'candidate_a1_2.pdf',
        resume_pdf_path: this.getPDFUrl('resumes/candidate_a1_2.pdf'),
        source_algo: 'Algo1',
        original_rank_in_algo: 2,
      },
      {
        resume_id: 'resume_a1_3',
        resume_pdf_filename: 'candidate_a1_3.pdf',
        resume_pdf_path: this.getPDFUrl('resumes/candidate_a1_3.pdf'),
        source_algo: 'Algo1',
        original_rank_in_algo: 3,
      },
    ];

    const algo2: Resume[] = [
      {
        resume_id: 'resume_a2_1',
        resume_pdf_filename: 'candidate_a2_1.pdf',
        resume_pdf_path: this.getPDFUrl('resumes/candidate_a2_1.pdf'),
        source_algo: 'Algo2',
        original_rank_in_algo: 1,
      },
      {
        resume_id: 'resume_a2_2',
        resume_pdf_filename: 'candidate_a2_2.pdf',
        resume_pdf_path: this.getPDFUrl('resumes/candidate_a2_2.pdf'),
        source_algo: 'Algo2',
        original_rank_in_algo: 2,
      },
      {
        resume_id: 'resume_a2_3',
        resume_pdf_filename: 'candidate_a2_3.pdf',
        resume_pdf_path: this.getPDFUrl('resumes/candidate_a2_3.pdf'),
        source_algo: 'Algo2',
        original_rank_in_algo: 3,
      },
    ];

    return { algo1, algo2 };
  }

  // Intelligent comparison algorithm - determines next best pair to compare
  private generateNextComparison(state: ComparisonState): ComparisonPair | null {
    // If we already have pending comparisons, return the next one
    if (state.pending_comparisons.length > 0) {
      return state.pending_comparisons.shift()!;
    }

    // Algorithm to determine next best comparison
    // Priority 1: Compare top uncompared candidates from each algorithm
    const uncomparedAlgo1 = state.algo1_candidates.filter(c => 
      !state.completed_comparisons.some(comp => 
        comp.resume_id_left === c.resume_id || comp.resume_id_right === c.resume_id
      )
    );
    
    const uncomparedAlgo2 = state.algo2_candidates.filter(c => 
      !state.completed_comparisons.some(comp => 
        comp.resume_id_left === c.resume_id || comp.resume_id_right === c.resume_id
      )
    );

    // Cross-algorithm comparison (Algo1 vs Algo2)
    if (uncomparedAlgo1.length > 0 && uncomparedAlgo2.length > 0) {
      const candidate1 = uncomparedAlgo1[0];
      const candidate2 = uncomparedAlgo2[0];
      return this.createComparisonPair(candidate1, candidate2);
    }

    // Intra-algorithm comparisons if needed
    if (uncomparedAlgo1.length >= 2) {
      return this.createComparisonPair(uncomparedAlgo1[0], uncomparedAlgo1[1]);
    }
    
    if (uncomparedAlgo2.length >= 2) {
      return this.createComparisonPair(uncomparedAlgo2[0], uncomparedAlgo2[1]);
    }

    // No more comparisons needed
    return null;
  }

  private createComparisonPair(resume1: Resume, resume2: Resume): ComparisonPair {
    // Randomize left/right positioning to avoid bias
    const randomize = Math.random() > 0.5;
    
    return {
      resume_id_left: randomize ? resume1.resume_id : resume2.resume_id,
      resume_id_right: randomize ? resume2.resume_id : resume1.resume_id,
      resume_pdf_url_left: randomize ? resume1.resume_pdf_path : resume2.resume_pdf_path,
      resume_pdf_url_right: randomize ? resume2.resume_pdf_path : resume1.resume_pdf_path,
    };
  }

  // Build final ranking based on comparison results
  private buildFinalRanking(state: ComparisonState): Resume[] {
    const winCounts = new Map<string, number>();
    const totalComparisons = new Map<string, number>();
    
    // Initialize counts
    [...state.algo1_candidates, ...state.algo2_candidates].forEach(candidate => {
      winCounts.set(candidate.resume_id, 0);
      totalComparisons.set(candidate.resume_id, 0);
    });

    // Count wins and total comparisons
    state.completed_comparisons.forEach(comp => {
      winCounts.set(comp.selected_resume_id, (winCounts.get(comp.selected_resume_id) || 0) + 1);
      totalComparisons.set(comp.selected_resume_id, (totalComparisons.get(comp.selected_resume_id) || 0) + 1);
      totalComparisons.set(comp.unselected_resume_id, (totalComparisons.get(comp.unselected_resume_id) || 0) + 1);
    });

    // Calculate win rate and sort
    const candidatesWithStats = [...state.algo1_candidates, ...state.algo2_candidates]
      .map(candidate => ({
        ...candidate,
        wins: winCounts.get(candidate.resume_id) || 0,
        total: totalComparisons.get(candidate.resume_id) || 0,
        winRate: totalComparisons.get(candidate.resume_id) 
          ? (winCounts.get(candidate.resume_id) || 0) / (totalComparisons.get(candidate.resume_id) || 1)
          : 0
      }))
      .sort((a, b) => {
        // Sort by win rate first, then by original algorithm ranking as tiebreaker
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate;
        }
        return a.original_rank_in_algo - b.original_rank_in_algo;
      });

    return candidatesWithStats;
  }

  async requestJDComparison(annotatorId: string): Promise<JDRequestResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Get available JD (would typically come from backend)
      const jd: JobDescription = {
        jd_id: 'jd_001',
        jd_pdf_filename: 'software_engineer_jd.pdf',
        jd_pdf_path: this.getPDFUrl('jds/software_engineer_jd.pdf'),
        jd_status: 'In Progress',
        assigned_to_annotator_id: annotatorId,
        assigned_timestamp: new Date().toISOString(),
      };

      // Load algorithm rankings
      const { algo1, algo2 } = await this.loadAlgorithmRankings(jd.jd_id);

      // Create session
      const sessionId = `session_${Date.now()}_${annotatorId}`;
      const session: ComparisonSession = {
        session_id: sessionId,
        jd_id: jd.jd_id,
        jd_pdf_url: jd.jd_pdf_path,
        annotator_id: annotatorId,
      };

      // Initialize comparison state
      const state: ComparisonState = {
        algo1_candidates: algo1,
        algo2_candidates: algo2,
        merged_ranking: [],
        pending_comparisons: [],
        completed_comparisons: [],
      };

      this.sessionStates.set(sessionId, state);

      // Generate first comparison
      const firstComparison = this.generateNextComparison(state);
      
      if (!firstComparison) {
        throw new Error('Could not generate initial comparison');
      }

      return {
        jd_available: true,
        session: session,
        first_comparison: firstComparison,
      };

    } catch (error) {
      console.error('Error requesting JD comparison:', error);
      return {
        jd_available: false,
        message: "Error setting up comparison session",
      };
    }
  }

  async submitFeedback(
    sessionId: string,
    selectedResumeId: string,
    unselectedResumeId: string,
    reasonsSelected: string[],
    otherReasonText?: string
  ): Promise<FeedbackSubmissionResponse> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const state = this.sessionStates.get(sessionId);
    if (!state) {
      throw new Error('Invalid session');
    }

    // Record the comparison result
    const comparisonResult: ComparisonResult = {
      comparison_id: `comp_${Date.now()}_${Math.random()}`,
      session_id: sessionId,
      jd_id: 'jd_001', // Would come from session
      resume_id_left: '', // Would be determined from current comparison
      resume_id_right: '', // Would be determined from current comparison
      selected_resume_id: selectedResumeId,
      unselected_resume_id: unselectedResumeId,
      reasons_selected: reasonsSelected,
      other_reason_text: otherReasonText,
      display_order_left_right: 'randomized',
      comparison_type: 'cross_algorithm',
      comparison_index_in_session: state.completed_comparisons.length + 1,
    };

    state.completed_comparisons.push(comparisonResult);

    // Generate next comparison
    const nextComparison = this.generateNextComparison(state);

    if (!nextComparison) {
      // No more comparisons needed, build final ranking
      const finalRanking = this.buildFinalRanking(state);
      state.merged_ranking = finalRanking;

      console.log('Final ranking completed:', finalRanking);

      return {
        is_session_complete: true,
        message: "Comparisons Done for this JD!",
      };
    }

    return {
      is_session_complete: false,
      next_comparison: nextComparison,
    };
  }

  // Get final results for analysis
  getSessionResults(sessionId: string) {
    const state = this.sessionStates.get(sessionId);
    if (!state) return null;

    return {
      final_ranking: state.merged_ranking,
      comparison_results: state.completed_comparisons,
      total_comparisons: state.completed_comparisons.length,
    };
  }
}

export const comparisonAPIService = new ComparisonAPIService();
