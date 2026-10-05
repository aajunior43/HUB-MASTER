export interface ThemeData {
  id?: string;
  profile_id?: string;
  background_type?: string;
  background_value?: string;
  button_style?: string;
  button_color?: string;
  text_color?: string;
  font_family?: string;
  button_shadow?: string;
  button_border?: string;
  animation_style?: string;
  border_radius?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
