
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
  const handlePDFError = () => {
    console.log('PDF failed to load:', pdfUrl);
  };

  return (
    <div className={cn("w-full border rounded-lg overflow-hidden", className)} style={{ height }}>
      <iframe
        src={pdfUrl}
        width="100%"
        height="100%"
        style={{ border: 'none' }}
        title="PDF Viewer"
        onError={handlePDFError}
        className="bg-gray-50"
      >
        <div className="p-4 text-center">
          <p className="text-gray-600 mb-2">
            Your browser does not support PDFs.
          </p>
          <a 
            href={pdfUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Download the PDF
          </a>
        </div>
      </iframe>
    </div>
  );
};

export default PDFViewer;
