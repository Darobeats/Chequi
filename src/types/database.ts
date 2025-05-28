
export interface ControlType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
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
  email: string | null;
  company: string | null;
  category_id: string;
  status: 'valid' | 'used' | 'blocked';
  created_at: string;
  updated_at: string;
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
