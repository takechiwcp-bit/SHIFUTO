import { useState, useEffect } from 'react';
import type { EventConfig, Category, Position, Staff, ShiftEntry } from './types';

export const defaultEventConfig: EventConfig = {
  name: '新規イベント',
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '17:00',
  intervalMinutes: 30,
  maxContinuousWorkMinutes: 240,
};

// ==========================================
// ここにGASのURLを貼り付けます
// 例: "https://script.google.com/macros/s/AKfycb.../exec"
// ==========================================
export const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyqUuD3fatjoOv9Uu7hZ9lsZOsUd8AuAAVjAJBy0Y0R8vhip8p1wsVAXZGNiCNI41bQsQ/exec";

export const useAppStore = () => {
  // Load from local storage
  const [eventConfig, setEventConfig] = useState<EventConfig>(() => {
    const saved = localStorage.getItem('shift_eventConfig');
    return saved ? JSON.parse(saved) : defaultEventConfig;
  });
  
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('shift_categories');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [positions, setPositions] = useState<Position[]>(() => {
    const saved = localStorage.getItem('shift_positions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('shift_staffList');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [shifts, setShifts] = useState<ShiftEntry[]>(() => {
    const saved = localStorage.getItem('shift_shifts');
    return saved ? JSON.parse(saved) : [];
  });

  const [isEventLoaded, setIsEventLoaded] = useState(() => {
    return localStorage.getItem('shift_eventLoaded') !== null;
  });

  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);

  // Save to local storage
  useEffect(() => { localStorage.setItem('shift_eventConfig', JSON.stringify(eventConfig)); }, [eventConfig]);
  useEffect(() => { localStorage.setItem('shift_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('shift_positions', JSON.stringify(positions)); }, [positions]);
  useEffect(() => { localStorage.setItem('shift_staffList', JSON.stringify(staffList)); }, [staffList]);
  useEffect(() => { localStorage.setItem('shift_shifts', JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { if(isEventLoaded) localStorage.setItem('shift_eventLoaded', 'true'); }, [isEventLoaded]);

  // Auto-sync to cloud when local data changes
  useEffect(() => {
    if (!WEBHOOK_URL || !isEventLoaded) return;
    if (isRemoteUpdate) {
      setIsRemoteUpdate(false);
      return;
    }
    
    setSyncStatus('saving');
    const timer = setTimeout(() => {
      syncToCloud();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [eventConfig, categories, positions, staffList, shifts]);

  const exportToFile = () => {
    const data = {
      eventConfig,
      categories,
      positions,
      staffList,
      shifts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventConfig.name || 'event'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importFromFile = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.eventConfig) setEventConfig(data.eventConfig);
          if (data.categories) setCategories(data.categories);
          if (data.positions) setPositions(data.positions);
          if (data.staffList) setStaffList(data.staffList);
          if (data.shifts) setShifts(data.shifts);
          setIsEventLoaded(true);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  };

  const resetData = () => {
    setEventConfig(defaultEventConfig);
    setCategories([]);
    setPositions([]);
    setStaffList([]);
    setShifts([]);
    setIsEventLoaded(true);
  };

  const syncToCloud = async () => {
    if (!WEBHOOK_URL) return;
    
    const newTimestamp = Date.now();
    const data = {
      eventConfig,
      categories,
      positions,
      staffList,
      shifts,
      lastUpdated: newTimestamp
    };
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        setLastUpdated(newTimestamp);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const loadFromCloud = async () => {
    if (!WEBHOOK_URL) return;
    
    try {
      const response = await fetch(WEBHOOK_URL);
      const data = await response.json();
      
      if (data && data.eventConfig) {
        // Only update if remote is newer
        if (data.lastUpdated && data.lastUpdated <= lastUpdated) {
          return;
        }
        
        setIsRemoteUpdate(true);
        setEventConfig(data.eventConfig);
        setCategories(data.categories || []);
        setPositions(data.positions || []);
        setStaffList(data.staffList || []);
        setShifts(data.shifts || []);
        setLastUpdated(data.lastUpdated || Date.now());
        setIsEventLoaded(true);
      }
    } catch (err) {
      console.error('Cloud load failed', err);
    }
  };

  return {
    eventConfig, setEventConfig,
    categories, setCategories,
    positions, setPositions,
    staffList, setStaffList,
    shifts, setShifts,
    isEventLoaded, setIsEventLoaded,
    exportToFile,
    importFromFile,
    resetData,
    syncToCloud,
    loadFromCloud,
    syncStatus
  };
};

export type AppStore = ReturnType<typeof useAppStore>;
