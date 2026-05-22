-- Delete the anonymous accounts that accumulated while anonymous sign-ins were
-- enabled. None of the public business tables reference auth.users, so this is
-- safe; auth.identities/sessions cascade automatically.
delete from auth.users where is_anonymous = true;
