// Unified relations types - supports person-person, person-organization, organization-organization

export type EntityType = 'person' | 'organization'; // Changed from 'personnel' | 'vendor'

export type RelationType = 
  // Organization -> Organization
  | 'sub_vendor' 
  | 'subcontractor'
  // Organization -> Person or Person -> Organization
  | 'employee' 
  | 'consultant' 
  | 'partner'
  // Person -> Person (Schema.org based + organizational)
  // Organizational/Professional Relations
  | 'manager'
  | 'supervisor'
  | 'subordinate'
  | 'reports_to'
  | 'colleague'      // Schema.org: colleague
  | 'peer'
  | 'team_member'
  // Schema.org Personal Relations
  | 'knows'          // Schema.org: knows (generic bi-directional social or work relation)
  | 'related_to'     // Schema.org: relatedTo (generic familial relation)
  | 'parent'         // Schema.org: parent
  | 'child'          // Schema.org: child/children
  | 'sibling'        // Schema.org: sibling
  | 'spouse'         // Schema.org: spouse
  | 'follows';       // Schema.org: follows (uni-directional social relation)

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

