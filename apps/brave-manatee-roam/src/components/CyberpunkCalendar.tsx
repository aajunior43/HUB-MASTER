"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function CyberpunkCalendar({
  className,
  ...props
}: React.ComponentProps<typeof Calendar>) {
  return (
    <div
      className={cn(
        "relative p-4 bg-gray-950 border border-purple-700 rounded-lg shadow-glow-purple overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-cyan-900/20 opacity-30 animate-pulse-slow"></div>
      <div className="relative z-10">
        <Calendar
          className="rounded-md border-none bg-transparent text-white"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-lg font-medium text-cyan-400",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              "data-[radix-focus-visible]:ring-offset-gray-950"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex w-full",
            head_cell: "h-9 w-9 text-center text-purple-400 font-normal text-[0.8rem] p-0", // Adicionado h-9 e text-center para alinhar com as células dos dias
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-range-middle)]:rounded-md [&:has([aria-selected])]:bg-gray-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              "text-white hover:bg-gray-700 focus:bg-gray-700",
              "data-[radix-focus-visible]:ring-offset-gray-950"
            ),
            day_range_end: "day-range-end",
            day_selected:
              "bg-cyan-600 text-white hover:bg-cyan-600 hover:text-white focus:bg-cyan-600 focus:text-white",
            day_today: "bg-gray-700 text-white",
            day_outside: "text-gray-500 opacity-50",
            day_disabled: "text-gray-500 opacity-50",
            day_range_middle:
              "aria-selected:bg-gray-800 aria-selected:text-white",
            day_hidden: "invisible",
            ...props.classNames,
          }}
          components={{
            IconLeft: ({ ...props }) => (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="h-4 w-4 text-cyan-400"
                {...props}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            ),
            IconRight: ({ ...props }) => (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="h-4 w-4 text-cyan-400"
                {...props}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            ),
          }}
          {...props}
        />
      </div>
    </div>
  );
}