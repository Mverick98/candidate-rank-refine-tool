
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReasoningModalProps {
  isOpen: boolean;
  onSubmit: (reasons: string[], otherText?: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const REASON_OPTIONS = [
  { id: 'resume_quality', label: 'Better resume quality' },
  { id: 'role_alignment', label: 'Higher role alignment' },
  { id: 'skill_alignment', label: 'Higher skill alignment' },
  { id: 'recent_experience', label: 'Recent experience more related to JD' },
  { id: 'domain_relevance', label: 'Higher domain relevance with JD' },
  { id: 'others', label: 'Others' },
];

const ReasoningModal: React.FC<ReasoningModalProps> = ({
  isOpen,
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedReasons([]);
      setOtherText('');
    }
  }, [isOpen]);

  const handleReasonChange = (reasonId: string, checked: boolean) => {
    if (checked) {
      setSelectedReasons(prev => [...prev, reasonId]);
    } else {
      setSelectedReasons(prev => prev.filter(id => id !== reasonId));
      if (reasonId === 'others') {
        setOtherText('');
      }
    }
  };

  const handleSubmit = () => {
    if (selectedReasons.length === 0) return;
    
    const finalOtherText = selectedReasons.includes('others') && otherText.trim() 
      ? otherText.trim() 
      : undefined;
    
    onSubmit(selectedReasons, finalOtherText);
  };

  const isSubmitDisabled = selectedReasons.length === 0 || 
    (selectedReasons.includes('others') && !otherText.trim()) ||
    isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => isLoading && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Why did you select this candidate?</DialogTitle>
          <DialogDescription>
            Please select at least one reason for your choice. This feedback helps improve our ranking algorithms.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {REASON_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-start space-x-2">
              <Checkbox
                id={option.id}
                checked={selectedReasons.includes(option.id)}
                onCheckedChange={(checked) => 
                  handleReasonChange(option.id, checked as boolean)
                }
                disabled={isLoading}
              />
              <Label 
                htmlFor={option.id}
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option.label}
              </Label>
            </div>
          ))}
          
          {selectedReasons.includes('others') && (
            <div className="mt-3">
              <Label htmlFor="other-text" className="text-sm font-medium">
                Please specify:
              </Label>
              <Textarea
                id="other-text"
                placeholder="Enter your reason here..."
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                disabled={isLoading}
                maxLength={250}
                className="mt-1 min-h-[80px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                {otherText.length}/250 characters
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="w-full"
          >
            {isLoading ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReasoningModal;
