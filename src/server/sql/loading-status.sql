-- TODO: Replace with exact query from SQL_queries.txt (Loading Status)
-- Placeholders: {{session_code}}, {{wh_id}}
WITH ssn AS (
	SELECT * FROM "session" WHERE code = {{session_code}} AND "whId" = {{wh_id}}
)
-- ... rest of query per SQL_queries.txt 