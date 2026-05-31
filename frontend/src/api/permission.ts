import sysRoleApi from './sys/role';
import type { RoleMenuItem } from './sys/role';

class PermissionApi {
    homeMenu(): Promise<RoleMenuItem[]> {
        return sysRoleApi.menuList();
    }
}

export default new PermissionApi();
