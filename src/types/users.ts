export interface UserSummaryDto {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  roles: string[];
}

export interface GetUsersResponseDto {
  users: UserSummaryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GetUsersParamsDto {
  userId?: number;
  userName?: string;
  email?: string;
  from?: string;
  to?: string;
  roleId?: number;
  roleName?: string;
  page?: number;
  pageSize?: number;
}

export interface DeleteUserResponseDto {
  userId: number;
  username: string;
}
