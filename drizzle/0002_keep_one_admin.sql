-- The platform must never be left without an admin (lockout). The application checks this first and gives a
-- friendly message; this trigger is the guarantee underneath: it also covers two admins demoting each other
-- at the same instant, a stale session, a manual query, and account deletion (which cascades through "user").
-- The advisory lock serialises concurrent attempts, so the second one sees the first one's committed change.
CREATE FUNCTION "keep_one_admin"() RETURNS trigger AS $$
BEGIN
  IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM 'admin') THEN
    PERFORM pg_advisory_xact_lock(hashtext('grade-delusion:admins'));
    IF NOT EXISTS (SELECT 1 FROM "user" WHERE role = 'admin' AND id <> OLD.id) THEN
      RAISE EXCEPTION 'The platform must keep at least one admin' USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "user_keep_one_admin" BEFORE UPDATE OF role OR DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION "keep_one_admin"();
