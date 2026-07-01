export interface UserSettingsDto {
  language: string;
  timezone: string;
}

export interface UpdateUserSettingsDto {
  language?: string;
  timezone?: string;
}

export interface UpdateProfileDto {
  username?: string;
  email?: string;
}

export interface UpdateProfileResponseDto {
  userId: number;
  username: string;
  email: string;
}

export interface UserAdminSettingsDto {
  storageLimitBytes: number | null;
  maxFileSizeBytes: number | null;
}

export interface UserProfileOverviewDto {
  settings: UserSettingsDto;
  limits: UserAdminSettingsDto;
}
