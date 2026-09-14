/* Shapes shared across the board.
 *
 * These are the payloads the dashboard's own routes return — in the demo, what
 * `demoFetch` returns. They live here rather than in a widget because more than
 * one widget consumes each of them, and the board passes tasks and weather into
 * the assistant as context. */

export type TaskStatus = "Not Started" | "In Progress" | "Done";

/** A row from either Notion tasks database, after the API route has split the
 *  "[COURSE] name" prefix the Brightspace sync writes into its own field. */
export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  course: string | null;
  isSchool: boolean;
  url: string;
  /* Demo-only. The live board has no per-task description — these explain where
     the row came from, which is the part sample data would otherwise hide. */
  note?: string;
  origin?: "sync" | "manual" | "assistant";
}

/** The subset of the Open-Meteo response the weather card reads. */
export interface Forecast {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  error?: string;
}

/** Arguments for a dashboard action the assistant can invoke. Every field is
 *  optional because each action uses its own subset, and the model — or, in the
 *  demo, the intent matcher — decides which it fills in. */
export interface ChatActionArgs {
  // add_note
  content?: string;
  color?: string;
  // add_task / delete_task
  title?: string;
  database?: "school" | "personal";
  dueDate?: string | null;
  course?: string;
  // add_event / delete_event
  date?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  location?: string | null;
  // add_quick_link
  label?: string;
  url?: string;
  icon?: string;
}
