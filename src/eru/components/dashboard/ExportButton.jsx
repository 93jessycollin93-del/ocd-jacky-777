import { useState } from 'react';
import { FileJson, FileText, Loader2 } from 'lucide-react';
import { generateAppWidePDF } from '@/eru/lib/pdfExporter';
import { toast } from 'sonner';

export default function ExportButton({ appData }) {
  const [exporting, setExporting] = useState(false);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `app_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('App data downloaded');
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await generateAppWidePDF(appData);
      toast.success('App data PDF exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={downloadJson}
        className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:border-primary/30 transition-all"
      >
        <FileJson className="w-4 h-4" />
        Download
      </button>
      <button
        onClick={handleExportPdf}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Export PDF
          </>
        )}
      </button>
    </div>
  );
}