export interface User {
  id: number;
  username: string;
  role: string;
  company_id: number;
  company_name: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface StateItem {
  StateId: number;
  StateName: string;
  GSTStateCode: string | null;
}

export interface Company {
  CompanyId: number;
  Name: string;
  AddressLine1: string;
  AddressLine2: string;
  AddressLine3: string;
  Phone: string | null;
  Narration: string | null;
  Pincode: string | null;
  GstNo: string | null;
  state_id: number | null;
  state_name: string | null;
  Email: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}
