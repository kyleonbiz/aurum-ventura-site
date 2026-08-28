-- Template for adding real clients so the upload flow can recognize them.
-- This file intentionally contains NO real client data — copy the pattern
-- below and run it yourself with your actual clients' names/emails.
-- (Eventually this directory should be replaced by real writes coming out
-- of your Admin OS once it has a backend — see UPLOAD_SETUP.md.)

-- insert into clients (legal_name, primary_email, status) values
--   ('Green Valley Landscaping LLC', 'owner@greenvalleylandscaping.example', 'ACTIVE');

-- insert into client_contacts (client_id, name, email)
--   select id, 'Jane Doe', 'jane@greenvalleylandscaping.example'
--   from clients where primary_email = 'owner@greenvalleylandscaping.example';
