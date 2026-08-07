import { useState, useEffect } from 'react';
import { parse, addMinutes, isBefore, format } from 'date-fns';
import type { EventConfig, Category, Position, Staff, ShiftEntry, ShiftEvent } from './types';

async function compressData(data: any): Promise<string> {
  const json = JSON.stringify({
    c: data.categories?.map((c: any) => [c.id, c.name]),
    p: data.positions?.map((p: any) => [p.id, p.categoryId, p.name, p.color, p.startTime, p.endTime, p.requiredCount]),
    s: data.staffList?.map((s: any) => [s.id, s.name, s.availableStart, s.availableEnd, s.notes]),
    sh: data.shifts?.map((sh: any) => [sh.staffId, sh.positionId, sh.timeSlot]),
    d: data.deletedStaffIds || []
  });

  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const blob = await new Response(stream).blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve('C:' + (reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch(e) { console.warn('Compression failed', e); }
  }
  return 'M:' + json;
}

async function decompressData(payload: string): Promise<any> {
  try {
    let json = '';
    if (payload.startsWith('C:')) {
       const base64 = payload.substring(2);
       const res = await fetch(`data:application/octet-stream;base64,${base64}`);
       const blob = await res.blob();
       const stream = blob.stream().pipeThrough(new DecompressionStream('deflate-raw'));
       const decompressedBlob = await new Response(stream).blob();
       json = await decompressedBlob.text();
    } else if (payload.startsWith('M:')) {
       json = payload.substring(2);
    } else {
       return null;
    }
    const parsed = JSON.parse(json);
    return {
       categories: (parsed.c || []).map((c: any) => ({ id: c[0], name: c[1] })),
       positions: (parsed.p || []).map((p: any) => ({ id: p[0], categoryId: p[1], name: p[2], color: p[3], startTime: p[4], endTime: p[5], requiredCount: p[6] })),
       staffList: (parsed.s || []).map((s: any) => ({ id: s[0], name: s[1], availableStart: s[2], availableEnd: s[3], notes: s[4] })),
       shifts: (parsed.sh || []).map((sh: any) => ({ staffId: sh[0], positionId: sh[1], timeSlot: sh[2] })),
       deletedStaffIds: parsed.d || []
    };
  } catch (err) {
    console.error('Decompression error', err);
    return null;
  }
}

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
export const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwWA2mSLA4iJPTWgSJ-osBkcb8vUGaYq7sd-IAJVXElSFlKREqve_9hbUaBpcLy2_PHTw/exec";

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

  const [deletedStaffIds, setDeletedStaffIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('shift_deletedStaffIds');
    return saved ? JSON.parse(saved) : [];
  });

  const [isEventLoaded, setIsEventLoaded] = useState(() => {
    return localStorage.getItem('shift_eventLoaded') !== null;
  });

  const [eventsList, setEventsList] = useState<ShiftEvent[]>(() => {
    const saved = localStorage.getItem('shift_eventsList');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeEventId, setActiveEventId] = useState<string | null>(() => {
    return localStorage.getItem('shift_activeEventId');
  });

  const [lastUpdated, setLastUpdated] = useState<number>(() => {
    const saved = localStorage.getItem('shift_lastUpdated');
    return saved ? parseInt(saved) : 0;
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);

  // Save to local storage
  useEffect(() => { localStorage.setItem('shift_eventsList', JSON.stringify(eventsList)); }, [eventsList]);
  useEffect(() => { 
    if (activeEventId) localStorage.setItem('shift_activeEventId', activeEventId);
    else localStorage.removeItem('shift_activeEventId');
  }, [activeEventId]);
  
  // Also save current working state for quick reload
  useEffect(() => { localStorage.setItem('shift_eventConfig', JSON.stringify(eventConfig)); }, [eventConfig]);
  useEffect(() => { localStorage.setItem('shift_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('shift_positions', JSON.stringify(positions)); }, [positions]);
  useEffect(() => { localStorage.setItem('shift_staffList', JSON.stringify(staffList)); }, [staffList]);
  useEffect(() => { localStorage.setItem('shift_shifts', JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { localStorage.setItem('shift_deletedStaffIds', JSON.stringify(deletedStaffIds)); }, [deletedStaffIds]);
  useEffect(() => { 
    if (isEventLoaded) localStorage.setItem('shift_eventLoaded', 'true'); 
    else localStorage.removeItem('shift_eventLoaded');
  }, [isEventLoaded]);
  useEffect(() => { localStorage.setItem('shift_lastUpdated', lastUpdated.toString()); }, [lastUpdated]);

  // Keep eventsList in sync with working state
  useEffect(() => {
    if (!activeEventId || isRemoteUpdate) return;
    setEventsList(prev => {
      const idx = prev.findIndex(e => e.id === activeEventId);
      const newEv: ShiftEvent = { id: activeEventId, eventConfig, categories, positions, staffList, shifts, lastUpdated, deletedStaffIds };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newEv;
        return next;
      }
      return [...prev, newEv];
    });
  }, [eventConfig, categories, positions, staffList, shifts, deletedStaffIds, lastUpdated, activeEventId]);

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
  }, [eventConfig, categories, positions, staffList, shifts, deletedStaffIds]);

  // Auto-polling for real-time sync
  useEffect(() => {
    if (!WEBHOOK_URL || !isEventLoaded) return;
    
    // Poll every 10 seconds
    const timer = setInterval(() => {
      // Only poll if we aren't currently saving
      if (syncStatus === 'idle' || syncStatus === 'saved') {
         syncToCloud(true); // Reusing syncToCloud's smart merge
      }
    }, 10000);
    
    return () => clearInterval(timer);
  }, [WEBHOOK_URL, isEventLoaded, syncStatus, activeEventId, staffList, shifts, categories, positions, deletedStaffIds]);

  const removeStaff = (id: string) => {
    setStaffList(prev => prev.filter(s => s.id !== id));
    setDeletedStaffIds(prev => [...prev, id]);
  };

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
          
          const id = Date.now().toString();
          setLastUpdated(Date.now());
          setActiveEventId(id);
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

  const createNewEvent = () => {
    const id = Date.now().toString();
    setEventConfig(defaultEventConfig);
    setCategories([]);
    setPositions([]);
    setStaffList([]);
    setShifts([]);
    setDeletedStaffIds([]);
    setLastUpdated(Date.now());
    setActiveEventId(id);
    setIsEventLoaded(true);
    return id;
  };

  const loadEvent = (id: string) => {
    const ev = eventsList.find(e => e.id === id);
    if (ev) {
      setIsRemoteUpdate(true);
      setEventConfig(ev.eventConfig);
      setCategories(ev.categories || []);
      setPositions(ev.positions || []);
      setStaffList(ev.staffList || []);
      setShifts(ev.shifts || []);
      setDeletedStaffIds(ev.deletedStaffIds || []);
      setLastUpdated(ev.lastUpdated || Date.now());
      setActiveEventId(id);
      setIsEventLoaded(true);
    }
  };

  const resetData = () => {
    setActiveEventId(null);
    setIsEventLoaded(false);
  };

  const syncToCloud = async (isPolling = false) => {
    if (!WEBHOOK_URL || !activeEventId) return;
    
    if (!isPolling) {
      setSyncStatus('saving');
    }

    try {
      // 1. Fetch latest data first to smart-merge and avoid overwriting other people's edits
      const response = await fetch(WEBHOOK_URL);
      const rawData = await response.json();
      
      let mergedStaff = [...staffList];
      let mergedShifts = [...shifts];
      let mergedCategories = [...categories];
      let mergedPositions = [...positions];
      let mergedDeletedIds = [...deletedStaffIds];

      let remoteHasUpdates = false;

      const activeCloud = Array.isArray(rawData) 
        ? rawData.find(e => e.id === activeEventId) 
        : (rawData.eventConfig ? rawData : null);

      if (activeCloud && activeCloud.payload) {
        const decomp = await decompressData(activeCloud.payload);
        if (decomp) {
           // Union of deleted IDs
           const remoteDeleted = decomp.deletedStaffIds || [];
           const allDeletedSet = new Set([...deletedStaffIds, ...remoteDeleted]);
           mergedDeletedIds = Array.from(allDeletedSet);

           // Merge Categories (Union by ID)
           const catMap = new Map(decomp.categories.map((c: Category) => [c.id, c]));
           categories.forEach(c => catMap.set(c.id, c));
           mergedCategories = Array.from(catMap.values());

           // Merge Positions (Union by ID)
           const posMap = new Map(decomp.positions.map((p: Position) => [p.id, p]));
           positions.forEach(p => posMap.set(p.id, p));
           mergedPositions = Array.from(posMap.values());

           // Merge Staff (Union by ID), filtering out deleted
           const staffMap = new Map(decomp.staffList.map((s: Staff) => [s.id, s]));
           staffList.forEach(s => staffMap.set(s.id, s));
           mergedStaff = Array.from(staffMap.values()).filter(s => !allDeletedSet.has(s.id));

           // Merge Shifts (Union by staffId-timeSlot)
           const shiftKey = (sh: ShiftEntry) => `${sh.staffId}-${sh.timeSlot}`;
           const shiftMap = new Map(decomp.shifts.map((sh: ShiftEntry) => [shiftKey(sh), sh]));
           shifts.forEach(sh => shiftMap.set(shiftKey(sh), sh));
           // Filter out shifts for deleted staff
           mergedShifts = Array.from(shiftMap.values()).filter(sh => !allDeletedSet.has(sh.staffId));

           if (activeCloud.lastUpdated > lastUpdated) {
             remoteHasUpdates = true;
           }
        }
      }

      // Update local React state silently with merged data
      setIsRemoteUpdate(true);
      setCategories(mergedCategories);
      setPositions(mergedPositions);
      setStaffList(mergedStaff);
      setShifts(mergedShifts);
      setDeletedStaffIds(mergedDeletedIds);

      // If we're just polling and nothing changed locally, we can stop here if there are no new local edits to push.
      // But for safety and simplicity in a pseudo-concurrent system, we just save the merged result.
      // Actually, to save bandwidth, if it's polling and our local state is completely identical to what we merged,
      // we don't need to POST.
      if (isPolling && !remoteHasUpdates) {
         // This means we polled but nothing changed on the server, and we didn't have any unsaved local edits
         // (because if we did, syncStatus wouldn't be 'idle'). So just return.
         return;
      }

      // 2. Save the perfectly merged data to cloud
      const newTimestamp = Date.now();
      const payload = await compressData({ 
        categories: mergedCategories, 
        positions: mergedPositions, 
        staffList: mergedStaff, 
        shifts: mergedShifts,
        deletedStaffIds: mergedDeletedIds
      });

      const data: ShiftEvent = {
        id: activeEventId,
        eventConfig,
        categories: [],
        positions: [],
        staffList: [],
        shifts: [],
        lastUpdated: newTimestamp,
        payload,
        staffCount: mergedStaff.length,
        deletedStaffIds: []
      };
      
      const postResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await postResponse.json();
      if (result.success) {
        setLastUpdated(newTimestamp);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error(err);
      if (!isPolling) setSyncStatus('error');
    }
  };

  const loadFromCloud = async (force = false) => {
    // Left empty or we can just redirect to syncToCloud for the smart merge
    await syncToCloud(true);
  };

  const autoAssignShifts = () => {
    // Generate time slots
    const start = parse(eventConfig.startTime, 'HH:mm', new Date());
    let end = parse(eventConfig.endTime, 'HH:mm', new Date());
    if (isBefore(end, start)) {
      end = addMinutes(end, 24 * 60);
    }
    const slots: string[] = [];
    let current = start;
    while (isBefore(current, end)) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, eventConfig.intervalMinutes);
    }
    
    const newShifts = [...shifts];
    const continuousMinutes: Record<string, number> = {};
    const totalShifts: Record<string, number> = {};
    
    staffList.forEach(s => {
      continuousMinutes[s.id] = 0;
      totalShifts[s.id] = newShifts.filter(sh => sh.staffId === s.id).length;
    });

    const isAvailable = (staffId: string, timeSlot: string) => {
      const staff = staffList.find(s => s.id === staffId);
      if (!staff) return false;
      const start = staff.availableStart || eventConfig.startTime;
      const end = staff.availableEnd || eventConfig.endTime;
      return timeSlot >= start && timeSlot < end;
    };
    
    for (const time of slots) {
       const workingThisSlot = new Set(newShifts.filter(s => s.timeSlot === time).map(s => s.staffId));
       
       const activePositions = positions.filter(p => {
          const start = p.startTime || eventConfig.startTime;
          const end = p.endTime || eventConfig.endTime;
          return time >= start && time < end;
       });
       
       for (const pos of activePositions) {
          const currentAssigned = newShifts.filter(s => s.timeSlot === time && s.positionId === pos.id).length;
          const needed = (Number(pos.requiredCount) || 1) - currentAssigned;
          
          if (needed > 0) {
            let candidates = staffList.filter(s => {
               if (!isAvailable(s.id, time)) return false;
               if (workingThisSlot.has(s.id)) return false;
               
               const maxMins = Number(eventConfig.maxContinuousWorkMinutes) || 240;
               if (continuousMinutes[s.id] + Number(eventConfig.intervalMinutes) > maxMins) return false;
               
               return true;
            });
            
            const cat = categories.find(c => c.id === pos.categoryId);
            
            const scored = candidates.map(s => {
               let score = 0;
               const notes = s.notes || '';
               
               // 文字の長さ（名前）での推測をやめ、カテゴリーとポジションの階層構造（仕組み）で判断する
               const mentionedPosIds = new Set(positions.filter(p => p.name && notes.includes(p.name)).map(p => p.id));
               const mentionedCatIds = new Set(categories.filter(c => c.name && notes.includes(c.name)).map(c => c.id));
               
               let mentionsThis = false;
               if (mentionedPosIds.has(pos.id)) {
                 // 特定のポジション名が書かれている場合は、そのポジションを希望している
                 mentionsThis = true;
               } else if (cat && mentionedCatIds.has(cat.id)) {
                 // カテゴリー名が書かれている場合
                 // ただし、そのカテゴリーに属する「特定のポジション名」が一緒に書かれている場合は、
                 // カテゴリー全体ではなく、その特定ポジションを希望していると判断する
                 const mentionedSpecificPosInCat = positions.some(p => p.categoryId === cat.id && p.name && notes.includes(p.name));
                 if (!mentionedSpecificPosInCat) {
                   mentionsThis = true; // 特定のポジション指定がなければ、カテゴリー下の全ポジションを希望とみなす
                 }
               }
               
               const isNG = notes.includes('NG') || notes.includes('不可') || notes.includes('無理') || notes.includes('ない') || notes.includes('以外');
               
               if (mentionsThis) {
                 if (isNG) {
                   score -= 1000; // 絶対に入れない（NG指定）
                 } else {
                   score += 100;  // 優先的に入れる（希望指定）
                 }
               }
               
               // 公平に割り振るためのスコア計算
               score += Math.random() * 5; 
               score -= (totalShifts[s.id] || 0) * 10;
               return { staff: s, score };
            });
            
            // NG指定された人は候補から完全に除外する
            const validScored = scored.filter(s => s.score > -500);
            
            validScored.sort((a, b) => b.score - a.score);
            
            for (let i = 0; i < Math.min(needed, validScored.length); i++) {
               const sId = validScored[i].staff.id;
               newShifts.push({ staffId: sId, timeSlot: time, positionId: pos.id });
               workingThisSlot.add(sId);
               totalShifts[sId]++;
            }
          }
       }
       
       staffList.forEach(s => {
          if (workingThisSlot.has(s.id)) {
            continuousMinutes[s.id] += eventConfig.intervalMinutes;
          } else {
            continuousMinutes[s.id] = 0;
          }
       });
    }
    
    setShifts(newShifts);
  };

  return {
    eventConfig, setEventConfig,
    categories, setCategories,
    positions, setPositions,
    staffList, setStaffList,
    shifts, setShifts,
    removeStaff,
    isEventLoaded, setIsEventLoaded,
    exportToFile,
    importFromFile,
    resetData,
    createNewEvent,
    loadEvent,
    eventsList,
    activeEventId,
    syncToCloud,
    loadFromCloud,
    autoAssignShifts,
    syncStatus
  };
};

export type AppStore = ReturnType<typeof useAppStore>;
