// Spike 005 — inter-entity interchange contract. Entities communicate ONLY via typed
// envelopes routed through a Network; no direct cross-entity function calls.
import {
  SUBJECTS,
  HUB_INDEX,
  type EntityId,
  type Subject,
  type Domain,
} from "./data";
import {
  evaluate,
  releaseRequirementFor,
  type Decision,
  type Principal,
} from "./abac";

export type Envelope =
  | { kind: "PUBLISH"; from: EntityId; subjectId: string; domain: Domain }
  | { kind: "DISCOVER"; from: EntityId; subjectId: string }
  | {
      kind: "DISCOVER_RESULT";
      to: EntityId;
      subjectId: string;
      pointers: Pointer[];
    }
  | {
      kind: "REQUEST_DETAIL";
      from: EntityId;
      to: EntityId;
      subjectId: string;
      requester: Principal;
    }
  | {
      kind: "DETAIL_RESPONSE";
      to: EntityId;
      subjectId: string;
      granted: boolean;
      decision: Decision | null;
      record: Subject | null;
    };

export interface Pointer {
  holder: EntityId;
  domain: Domain;
}

export interface DetailResult {
  granted: boolean;
  decision: Decision | null;
  record: Subject | null;
}

// In-process network: the only channel between entities. Records a transcript for observability.
export class Network {
  transcript: Envelope[] = [];
  private pointers: { subjectId: string; holder: EntityId; domain: Domain }[] =
    [];
  private records = new Map<EntityId, Map<string, Subject>>();

  constructor() {
    for (const p of HUB_INDEX) {
      const subj = SUBJECTS.find((s) => s.id === p.subjectId);
      if (!subj) continue;
      if (!this.records.has(p.holdingEntity))
        this.records.set(p.holdingEntity, new Map());
      this.records.get(p.holdingEntity)!.set(subj.id, subj);
    }
  }

  publishAll(): void {
    for (const p of HUB_INDEX) {
      this.transcript.push({
        kind: "PUBLISH",
        from: p.holdingEntity,
        subjectId: p.subjectId,
        domain: p.domain,
      });
      this.pointers.push({
        subjectId: p.subjectId,
        holder: p.holdingEntity,
        domain: p.domain,
      });
    }
  }

  discover(from: EntityId, subjectId: string): Pointer[] {
    this.transcript.push({ kind: "DISCOVER", from, subjectId });
    const pointers: Pointer[] = this.pointers
      .filter((p) => p.subjectId === subjectId)
      .map((p) => ({ holder: p.holder, domain: p.domain }));
    this.transcript.push({
      kind: "DISCOVER_RESULT",
      to: from,
      subjectId,
      pointers,
    });
    return pointers;
  }

  requestDetail(
    from: EntityId,
    holder: EntityId,
    subjectId: string,
    requester: Principal,
  ): DetailResult {
    this.transcript.push({
      kind: "REQUEST_DETAIL",
      from,
      to: holder,
      subjectId,
      requester,
    });
    const record = this.records.get(holder)?.get(subjectId) ?? null;

    let result: DetailResult;
    if (!record) {
      result = { granted: false, decision: null, record: null };
    } else {
      const base = evaluate(requester, releaseRequirementFor(record, holder));
      const blocked = record.flags.securityHold || record.flags.revoked;
      const decision: Decision = blocked
        ? {
            ...base,
            decision: "DENY",
            overrides: [
              ...base.overrides,
              {
                name: "Record hold",
                pass: false,
                detail: "target record is held/revoked",
              },
            ],
          }
        : base;
      result = {
        granted: decision.decision === "ALLOW",
        decision,
        record: decision.decision === "ALLOW" ? record : null,
      };
    }

    this.transcript.push({
      kind: "DETAIL_RESPONSE",
      to: from,
      subjectId,
      granted: result.granted,
      decision: result.decision,
      record: result.record,
    });
    return result;
  }
}
