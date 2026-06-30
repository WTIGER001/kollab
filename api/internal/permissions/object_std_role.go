package permissions

import (
	"context"
	"fmt"

	goperm "github.com/wtiger001/go-permissions"
)

// ObjectStandardPermissionsAndRoles represents standard object-level permissions and roles.
type ObjectStandardPermissionsAndRoles struct {
	Prefix    string
	Namespace string
	ObjectVar string

	// Permissions
	Read    *goperm.ObjectPermission
	Comment *goperm.ObjectPermission
	Write   *goperm.ObjectPermission
	Delete  *goperm.ObjectPermission
	Grant   *goperm.ObjectPermission
	Owner   *goperm.ObjectPermission

	// Roles
	ViewerRole    goperm.Role
	CommenterRole goperm.Role
	EditorRole    goperm.Role
	ManagerRole   goperm.Role
	OwnerRole     goperm.Role
}

// GlobalServiceChecker delegates permission checks to the active global Service.
type GlobalServiceChecker struct{}

func (c GlobalServiceChecker) HasPermission(ctx context.Context, req goperm.Request) (bool, error) {
	if Service == nil {
		return false, fmt.Errorf("permissions Service not initialized")
	}
	return Service.HasPermission(ctx, req)
}

// NewObjectStandardPermissionsAndRoles registers standard object permissions and returns
// pre-configured role definitions that target the template variable "?id".
func NewObjectStandardPermissionsAndRoles(feature string, resourceName string, hasComment bool) *ObjectStandardPermissionsAndRoles {
	prefix := fmt.Sprintf("%s.%s", feature, resourceName)

	// Create and register standard object permissions
	read := goperm.NewObjectPermission(prefix+".read", feature, "Read "+resourceName, "Allows viewing "+resourceName).WithChecker(GlobalServiceChecker{})
	var comment *goperm.ObjectPermission
	if hasComment {
		comment = goperm.NewObjectPermission(prefix+".comment", feature, "Comment "+resourceName, "Allows making comments on "+resourceName).WithChecker(GlobalServiceChecker{})
	}
	write := goperm.NewObjectPermission(prefix+".write", feature, "Write "+resourceName, "Allows editing/updating "+resourceName).WithChecker(GlobalServiceChecker{})
	deletePerm := goperm.NewObjectPermission(prefix+".delete", feature, "Delete "+resourceName, "Allows deleting "+resourceName).WithChecker(GlobalServiceChecker{})
	grant := goperm.NewObjectPermission(prefix+".grant", feature, "Grant "+resourceName, "Allows sharing "+resourceName).WithChecker(GlobalServiceChecker{})
	owner := goperm.NewObjectPermission(prefix+".owner", feature, "Owner "+resourceName, "Allows full control over "+resourceName).WithChecker(GlobalServiceChecker{})

	if !Registry.Exists(read.ID()) {
		Registry.MustRegister(read.Definition())
	}
	if hasComment && !Registry.Exists(comment.ID()) {
		Registry.MustRegister(comment.Definition())
	}
	if !Registry.Exists(write.ID()) {
		Registry.MustRegister(write.Definition())
	}
	if !Registry.Exists(deletePerm.ID()) {
		Registry.MustRegister(deletePerm.Definition())
	}
	if !Registry.Exists(grant.ID()) {
		Registry.MustRegister(grant.Definition())
	}
	if !Registry.Exists(owner.ID()) {
		Registry.MustRegister(owner.Definition())
	}

	variableSpec := map[string]any{"id": "required"}

	viewerRole := goperm.Role{
		ID:           fmt.Sprintf("builtin.%s.viewer", prefix),
		Name:         resourceName + " Viewer",
		Description:  "Can view " + resourceName,
		VariableSpec: variableSpec,
		Permissions:  []string{read.ID()},
		BuiltIn:      true,
	}

	var commenterRole goperm.Role
	if hasComment {
		commenterRole = goperm.Role{
			ID:           fmt.Sprintf("builtin.%s.commenter", prefix),
			Name:         resourceName + " Commenter",
			Description:  "Can view and comment on " + resourceName,
			VariableSpec: variableSpec,
			Permissions:  []string{read.ID(), comment.ID()},
			BuiltIn:      true,
		}
	}

	editorPermissions := []string{read.ID(), write.ID()}
	if hasComment {
		editorPermissions = []string{read.ID(), comment.ID(), write.ID()}
	}

	editorRole := goperm.Role{
		ID:           fmt.Sprintf("builtin.%s.editor", prefix),
		Name:         resourceName + " Editor",
		Description:  "Can view and edit " + resourceName,
		VariableSpec: variableSpec,
		Permissions:  editorPermissions,
		BuiltIn:      true,
	}

	managerPermissions := []string{read.ID(), write.ID(), deletePerm.ID(), grant.ID()}
	if hasComment {
		managerPermissions = []string{read.ID(), comment.ID(), write.ID(), deletePerm.ID(), grant.ID()}
	}

	managerRole := goperm.Role{
		ID:           fmt.Sprintf("builtin.%s.manager", prefix),
		Name:         resourceName + " Manager",
		Description:  "Can view, edit, delete, and share " + resourceName,
		VariableSpec: variableSpec,
		Permissions:  managerPermissions,
		BuiltIn:      true,
	}

	ownerPermissions := []string{read.ID(), write.ID(), deletePerm.ID(), grant.ID(), owner.ID()}
	if hasComment {
		ownerPermissions = []string{read.ID(), comment.ID(), write.ID(), deletePerm.ID(), grant.ID(), owner.ID()}
	}

	ownerRole := goperm.Role{
		ID:           fmt.Sprintf("builtin.%s.owner", prefix),
		Name:         resourceName + " Owner",
		Description:  "Full owner of " + resourceName,
		VariableSpec: variableSpec,
		Permissions:  ownerPermissions,
		BuiltIn:      true,
	}

	return &ObjectStandardPermissionsAndRoles{
		Prefix:        prefix,
		Namespace:     feature,
		ObjectVar:     "id",
		Read:          read,
		Comment:       comment,
		Write:         write,
		Delete:        deletePerm,
		Grant:         grant,
		Owner:         owner,
		ViewerRole:    viewerRole,
		CommenterRole: commenterRole,
		EditorRole:    editorRole,
		ManagerRole:   managerRole,
		OwnerRole:     ownerRole,
	}
}

