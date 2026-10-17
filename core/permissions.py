from rest_framework.permissions import BasePermission

# Module names
MODULE_COMPANY = 'company'
MODULE_USER = 'user'
MODULE_GODOWN = 'godown'
MODULE_ACCOUNTS = 'accounts'
MODULE_PURCHASE = 'purchase'
MODULE_SALES = 'sales'
MODULE_REPORT = 'report'

# Role-to-module-action permission matrix for the 4 original backup roles:
# 1: Administrator, 2: Manager, 3: Accountant, 4: Salesman
ROLE_PERMISSIONS = {
    'Administrator': {
        '*': ['view', 'create', 'update', 'delete']
    },
    'Manager': {
        '*': ['view', 'create', 'update', 'delete']
    },
    'Accountant': {
        MODULE_COMPANY: ['view'],
        MODULE_ACCOUNTS: ['view', 'create', 'update', 'delete'],
        MODULE_PURCHASE: ['view'],
        MODULE_SALES: ['view'],
        MODULE_REPORT: ['view'],
    },
    'Salesman': {
        MODULE_COMPANY: ['view'],
        MODULE_SALES: ['view', 'create'],
        MODULE_ACCOUNTS: ['view', 'create'],  # For counter receipts
    },
}


def check_role_permission(role_name: str, module: str, action: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role_name, {})
    if '*' in perms and ('*' in perms['*'] or action in perms['*']):
        return True
    module_perms = perms.get(module, [])
    return action in module_perms or '*' in module_perms


class HasModulePermission(BasePermission):
    """
    Permission class checking request user's role against required module and action.
    View must define `required_module`.
    """
    action_map = {
        'GET': 'view',
        'OPTIONS': 'view',
        'HEAD': 'view',
        'POST': 'create',
        'PUT': 'update',
        'PATCH': 'update',
        'DELETE': 'delete',
    }

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role_name = getattr(request.user.UserRole, 'RoleName', '') if hasattr(request.user, 'UserRole') else ''
        if not role_name:
            return False

        # Administrator and Manager have unrestricted operational access
        if role_name in ('Administrator', 'Manager'):
            return True

        module = getattr(view, 'required_module', None)
        if not module:
            return True

        action = self.action_map.get(request.method, 'view')
        return check_role_permission(role_name, module, action)
