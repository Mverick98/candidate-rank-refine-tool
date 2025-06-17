
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl font-bold">
            Ranking Algorithm A/B Testing Tool
          </CardTitle>
          <CardDescription className="text-lg">
            A comprehensive platform for evaluating and comparing candidate ranking algorithms 
            through human annotator feedback and pairwise comparisons.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Key Features:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                Side-by-side PDF comparison of job descriptions and candidate resumes
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                Structured feedback collection with reasoning categories
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                Automatic task allocation ensuring no conflicts between annotators
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                Bias-neutral presentation with randomized candidate positioning
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                Comprehensive tracking of algorithm performance and user preferences
              </li>
            </ul>
          </div>
          
          <div className="pt-4 text-center">
            <Button 
              onClick={() => navigate('/login')} 
              size="lg"
              className="px-8"
            >
              Start Annotating
            </Button>
          </div>
          
          <div className="text-sm text-gray-500 text-center">
            <p>For annotators: Click above to begin comparing candidates</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
