export interface SupportTicket {
  id: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Normal' | 'Urgent';
  date: string;
  department: string;
}

export interface UserFeedback {
  id: string;
  type: 'general' | 'feature_request' | 'bug';
  rating: number | null;
  message: string;
  created_at: string;
}
