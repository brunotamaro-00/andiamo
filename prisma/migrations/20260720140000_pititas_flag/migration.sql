-- Give the Pititas pseudo-city an icon (Katia con las amigas). Idempotent: only
-- fills the placeholder empty flag from the initial insert, never overwrites a
-- flag someone set later.
UPDATE "Stop" SET "countryFlag" = '👭' WHERE slug = 'pititas' AND "countryFlag" = '';
