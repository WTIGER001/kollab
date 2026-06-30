package permissions

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	goperm "github.com/wtiger001/go-permissions"
	goperminmemory "github.com/wtiger001/go-permissions/inmemory"
	gopermpostgres "github.com/wtiger001/go-permissions/postgres"
)

var (
	// Service is the global go-permissions authorization service.
	Service *goperm.Service

	// Registry registers all permissions.
	Registry = goperm.NewPermissionRegistry()

	// DocumentPermissions manages standard permissions/roles for wiki pages.
	DocumentPermissions *ObjectStandardPermissionsAndRoles

	// ProjectPermissions manages standard permissions/roles for projects.
	ProjectPermissions *ObjectStandardPermissionsAndRoles

	// TeamPermissions manages standard permissions/roles for teams.
	TeamPermissions *ObjectStandardPermissionsAndRoles
)

// InitPermissions initializes the go-permissions service (Postgres or in-memory fallback).
func InitPermissions(ctx context.Context, db *pgxpool.Pool) error {
	var store goperm.PermissionStore
	var idProvider goperm.IdentityProvider

	if db != nil {
		pgStore := gopermpostgres.NewStore(db)
		if err := pgStore.EnsureSchema(ctx); err != nil {
			return fmt.Errorf("failed to ensure permissions schema: %w", err)
		}
		store = pgStore
		idProvider = NewKollabIdentityProvider(db)
	} else {
		// Fallback for in-memory unit tests
		store = goperminmemory.NewStore()
		idProvider = goperminmemory.NewIdentityProvider()
	}

	Service = goperm.NewService(store, idProvider)
	Service.SetSyntheticRoleIDs("builtin.public", "builtin.authenticated", "builtin.admin")
	Service.SetAdminGroupID("group.admins")

	// Initialize our standard object-scoped permissions and roles
	DocumentPermissions = NewObjectStandardPermissionsAndRoles("wiki", "document", true)
	ProjectPermissions = NewObjectStandardPermissionsAndRoles("wiki", "project", false)
	TeamPermissions = NewObjectStandardPermissionsAndRoles("wiki", "team", false)

	// Bootstrap standard roles and template grants
	if err := DocumentPermissions.Bootstrap(ctx); err != nil {
		return fmt.Errorf("failed to bootstrap document permissions: %w", err)
	}
	if err := ProjectPermissions.Bootstrap(ctx); err != nil {
		return fmt.Errorf("failed to bootstrap project permissions: %w", err)
	}
	if err := TeamPermissions.Bootstrap(ctx); err != nil {
		return fmt.Errorf("failed to bootstrap team permissions: %w", err)
	}

	return nil
}

// SeedDefaultPermissions assigns default owner roles to seeded mock data in the permissions store.
func SeedDefaultPermissions(ctx context.Context) {
	if DocumentPermissions == nil || ProjectPermissions == nil || TeamPermissions == nil || Service == nil {
		return
	}

	seededDocs := []string{
		"doc_welcome_arkloud",
		"doc_welcome_eng",
		"doc_guides_eng",
		"doc_welcome_roadmap",
		"doc_welcome_mkt",
	}
	for _, docID := range seededDocs {
		_ = DocumentPermissions.GrantRole(ctx, "role.wiki.document.owner", goperm.PrincipalUser, "sh4ag0cxowti", docID)
	}

	seededProjs := []string{
		"proj_arkollab_test",
		"proj_wiki",
		"proj_roadmap",
		"proj_campaign",
	}
	for _, projID := range seededProjs {
		_ = ProjectPermissions.GrantRole(ctx, "role.wiki.project.owner", goperm.PrincipalUser, "sh4ag0cxowti", projID)
	}

	seededTeams := []string{
		"team_arkloud",
		"team_eng",
		"team_mkt",
	}
	for _, teamID := range seededTeams {
		_ = TeamPermissions.GrantRole(ctx, "role.wiki.team.owner", goperm.PrincipalUser, "sh4ag0cxowti", teamID)
	}
}
