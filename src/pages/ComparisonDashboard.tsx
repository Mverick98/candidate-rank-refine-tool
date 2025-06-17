
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import PDFViewer from '@/components/PDFViewer';
import ReasoningModal from '@/components/ReasoningModal';
import { comparisonAPIService } from '@/services/comparisonAPI';
import type { ComparisonSession, ComparisonPair, AnnotatorInfo } from '@/types/comparison';

const ComparisonDashboard = () => {
  const [annotator, setAnnotator] = useState<AnnotatorInfo | null>(null);
  const [currentSession, setCurrentSession] = useState<ComparisonSession | null>(null);
  const [currentComparison, setCurrentComparison] = useState<ComparisonPair | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReasoningModal, setShowReasoningModal] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isRequestingNewJD, setIsRequestingNewJD] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const storedAnnotator = localStorage.getItem('annotator');
    if (!storedAnnotator) {
      navigate('/login');
      return;
    }
    setAnnotator(JSON.parse(storedAnnotator));
  }, [navigate]);

  const requestNewJD = async () => {
    if (!annotator) return;
    
    setIsRequestingNewJD(true);
    try {
      const response = await comparisonAPIService.requestJDComparison(annotator.id);
      
      if (!response.jd_available) {
        toast({
          title: "No JDs Available",
          description: response.message,
        });
        return;
      }
      
      setCurrentSession(response.session);
      setCurrentComparison(response.first_comparison);
      
      toast({
        title: "New JD Assigned",
        description: "Starting intelligent comparison algorithm",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request new JD",
        variant: "destructive",
      });
    } finally {
      setIsRequestingNewJD(false);
    }
  };

  const handleCandidateSelection = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setShowReasoningModal(true);
  };

  const handleFeedbackSubmit = async (reasons: string[], otherText?: string) => {
    if (!currentSession || !currentComparison || !selectedResumeId) return;
    
    setIsLoading(true);
    const unselectedResumeId = selectedResumeId === currentComparison.resume_id_left 
      ? currentComparison.resume_id_right 
      : currentComparison.resume_id_left;

    try {
      const response = await comparisonAPIService.submitFeedback(
        currentSession.session_id,
        selectedResumeId,
        unselectedResumeId,
        reasons,
        otherText
      );
      
      if (response.is_session_complete) {
        // Get final results for logging
        const results = comparisonAPIService.getSessionResults(currentSession.session_id);
        console.log('Session completed with results:', results);
        
        toast({
          title: "Comparisons Complete!",
          description: `Final ranking determined after ${results?.total_comparisons || 0} comparisons`,
        });
        setCurrentSession(null);
        setCurrentComparison(null);
      } else {
        setCurrentComparison(response.next_comparison!);
        toast({
          title: "Comparison Recorded",
          description: "Loading next optimal comparison...",
        });
      }
      
      setShowReasoningModal(false);
      setSelectedResumeId('');
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('annotator');
    navigate('/login');
  };

  if (!annotator) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">A/B Testing Tool</h1>
              <p className="text-sm text-gray-600">Welcome, {annotator.username}</p>
            </div>
            <div className="flex gap-2">
              {!currentSession && (
                <Button 
                  onClick={requestNewJD}
                  disabled={isRequestingNewJD}
                >
                  {isRequestingNewJD ? "Requesting..." : "Request New JD Comparison"}
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!currentSession ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>No Active Comparison Session</CardTitle>
              <CardDescription>
                Click "Request New JD Comparison" to get started with evaluating candidates.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <PDFViewer
                  pdfUrl={currentSession.jd_pdf_url}
                  height="400px"
                  className="border rounded-lg"
                />
              </CardContent>
            </Card>

            {/* Candidate Comparison */}
            {currentComparison && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Candidate */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Candidate A</CardTitle>
                      <Button
                        onClick={() => handleCandidateSelection(currentComparison.resume_id_left)}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Select This Candidate
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PDFViewer
                      pdfUrl={currentComparison.resume_pdf_url_left}
                      height="600px"
                      className="border rounded-lg"
                    />
                  </CardContent>
                </Card>

                {/* Right Candidate */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Candidate B</CardTitle>
                      <Button
                        onClick={() => handleCandidateSelection(currentComparison.resume_id_right)}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Select This Candidate
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PDFViewer
                      pdfUrl={currentComparison.resume_pdf_url_right}
                      height="600px"
                      className="border rounded-lg"
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reasoning Modal */}
      <ReasoningModal
        isOpen={showReasoningModal}
        onSubmit={handleFeedbackSubmit}
        onClose={() => setShowReasoningModal(false)}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ComparisonDashboard;
