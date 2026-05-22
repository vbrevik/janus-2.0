// demo/lib/contract.ts — pure interchange helpers lifted from spikes/lib/contract.ts. Network class NOT ported (D2-02).
import {
  type UnitId,
  type Domain,
  type Subject,
  type Envelope,
  type Pointer,
  type HubPointer,
} from "./model";
import {
  evaluate,
  releaseRequirementFor,
  type Decision,
  type Principal,
} from "./abac";

export interface DetailResult {
  granted: boolean;
  decision: Decision | null;
  record: Subject | null;
}

// Returns a PUBLISH envelope for the given subject/domain.
// Source: spike Network.publishAll() body (lines 72-75).
export function buildPublishEnvelope(
  from: UnitId,
  subjectId: string,
  domain: Domain,
): Envelope {
  return { kind: "PUBLISH", from, subjectId, domain };
}

// Returns a [DISCOVER, DISCOVER_RESULT] envelope tuple for the given subject.
// Filters hubIndex to find all pointers for subjectId, maps to Pointer[].
// Source: spike Network.discover() body (lines 87-98).
export function buildDiscoverEnvelopes(
  from: UnitId,
  subjectId: string,
  hubIndex: HubPointer[],
): [Envelope, Envelope] {
  const pointers: Pointer[] = hubIndex
    .filter((p) => p.subjectId === subjectId)
    .map((p) => ({ holder: p.holdingUnit, domain: p.domain }));

  const discover: Envelope = { kind: "DISCOVER", from, subjectId };
  const result: Envelope = {
    kind: "DISCOVER_RESULT",
    to: from,
    subjectId,
    pointers,
  };
  return [discover, result];
}

// Computes whether requester may receive subject's record held by holder.
// Implements D2-08: securityHold/revoked forces a DENY override before returning.
// Source: spike Network.requestDetail() lines 113-140.
export function computeDetailResponse(
  requester: Principal,
  subject: Subject | undefined,
  holder: UnitId,
): DetailResult {
  if (!subject) {
    return { granted: false, decision: null, record: null };
  }

  const base = evaluate(requester, releaseRequirementFor(subject, holder));
  const blocked = subject.flags.securityHold || subject.flags.revoked;

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

  return {
    granted: decision.decision === "ALLOW",
    decision,
    record: decision.decision === "ALLOW" ? subject : null,
  };
}
