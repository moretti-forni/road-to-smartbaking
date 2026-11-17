CREATE TABLE rtsm_staff_challenge (
  id uuid PRIMARY KEY,
  email text NOT NULL CHECK (email ~ '^[^@]+@morettiforni[.]com$'),
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  consumed_at timestamptz
);
CREATE INDEX rtsm_staff_challenge_email_idx ON rtsm_staff_challenge(email, created_at DESC);
CREATE INDEX rtsm_staff_challenge_created_idx ON rtsm_staff_challenge(created_at);
CREATE TABLE rtsm_staff_session (
  token_hash text PRIMARY KEY,
  email text NOT NULL CHECK (email ~ '^[^@]+@morettiforni[.]com$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '8 hours'
);
CREATE INDEX rtsm_staff_session_expiry_idx ON rtsm_staff_session(expires_at);
