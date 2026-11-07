-- Moderation history and the audit log are append-only.
-- Application code only ever INSERTs into these tables; this trigger makes the database refuse
-- UPDATE and DELETE as well, so even a bug or a compromised moderator account can't rewrite history.
-- (Rows are intentionally not linked to the user table, so deleting an account never touches them.)
CREATE FUNCTION "forbid_history_changes"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "audit_log_append_only" BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION "forbid_history_changes"();--> statement-breakpoint
CREATE TRIGGER "moderation_action_append_only" BEFORE UPDATE OR DELETE ON "moderation_action" FOR EACH ROW EXECUTE FUNCTION "forbid_history_changes"();
