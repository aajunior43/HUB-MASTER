
import { CalendarEvent } from "../types";

/**
 * Formata data para o padrão do Google Calendar (YYYYMMDDTHHMMSSZ)
 */
const formatGoogleDate = (dateStr: string, isAllDay: boolean): string => {
  const date = new Date(dateStr);
  const iso = date.toISOString().replace(/[-:]/g, '').split('.')[0];
  
  if (isAllDay) {
    // Para dia inteiro, Google espera YYYYMMDD
    return iso.split('T')[0];
  }
  
  return iso + 'Z';
};

/**
 * Formata data para o padrão ICS (YYYYMMDDTHHMMSS)
 */
const formatICSDate = (dateStr: string): string => {
  return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const createGoogleCalendarUrl = (event: CalendarEvent): string => {
  const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
  const start = formatGoogleDate(event.startDate, event.isAllDay);
  const end = formatGoogleDate(event.endDate, event.isAllDay);
  
  const params = new URLSearchParams({
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
    location: event.location,
    sf: "true",
    output: "xml"
  });

  return `${baseUrl}&${params.toString()}`;
};

export const downloadICSFile = (event: CalendarEvent) => {
  const startDate = formatICSDate(event.startDate);
  const endDate = formatICSDate(event.endDate);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gerador de Agenda IA//PT-BR',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@seugerador.app`,
    `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