// Bootstrap registers standard roles and links their grants with template scopes in the permission store.
func (s *ObjectStandardPermissionsAndRoles) Bootstrap(ctx context.Context) error {
	roles := []goperm.Role{
		s.ViewerRole,
		s.EditorRole,
		s.ManagerRole,
		s.OwnerRole,
	}
	if s.Comment != nil && s.Comment.ID() != "" {
		roles = append(roles, s.CommenterRole)
	}

	var grants []goperm.Grant
	for _, role := range roles {
		// Define the role without inline permissions to prevent default unscoped grants
		roleDef := role
		roleDef.Permissions = nil

		// Add built-in role to the service in-memory registry
		if err := Service.AddBuiltInRole(ctx, roleDef); err != nil {
			return fmt.Errorf("failed to register built-in role %s: %w", role.ID, err)
		}

		// Create standard grants targeting the "?id" object scope for this role template
		scopeStr := "?id"
		for _, permID := range role.Permissions {
			grants = append(grants, goperm.Grant{
				OwnerKind:      goperm.PrincipalRole,
				OwnerID:        role.ID,
				Effect:         goperm.EffectAllow,
				TeamScope:      "*",
				ObjectScope:    &scopeStr,
				PermissionName: permID,
				VariableSpec:   map[string]any{"id": "required"},
			})
		}
	}

	// Register all template grants in-memory
	if err := Service.SaveBuiltIns(ctx, grants); err != nil {
		return fmt.Errorf("failed to save standard grants: %w", err)
	}

	return nil
}

// GrantRole assigns a standard role to a principal (user, group) for a specific object ID.
func (s *ObjectStandardPermissionsAndRoles) GrantRole(ctx context.Context, roleID string, principalKind goperm.PrincipalKind, principalID string, objectId string) error {
	bindingValues := map[string]any{
		s.ObjectVar: objectId,
	}
	principal := goperm.PrincipalRef{
		Kind: principalKind,
		ID:   principalID,
	}
	return Service.AssignRole(ctx, principal, roleID, bindingValues)
}
