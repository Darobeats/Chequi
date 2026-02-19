
export interface ControlType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  requires_control_id: string | null;
  event_id: string;
  required_control?: ControlType;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  event_id: string;
}

export interface CategoryControl {
  id: string;
  category_id: string;
  control_type_id: string;
  max_uses: number;
  created_at: string;
  control_type?: ControlType;
  ticket_category?: TicketCategory;
}

export interface Attendee {
  id: string;
  ticket_id: string;
  name: string;
  cedula: string | null;
  category_id: string;
  status: 'valid' | 'used' | 'blocked';
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  event_id: string;
  ticket_category?: TicketCategory;
}

export interface ControlUsage {
  id: string;
  attendee_id: string;
  control_type_id: string;
  used_at: string;
  device: string | null;
  notes: string | null;
  control_type?: ControlType;
  attendee?: Attendee;
}

export interface EventConfig {
  id: string;
  event_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  event_image_url: string | null;
  font_family: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  event_date: string | null;
  event_status: 'draft' | 'active' | 'finished';
  background_url: string | null;
  sponsor_logos: any;
  welcome_message: string | null;
  background_opacity: number;
}

export interface TicketElement {
  id: string;
  type: 'qr' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  field?: 'name' | 'email' | 'ticket_id' | 'category' | 'cedula';
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  bold?: boolean;
}

export interface TicketTemplate {
  id: string;
  event_config_id: string | null;
  name: string;
  tickets_per_page: number;
  layout: string;
  show_qr: boolean;
  show_name: boolean;
  show_email: boolean;
  show_category: boolean;
  show_ticket_id: boolean;
  custom_fields: any;
  qr_size: number;
  font_size_name: number;
  font_size_info: number;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  background_image_url: string | null;
  background_opacity: number;
  background_mode: 'tile' | 'cover' | 'contain';
  created_at: string;
  updated_at: string;
  canvas_width?: number;
  canvas_height?: number;
  elements?: TicketElement[];
  use_visual_editor?: boolean;
}


export interface QRTemplate {
  id: string;
  category_id: string;
  prefix: string;
  pattern: string;
  created_at: string;
  event_id: string;
  ticket_category?: TicketCategory;
}
