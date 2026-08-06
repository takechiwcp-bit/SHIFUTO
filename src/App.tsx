import { useState, useRef, useEffect } from 'react';
import { useAppStore, WEBHOOK_URL } from './store';
import SettingsWizard from './components/SettingsWizard';
import StaffPanel from './components/StaffPanel';
import ShiftGrid from './components/ShiftGrid';
import ValidationAlerts from './components/ValidationAlerts';
import { Calendar, Users, Grid, FileJson, Save, FilePlus, LogOut, Download, CloudDownload } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function App() {
  const store = useAppStore();
  const [appMode, setAppMode] = useState<'dashboard' | 'wizard' | 'main'>('dashboard');
  const [activeTab, setActiveTab] = useState<'grid' | 'staff'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncStatusRef = useRef(store.syncStatus);
  useEffect(() => {
    syncStatusRef.current = store.syncStatus;
  }, [store.syncStatus]);

  // 初回読み込み時にクラウドからデータを取得
  useEffect(() => {
    if (WEBHOOK_URL) {
      store.loadFromCloud();
    }
  }, []);

  const handleCreateNew = () => {
    store.createNewEvent();
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
      <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--primary-color)' }}>シフト作成アプリ</h1>
        <p className="text-muted" style={{ marginBottom: '3rem', fontSize: '1.125rem' }}>ファイルを開くだけで使える、ブラウザ完結のシフト管理ツール</p>
        
        <p style={{ color: 'var(--text-muted)' }}>
          ファイルから読み込むか、クラウドから最新のデータを取得します。
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', width: '100%', marginTop: '2rem' }}>
          <button className="btn btn-primary" style={{ padding: '1.5rem', flexDirection: 'column', gap: '1rem' }} onClick={handleCreateNew}>
            <FilePlus size={32} />
            新しいイベントを作成
          </button>
          
          <button className="btn btn-secondary" style={{ padding: '1.5rem', flexDirection: 'column', gap: '1rem' }} onClick={() => fileInputRef.current?.click()}>
            <FileJson size={32} />
            ファイルから読み込む
          </button>
          <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleFileUpload} />

          <button className="btn btn-secondary" style={{ padding: '1.5rem', flexDirection: 'column', gap: '1rem', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }} onClick={async () => {
            if(!WEBHOOK_URL) {
              alert("データベース設定が完了していません");
              return;
            }
            await store.loadFromCloud(true);
            alert("クラウドから最新のデータを読み込みました！");
          }}>
            <CloudDownload size={32} />
            クラウドから最新を取得
          </button>
        </div>
        
        
        {store.eventsList.length > 0 && (
          <div style={{ marginTop: '3rem', width: '100%', textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>保存されているイベント</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {[...store.eventsList].sort((a, b) => b.lastUpdated - a.lastUpdated).map(ev => (
                <div key={ev.id} className="card glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }} 
                     onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                     onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                     onClick={() => {
                  store.loadEvent(ev.id);
                  setAppMode('main');
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{ev.eventConfig.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                      {ev.eventConfig.date} | スタッフ {ev.staffList?.length || 0}名
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>編集する</button>
                </div>
              ))}
            </div>
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

          <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: 'bold', color: store.syncStatus === 'error' ? 'var(--danger-color)' : 'var(--text-muted)' }}>
            {store.syncStatus === 'saving' && 'クラウドに保存中...'}
            {store.syncStatus === 'saved' && '✓ 保存完了'}
            {store.syncStatus === 'error' && '通信エラー'}
            {store.syncStatus === 'idle' && '自動同期オン'}
          </div>

          <button className="btn btn-secondary" onClick={() => store.exportToFile()}>
            <Save size={18} /> バックアップ
          </button>
          
          <button className="btn btn-secondary" style={{ color: 'var(--danger-color)' }} onClick={() => {
            store.resetData();
            setAppMode('dashboard');
          }}>
            <LogOut size={18} /> 閉じる
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
