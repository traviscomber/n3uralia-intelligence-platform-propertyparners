export type ApprovalRequest = {
  action: string
  requester: string
  approverRole: 'ceo' | 'board_director'
  status: 'pending' | 'approved' | 'rejected'
}

export function createApprovalRequest(input: {
  action: string
  requester: string
  strategicImpact: boolean
}): ApprovalRequest {
  return {
    action: input.action,
    requester: input.requester,
    approverRole: input.strategicImpact ? 'board_director' : 'ceo',
    status: 'pending',
  }
}

export function resolveApproval(
  request: ApprovalRequest,
  decision: 'approved' | 'rejected'
) {
  return {
    ...request,
    status: decision,
    resolvedAt: new Date().toISOString(),
  }
}
