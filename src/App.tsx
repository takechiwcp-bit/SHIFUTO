import { useState } from 'react';
import { useAppStore } from './store';
import SettingsWizard from './components/SettingsWizard';
import StaffPanel from './components/StaffPanel';
import ShiftGrid from './components/ShiftGrid';
import ValidationAlerts from './components/ValidationAlerts';
import { Calendar, Users, Grid, FileJson, Save, FilePlus, LogOut, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function App() {
  const store = useAppStore();
  const [appMode, setAppMode] = useState<'dashboard' | 'wizard' | 'main'>('dashboard');
  const [activeTab, setActiveTab] = useState<'grid' | 'staff'>('grid');

  const handleCreateNew = () => {
    store.resetData();
    setAppMode('wizard');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await store.importFromFile(file);
        setAppMode('main');
      } catch (err) {
        alert("ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。");
      }
    }
    e.target.value = ''; // reset
  };

  if (appMode === 'dashboard') {
    return (
      <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--primary-color)' }}>シフト作成アプリ</h1>
        <p className="text-muted" style={{ marginBottom: '3rem', fontSize: '1.125rem' }}>ファイルを開くだけで使える、ブラウザ完結のシフト管理ツール</p>
        
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button className="card glass" style={{ width: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s', border: '2px solid transparent' }} 
            onClick={handleCreateNew}
          >
            <FilePlus size={48} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>新規イベント作成</h3>
            <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.875rem' }}>ゼロから新しいシフト表を作成します</p>
          </button>

          <label className="card glass" style={{ width: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
            <FileJson size={48} color="var(--success-color)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>ファイルを読み込む</h3>
            <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.875rem' }}>保存した.jsonファイルからデータを復元します</p>
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
        </div>
        
        {store.isEventLoaded && (
          <div style={{ marginTop: '3rem' }}>
            <button className="btn btn-secondary" onClick={() => setAppMode('main')}>
              前回の作業データから再開する
            </button>
          </div>
        )}
      </div>
    );
  }

  if (appMode === 'wizard') {
    return <SettingsWizard store={store} onComplete={() => setAppMode('main')} onCancel={() => setAppMode('dashboard')} />;
  }

  // MAIN APP MODE
  return (
    <div className="container animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{store.eventConfig.name}</h1>
          <p className="text-muted">{store.eventConfig.date} ({store.eventConfig.startTime} - {store.eventConfig.endTime})</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setAppMode('wizard')}>
            <Calendar size={18} /> 設定変更
          </button>
          
          {activeTab === 'grid' && (
            <button className="btn btn-primary" style={{ backgroundColor: 'var(--accent-color)' }} onClick={async () => {
              const el = document.getElementById('shift-grid-export');
              if(!el) return;
              try {
                const canvas = await html2canvas(el, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                  orientation: canvas.width > canvas.height ? 'l' : 'p',
                  unit: 'px',
                  format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`${store.eventConfig.name}_シフト表.pdf`);
              } catch (e) {
                alert('PDF出力に失敗しました');
              }
            }}>
              <Download size={18} /> PDF化
            </button>
          )}

          <button className="btn btn-primary" onClick={() => store.exportToFile()}>
            <Save size={18} /> ファイル保存
          </button>
          <button className="btn btn-secondary" style={{ color: 'var(--danger-color)' }} onClick={() => {
            if(window.confirm('ダッシュボードに戻りますか？未保存の変更は「前回の作業データ」として残りますが、ファイル保存をお勧めします。')) {
              setAppMode('dashboard');
            }
          }}>
            <LogOut size={18} /> 終了
          </button>
        </div>
      </header>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'grid' ? 'active' : ''}`}
          onClick={() => setActiveTab('grid')}
        >
          <Grid size={18} style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'text-bottom' }}/>
          シフト表作成
        </button>
        <button 
          className={`tab ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={18} style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'text-bottom' }}/>
          スタッフ入力
        </button>
      </div>

      <div className="dashboard-grid">
        <main className="card glass">
          {activeTab === 'staff' && <StaffPanel store={store} />}
          {activeTab === 'grid' && <ShiftGrid store={store} />}
        </main>
        
        <aside>
          <ValidationAlerts store={store} />
        </aside>
      </div>
    </div>
  );
}

export default App;
