export interface UserModulePermissionsDto {
  filesEnabled: boolean;
  expensesEnabled: boolean;
  investmentsEnabled: boolean;
  systemMonitorEnabled: boolean;
  userManagementEnabled: boolean;
  roleManagementEnabled: boolean;
  systemLogsEnabled: boolean;
  auditLogsEnabled: boolean;
  remoteScriptsEnabled: boolean;
}

export interface UpdateModulePermissionsDto {
  filesEnabled?: boolean;
  expensesEnabled?: boolean;
  investmentsEnabled?: boolean;
  systemMonitorEnabled?: boolean;
  userManagementEnabled?: boolean;
  roleManagementEnabled?: boolean;
  systemLogsEnabled?: boolean;
  auditLogsEnabled?: boolean;
  remoteScriptsEnabled?: boolean;
}
