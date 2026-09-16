export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  membershipId: string;
  roleCode: string;
  permissions: string[];
}

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  membershipId: string;
  roleCode: string;
  permissions: string[];
}
