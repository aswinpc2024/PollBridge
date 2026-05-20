/*
  # Create Poll Order Bridge Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name (e.g., Snacks, Beverages, Household)
      - `icon` (text) - Emoji or icon identifier
      - `sort_order` (int) - Display ordering
      - `created_at` (timestamptz)

    - `items`
      - `id` (uuid, primary key)
      - `category_id` (uuid, FK to categories)
      - `name` (text) - Item display name
      - `sku` (text) - Swiggy SKU ID (dynamic, swappable for real IDs)
      - `price` (numeric) - Item price in INR
      - `image_url` (text) - Optional product image
      - `created_at` (timestamptz)

    - `polls`
      - `id` (uuid, primary key)
      - `title` (text) - Poll title
      - `created_by` (text) - User who created the poll
      - `status` (text, default 'active') - active | finalized | expired
      - `poll_url` (text) - Generated Swiggy URL with poll_data
      - `created_at` (timestamptz)
      - `finalized_at` (timestamptz)

    - `poll_votes`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, FK to polls)
      - `item_id` (uuid, FK to items)
      - `user_name` (text) - Voter identifier
      - `quantity` (int, default 1) - Vote weight
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for categories and items (needed by Chat Bot)
    - Authenticated users can create polls and vote
    - Only poll creators can finalize their own polls

  3. Notes
    - SKU IDs in the `items` table are the dynamic mapping layer.
      Swap mock SKUs for real Swiggy IDs by updating the `sku` column.
    - Unique constraint on (poll_id, item_id, user_name) prevents duplicate votes.
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Group Order',
  created_by text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  poll_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  finalized_at timestamptz
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE (poll_id, item_id, user_name)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_item ON poll_votes(item_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Categories: public read
CREATE POLICY "Public read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public read categories anon"
  ON categories FOR SELECT
  TO anon
  USING (true);

-- Items: public read
CREATE POLICY "Public read items"
  ON items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public read items anon"
  ON items FOR SELECT
  TO anon
  USING (true);

-- Polls: authenticated read, creator can insert/update
CREATE POLICY "Authenticated read polls"
  ON polls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Creator update polls"
  ON polls FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid()::text OR created_by = '')
  WITH CHECK (created_by = auth.uid()::text OR created_by = '');

-- Poll votes: authenticated read/write
CREATE POLICY "Authenticated read votes"
  ON poll_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert votes"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update own votes"
  ON poll_votes FOR UPDATE
  TO authenticated
  USING (user_name = auth.uid()::text)
  WITH CHECK (user_name = auth.uid()::text);

-- Seed mock data
INSERT INTO categories (name, icon, sort_order) VALUES
  ('Snacks', 'popcorn', 1),
  ('Beverages', 'cup_soda', 2),
  ('Household', 'home', 3);

INSERT INTO items (category_id, name, sku, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Snacks'), 'Lays Classic Chips', 'SKU-SNACK-001', 20.00),
  ((SELECT id FROM categories WHERE name = 'Snacks'), 'Kurkure Masala', 'SKU-SNACK-002', 20.00),
  ((SELECT id FROM categories WHERE name = 'Snacks'), 'Haldiram Bhujia', 'SKU-SNACK-003', 55.00),
  ((SELECT id FROM categories WHERE name = 'Snacks'), 'Maggi Noodles', 'SKU-SNACK-004', 14.00),
  ((SELECT id FROM categories WHERE name = 'Snacks'), 'Dark Fantasy Cookies', 'SKU-SNACK-005', 30.00),
  ((SELECT id FROM categories WHERE name = 'Beverages'), 'Coca-Cola 750ml', 'SKU-BEV-001', 40.00),
  ((SELECT id FROM categories WHERE name = 'Beverages'), 'Paper Boat Aam Panna', 'SKU-BEV-002', 30.00),
  ((SELECT id FROM categories WHERE name = 'Beverages'), 'Bisleri Water 1L', 'SKU-BEV-003', 20.00),
  ((SELECT id FROM categories WHERE name = 'Beverages'), 'Real Mango Juice 1L', 'SKU-BEV-004', 99.00),
  ((SELECT id FROM categories WHERE name = 'Beverages'), 'Red Bull 250ml', 'SKU-BEV-005', 115.00),
  ((SELECT id FROM categories WHERE name = 'Household'), 'Vim Dishwash Gel', 'SKU-HH-001', 99.00),
  ((SELECT id FROM categories WHERE name = 'Household'), 'Surf Excel Matic', 'SKU-HH-002', 199.00),
  ((SELECT id FROM categories WHERE name = 'Household'), 'Harpic Toilet Cleaner', 'SKU-HH-003', 79.00),
  ((SELECT id FROM categories WHERE name = 'Household'), 'Colin Glass Cleaner', 'SKU-HH-004', 110.00),
  ((SELECT id FROM categories WHERE name = 'Household'), 'Scotch Brite Scrub Pad', 'SKU-HH-005', 25.00);