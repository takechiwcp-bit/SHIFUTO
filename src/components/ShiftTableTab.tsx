import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';
import { TimelineView } from './TimelineView';
import { useStore } from '../store';

interface ShiftTableTabProps {
  eventId: string;
}

export const ShiftTableTab: React.FC<ShiftTableTabProps> = ({ eventId }) => {
  const { Events, PositionCategories, Positions, Shifts, Staff } = useStore();
  const currentEvent = Events.find(e => e.id === eventId);
  const eventCategories = PositionCategories.filter(c => c.eventId === eventId);
  const eventCategoryIds = eventCategories.map(c => c.id);
  const eventPositions = Positions.filter(p => eventCategoryIds.includes(p.categoryId));

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!timelineRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // 少し待ってからレンダリングを開始（UIの更新待ち）
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(timelineRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${currentEvent?.name || 'シフト表'}.pdf`);
    } catch (error) {
      console.error('PDF generation failed', error);
      alert('PDFの生成に失敗しました。');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const exportToCSV = () => {
    const rows = [
      ['日付', 'イベント名', 'カテゴリー', 'ポジション', '時間枠', 'スタッフ名']
    ];
    
    eventCategories.forEach(cat => {
      const catPos = eventPositions.filter(p => p.categoryId === cat.id);
      catPos.forEach(pos => {
        const posShifts = Shifts.filter(s => s.positionId === pos.id);
        
        // Sort shifts by time
        posShifts.sort((a, b) => {
          const startA = (a.timeBlock || '').split('-')[0] || '';
          const startB = (b.timeBlock || '').split('-')[0] || '';
          return startA.localeCompare(startB);
        });

        posShifts.forEach(shift => {
          const staff = Staff.find(s => s.id === shift.staffId);
          const staffName = staff ? staff.name : '不明';
          rows.push([
            currentEvent?.date || '',
            currentEvent?.name || '',
            cat.name,
            pos.name,
            shift.timeBlock || '',
            staffName
          ]);
        });
      });
    });

    // Add BOM for Excel to prevent mojibake
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentEvent?.name || 'シフトデータ'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div>
          <h2 className="text-lg font-bold text-gray-800">シフト表（完成版）</h2>
          <p className="text-sm text-gray-500 mt-1">作成したシフトのタイムライン表示と、PDF・CSV形式でのダウンロードが可能です。</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download size={18} />
            CSVダウンロード
          </button>
          <button 
            className="btn btn-primary flex items-center gap-2"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            <Download size={18} />
            {isGeneratingPDF ? 'PDF生成中...' : 'PDFでダウンロード'}
          </button>
        </div>
      </div>

      <div ref={timelineRef} className="bg-white rounded-xl">
        <TimelineView eventId={eventId} />
      </div>
    </div>
  );
};
