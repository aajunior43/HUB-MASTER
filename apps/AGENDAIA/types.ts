
export interface CalendarEvent {
  title: string;
  startDate: string; // ISO String
  endDate: string;   // ISO String
  location: string;
  description: string;
  isAllDay: boolean;
}

export interface GenerationStatus {
  loading: boolean;
  error: string | null;
  success: boolean;
}
