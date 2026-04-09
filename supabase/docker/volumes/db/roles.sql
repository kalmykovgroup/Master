-- Set passwords for service roles (injected via /etc/postgresql.schema.sql)
-- POSTGRES_PASSWORD is available as PGPASSWORD env var during init

\set pgpass `echo "$PGPASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
