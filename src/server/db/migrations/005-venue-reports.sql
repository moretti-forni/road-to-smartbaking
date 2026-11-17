BEGIN;
CREATE TABLE rtsm_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES rtsm_shop(id),
  reason text NOT NULL CHECK (reason IN ('incorrect', 'closed', 'inappropriate', 'other')),
  details text NOT NULL CHECK (length(btrim(details)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rtsm_reports_queue_idx ON rtsm_reports(created_at DESC);
COMMIT;
