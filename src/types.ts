export interface AppEvent {
  id: string;
  name: string;
  date: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  remarks: string;
  workMinutesBeforeBreak?: number; // minutes
  breakMinutes?: number; // minutes
}

export interface PositionCategory {
  id: string;
  eventId: string;
  name: string;
  allowedRole?: 'WCP' | 'ボランティア' | '制限なし';
}

export interface Position {
  id: string;
  categoryId: string;
  name: string;
  requiredPeople: number;
  unitTime: number; // minutes
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  remarks: string;
  isFixed?: boolean;
}

export interface Staff {
  id: string;
  name: string;
  availableStartTime?: string; // HH:mm
  availableEndTime?: string; // HH:mm
  remarks: string;
  role?: 'WCP' | 'ボランティア';
}

export interface StaffTrait {
  staffId: string;
  positionId: string;
  trait: string;
}

export interface Shift {
  id: string;
  positionId: string;
  timeBlock: string; // HH:mm
  slotIndex: number;
  staffId: string;
}

export interface AppState {
  Events: AppEvent[];
  PositionCategories: PositionCategory[];
  Positions: Position[];
  Staff: Staff[];
  StaffTraits: StaffTrait[];
  Shifts: Shift[];
}
