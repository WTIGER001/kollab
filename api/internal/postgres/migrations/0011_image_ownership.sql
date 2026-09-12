ALTER TABLE images ADD COLUMN uploaded_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX images_uploaded_by_idx ON images(uploaded_by);
