export type IssueSetupTokenResult =
  | { status: 'completed' }
  | { status: 'existing'; expiresAt: Date }
  | { status: 'issued'; token: string; expiresAt: Date };
