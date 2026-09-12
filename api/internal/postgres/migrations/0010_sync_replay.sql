-- Transaction-local suppression prevents archive restoration and replay from
-- generating conflicting or recursive outbound operations.
CREATE OR REPLACE FUNCTION log_db_operation() RETURNS TRIGGER AS $$
DECLARE r_data JSONB;
BEGIN
    IF current_setting('kollab.suppress_sync', true) = 'on' THEN RETURN NULL; END IF;
    IF TG_OP = 'DELETE' THEN r_data := to_jsonb(OLD); ELSE r_data := to_jsonb(NEW); END IF;
    INSERT INTO db_operations_log(table_name, action, row_id, row_data)
    VALUES(TG_TABLE_NAME, TG_OP, COALESCE(r_data->>'id', md5(r_data::text)), r_data);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
