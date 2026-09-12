package permissions

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
)

func configureSyncIdentity(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx, `
 ALTER TABLE principal_roles ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT gen_random_uuid();
 ALTER TABLE permission_grants ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT gen_random_uuid();
 CREATE UNIQUE INDEX IF NOT EXISTS principal_roles_sync_id ON principal_roles(sync_id);
 CREATE UNIQUE INDEX IF NOT EXISTS permission_grants_sync_id ON permission_grants(sync_id);
 CREATE OR REPLACE FUNCTION principal_role_sync_identity() RETURNS TRIGGER AS $$ BEGIN
 NEW.sync_id:=md5(jsonb_build_array(NEW.principal_kind,NEW.principal_id,NEW.role_id,NEW.binding_values)::text)::uuid;
 RETURN NEW; END; $$ LANGUAGE plpgsql;
 DROP TRIGGER IF EXISTS principal_role_sync_identity ON principal_roles;
 CREATE TRIGGER principal_role_sync_identity BEFORE INSERT OR UPDATE ON principal_roles FOR EACH ROW EXECUTE FUNCTION principal_role_sync_identity();
 UPDATE principal_roles SET sync_id=md5(jsonb_build_array(principal_kind,principal_id,role_id,binding_values)::text)::uuid
 WHERE sync_id<>md5(jsonb_build_array(principal_kind,principal_id,role_id,binding_values)::text)::uuid;
 `)
	return err
}
