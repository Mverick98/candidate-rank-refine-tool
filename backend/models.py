from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from enum import Enum

class AlgoRankingEntry(BaseModel):
    """Represents a single candidate's ranking from an algorithm."""
    demand_id: str
    algo_id: str
    candidate_id: str
    rank: int = Field(ge=1) # Rank must be 1 or greater

class UploadResponse(BaseModel):
    """Response model for file upload."""
    message: str
    demand_ids_processed: List[str]

class HumanComparisonDecision(str, Enum):
    """Enum for human comparison outcomes."""
    CANDIDATE1_BETTER = "1"
    CANDIDATE2_BETTER = "2"
    EQUALLY_GOOD = "0"

class ComparisonPair(BaseModel):
    """Represents a pair of candidates for human comparison."""
    comparison_id: str # Unique ID for this specific comparison task
    demand_id: str
    candidate1_id: str
    candidate2_id: str
    # New fields for frontend display
    job_description_text: str
    candidate1_resume_text: str
    candidate2_resume_text: str

class SubmitComparisonRequest(BaseModel):
    """Request body for submitting a human comparison result."""
    comparison_id: str
    decision: HumanComparisonDecision
    user_id: str # New: To track who made the decision

class PairwiseWinRateResults(BaseModel):
    """Detailed results for pairwise win rate comparison."""
    algo1_wins: int
    algo2_wins: int
    ties: int
    total_comparisons: int
    algo1_win_ratio: float
    algo2_win_ratio: float
    algo1_win_ratio_ci_lower: Optional[float] = None # Confidence interval lower bound
    algo1_win_ratio_ci_upper: Optional[float] = None # Confidence interval upper bound
    interpretation: str

class TopKOverlapResults(BaseModel):
    """Results for top-K candidate overlap."""
    k: int
    overlap_count: int
    jaccard_similarity: float

class MedianRankResults(BaseModel):
    """Results for median human rank comparison of top-N algorithm candidates."""
    k: int # Refers to top_n_for_median
    algo1_median_human_rank: float
    algo2_median_human_rank: float
    interpretation: str

class RankingMetrics(BaseModel):
    """Results of algorithm evaluation."""
    human_sorted_list: List[str]
    algo1_ndcg: Optional[float] = None
    algo2_ndcg: Optional[float] = None
    pairwise_win_rates: Optional[PairwiseWinRateResults] = None
    top_k_overlap: Optional[TopKOverlapResults] = None
    median_rank_comparison: Optional[MedianRankResults] = None
    overall_grading_summary: Optional[str] = None

class ComparisonStatus(BaseModel):
    """Provides status of the sorting process for a demand."""
    demand_id: str
    total_comparisons_needed: int
    comparisons_completed: int
    is_completed: bool
    current_pair: Optional[ComparisonPair] = None
    final_ranking: Optional[List[str]] = None # Only populated if completed
    metrics: Optional[RankingMetrics] = None # Only populated if completed

class DemandInfo(BaseModel):
    demand_id: str
    parent_id: str
    job_description: str
    demand_grade: str
    is_completed: bool
    assigned_user_id: Optional[str] = None
    last_accessed: Optional[str] = None # Timestamp for managing lock timeouts

class ProductionResults(BaseModel):
    """Model for results ready for production consumption."""
    demand_id: str
    final_human_ranking: List[str]
    metrics: RankingMetrics
    # Add any other relevant summary data from the initial parquet file
    parent_id: str
    job_description: str
    demand_grade: str
    job_role: str
    years_of_experience: float
