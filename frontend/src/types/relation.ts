// Unified relations types - supports personnel-personnel, personnel-vendor, vendor-vendor

export type EntityType = 'personnel' | 'vendor';

export type RelationType = 
  // Vendor -> Vendor
  | 'sub_vendor' 
  | 'subcontractor'
  // Vendor -> Personnel or Personnel -> Vendor
  | 'employee' 
  | 'consultant' 
  | 'partner'
  // Personnel -> Personnel
  | 'manager'
  | 'supervisor'
  | 'subordinate'
  | 'reports_to'
  | 'colleague'
  | 'peer'
  | 'team_member';

export interface Relation {
  id: number;
  entity_type: EntityType;
  entity_id: number;
  related_entity_type: EntityType;
  related_entity_id: number;
  relation_type: RelationType;
  notes: string | null;
  valid_from: string; // ISO date string
  valid_until: string | null; // ISO date string
  created_at: string;
  updated_at: string;
}

export interface RelationWithNames extends Relation {
  entity_name: string;
  related_entity_name: string;
}

export interface CreateRelationRequest {
  entity_type: EntityType;
  entity_id: number;
  related_entity_type: EntityType;
  related_entity_id: number;
  relation_type: RelationType;
  notes?: string;
  valid_from?: string; // ISO date string YYYY-MM-DD
  valid_until?: string; // ISO date string YYYY-MM-DD
}

export interface UpdateRelationRequest {
  relation_type?: RelationType;
  notes?: string;
  valid_from?: string;
  valid_until?: string;
}

export interface EntityHierarchy {
  entity_id: number;
  entity_type: EntityType;
  entity_name: string;
  relation_type: RelationType;
  level: number;
  children: EntityHierarchy[];
}

