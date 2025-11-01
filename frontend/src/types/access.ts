export type AccessLevel = 'READ' | 'WRITE' | 'ADMIN';

export type DataClassification = 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';

export type PhysicalAccessLevel = 'VISITOR' | 'STANDARD' | 'RESTRICTED' | 'FULL';

export type AccessStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface ComputerAccess {
  id: number;
  person_id: number; // Changed from person_id
  system_name: string;
  access_level: AccessLevel;
  granted_by_person_id: number; // Changed from granted_by
  granted_at: string;
  expires_at: string | null;
  status: AccessStatus;
  created_at: string;
  updated_at: string;
}

export interface DataAccess {
  id: number;
  person_id: number; // Changed from person_id
  data_classification: DataClassification;
  access_level: 'READ' | 'WRITE' | 'DELETE';
  granted_by_person_id: number; // Changed from granted_by
  granted_at: string;
  expires_at: string | null;
  status: AccessStatus;
  created_at: string;
  updated_at: string;
}

export interface PhysicalAccess {
  id: number;
  person_id: number; // Changed from person_id
  zone_name: string;
  access_level: PhysicalAccessLevel;
  valid_from: string;
  valid_until: string | null;
  granted_by_person_id: number; // Changed from granted_by
  status: AccessStatus;
  created_at: string;
  updated_at: string;
}

export interface PersonAccess {
  computer_access: ComputerAccess[];
  data_access: DataAccess[];
  physical_access: PhysicalAccess[];
}

export interface CreateComputerAccessRequest {
  person_id: number; // Changed from person_id
  system_name: string;
  access_level: AccessLevel;
  expires_at?: string;
}

export interface CreateDataAccessRequest {
  person_id: number; // Changed from person_id
  data_classification: DataClassification;
  access_level: 'READ' | 'WRITE' | 'DELETE';
  expires_at?: string;
}

export interface CreatePhysicalAccessRequest {
  person_id: number; // Changed from person_id
  zone_name: string;
  access_level: PhysicalAccessLevel;
  valid_until?: string;
}

