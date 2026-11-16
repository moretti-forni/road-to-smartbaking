BEGIN;
-- Retain legacy Other records until staff can classify them accurately.
ALTER TABLE rtsm_shop DROP CONSTRAINT rtsm_shop_category_check;
ALTER TABLE rtsm_shop ADD CONSTRAINT rtsm_shop_category_check CHECK (category IN ('pizza', 'restaurant', 'qsr', 'bakery', 'hotel', 'other'));
ALTER TABLE rtsm_requests DROP CONSTRAINT rtsm_requests_category_check;
ALTER TABLE rtsm_requests ADD CONSTRAINT rtsm_requests_category_check CHECK (category IN ('pizza', 'restaurant', 'qsr', 'bakery', 'hotel', 'other'));
COMMIT;
