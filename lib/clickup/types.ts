// ClickUp API Response Types

export interface ClickUpTeamMember {
  id: number;
  username: string;
  email?: string;
  color?: string;
  profilePicture?: string;
  initials?: string;
  role?: number;
  custom_role?: string | null;
  last_active?: string;
  date_joined?: string;
  date_invited?: string;
}

export interface ClickUpTeamMemberWrapper {
  user: ClickUpTeamMember;
  invited_by?: {
    id: number;
    username: string;
    email?: string;
  };
}

export interface ClickUpTeamResponse {
  team: {
    id: string;
    name: string;
    color?: string;
    avatar?: string;
    members: ClickUpTeamMemberWrapper[];
  };
}

export interface ClickUpTimeEntry {
  id: string;
  task?: {
    id: string;
    name: string;
    status?: {
      status: string;
      color: string;
    };
  };
  wid?: string;
  user: {
    id: number;
    username: string;
    email?: string;
    color?: string;
    initials?: string;
    profilePicture?: string;
  };
  billable: boolean;
  start: string; // Unix timestamp in milliseconds (as string)
  end?: string; // Unix timestamp in milliseconds (as string)
  duration: string; // Duration in milliseconds as string
  description?: string;
  tags: Array<{
    name: string;
    tag_fg?: string;
    tag_bg?: string;
  }>;
  source?: string;
  at: string; // When the entry was created/logged (Unix timestamp in milliseconds as string)
  task_location?: {
    list_id?: string;
    list_name?: string;
    folder_id?: string;
    folder_name?: string;
    space_id?: string;
    space_name?: string;
  };
}

export interface ClickUpTimeEntriesResponse {
  data: ClickUpTimeEntry[];
}

export interface ClickUpApiErrorResponse {
  err: string;
  ECODE: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses?: Array<{
    id: string;
    status: string;
    type: string;
    orderindex: number;
    color: string;
  }>;
  multiple_assignees?: boolean;
  features?: {
    due_dates?: {
      enabled: boolean;
      start_date: boolean;
      remap_due_dates: boolean;
      remap_closed_due_date: boolean;
    };
    time_tracking?: {
      enabled: boolean;
    };
  };
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  content?: string;
  status?: {
    status: string;
    color: string;
    hide_label: boolean;
  };
  priority?: {
    priority: string;
    color: string;
  };
  assignee?: ClickUpTeamMember | null;
  task_count?: number;
  due_date?: string;
  start_date?: string;
  folder?: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space?: {
    id: string;
    name: string;
    access: boolean;
  };
  archived: boolean;
}

