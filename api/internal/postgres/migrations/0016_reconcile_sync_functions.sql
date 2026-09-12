-- 0015 was edited after an early development installation had applied it.
-- Upgrade that exact known variant and current installations to the same functions.
-- No application data is removed. Unknown migration checksums still fail startup.
CREATE OR REPLACE FUNCTION replication_key(tbl TEXT, data JSONB) RETURNS TEXT AS $$
 SELECT CASE WHEN tbl IN ('principal_roles','permission_grants') THEN jsonb_build_object('sync_id',data->'sync_id')::text
 ELSE (SELECT jsonb_object_agg(a.attname,data->a.attname ORDER BY a.attname)::text
 FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
 WHERE i.indrelid=format('public.%I',tbl)::regclass AND i.indisprimary) END
$$ LANGUAGE SQL STABLE;
CREATE OR REPLACE FUNCTION record_replication_change(tbl TEXT, data JSONB, removed BOOLEAN) RETURNS VOID AS $$
DECLARE key TEXT; node TEXT; vector JSONB;
BEGIN
 IF tbl IN ('principal_roles','permission_grants') THEN data:=data-'id'; END IF;
 key:=replication_key(tbl,data);
 IF key IS NULL THEN RETURN; END IF;
 SELECT node_id INTO node FROM replication_identity WHERE id;
 PERFORM pg_advisory_xact_lock(hashtext(tbl),hashtext(key));
 SELECT clock INTO vector FROM replication_records WHERE table_name=tbl AND record_key=key;
 vector:=COALESCE(vector,'{}'::jsonb);
 vector:=jsonb_set(vector,ARRAY[node],to_jsonb(COALESCE((vector->>node)::bigint,0)+1));
 INSERT INTO replication_records VALUES(tbl,key,vector,data,removed)
 ON CONFLICT(table_name,record_key) DO UPDATE SET clock=EXCLUDED.clock,row_data=EXCLUDED.row_data,deleted=EXCLUDED.deleted;
 INSERT INTO replication_events(event_id,source_id,table_name,record_key,action,row_data,clock)
 VALUES(gen_random_uuid()::text,node,tbl,key,CASE WHEN removed THEN 'DELETE' ELSE 'UPDATE' END,data,vector)
 ON CONFLICT(table_name,record_key) DO UPDATE SET id=EXCLUDED.id,event_id=EXCLUDED.event_id,source_id=EXCLUDED.source_id,action=EXCLUDED.action,row_data=EXCLUDED.row_data,clock=EXCLUDED.clock;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION log_db_operation() RETURNS TRIGGER AS $$
BEGIN
 IF current_setting('kollab.suppress_sync',true)='on' THEN RETURN NULL; END IF;
 IF TG_OP='UPDATE' THEN
   IF to_jsonb(OLD)=to_jsonb(NEW) THEN RETURN NULL; END IF;
   IF replication_key(TG_TABLE_NAME,to_jsonb(OLD))<>replication_key(TG_TABLE_NAME,to_jsonb(NEW)) THEN
     PERFORM record_replication_change(TG_TABLE_NAME,to_jsonb(OLD),true);
   END IF;
 END IF;
 IF TG_OP='DELETE' THEN PERFORM record_replication_change(TG_TABLE_NAME,to_jsonb(OLD),true);
 ELSE PERFORM record_replication_change(TG_TABLE_NAME,to_jsonb(NEW),false); END IF;
 RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Canonicalize the known legacy ledger only after the replacement functions have
-- succeeded in this transaction, so fresh and upgraded backup schemas agree.
UPDATE schema_migrations
 SET checksum='72ff756738e65937330506c950369d09c1c41a7830df63cffa628d5d1233de5e'
 WHERE version='0015'
 AND checksum='743ba887ea3b6a7cbf1ce8f55d8f324e2cd0a1f68b7e3b2e614fa770c0ce3b4d';
