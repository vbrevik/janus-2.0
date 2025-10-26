export type AccessLevel = 'READ' | 'WRITE' | 'ADMIN';

export type DataClassification = 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';

export type PhysicalAccessLevel = 'VISITOR' | 'STANDARD' | 'RESTRICTED' | 'FULL';

export type AccessStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface ComputerAccess {
  id: number;
  personnel_id: number;
  system_name: string;
  access_level: AccessLevel;
  granted_by: number;
  granted_at: string;
  expires_at: string | null;
  status: AccessStatus;
  created_at: string;
  updated_at: string;
}

export interface DataAccess {
  id: number;
  personnel_id: number;
  data_classification: DataClassification;
  access_level: 'READ' | 'WRITE' | 'DELETE';
  granted_by: number;
  granted_at: string;
  expires_at: string | null;
  status: AccessStatus;
  created_at: string;
  updated_at: string;
}

export interface PhysicalAccess {
  id: number;
  personnel_id: number;
  zone_name: string;
  access_level: PhysicalAccessLevel;
  valid_from: string;
  valid_until: string | null;
  granted_by: number;
  status: AccessStatus;
  created_at: string;
  updated_at: string;
}

export interface PersonnelAccess {
  computer_access: ComputerAccess[];
  data_access: DataAccess[];
  physical_access: PhysicalAccess[];
}

export interface CreateComputerAccessRequest {
  personnel_id: number;
  system_name: string;
  access_level: AccessLevel;
  expires_at?: string;
}

export interface CreateDataAccessRequest {
  personnel_id: number;
  data_classification: DataClassification;
  access_level: 'READ' | 'WRITE' | 'DELETE';
  expires_at?: string;
}

export interface CreatePhysicalAccessRequest {
  personnel_id: number;
  zone_name: string;
  access_level: PhysicalAccessLevel;
  valid_until?: string;
}

