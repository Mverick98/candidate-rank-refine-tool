
import React from 'react';
import { cn } from '@/lib/utils';

interface PDFViewerProps {
  pdfUrl: string;
  height?: string;
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl, 
  height = "500px", 
  className 
}) => {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <iframe
        src={pdfUrl}
        width="100%"
        height="100%"
        style={{ border: 'none' }}
        title="PDF Viewer"
        className="rounded-lg"
      >
        <p>
          Your browser does not support PDFs. 
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            Download the PDF
          </a>
        </p>
      </iframe>
    </div>
  );
};

export default PDFViewer;
