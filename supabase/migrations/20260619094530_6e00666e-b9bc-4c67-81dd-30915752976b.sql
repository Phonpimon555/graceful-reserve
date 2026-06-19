
-- TABLES
CREATE TABLE public.tables (
  id TEXT PRIMARY KEY,
  table_number INT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('Riverside','AirConditioned','VIP')),
  capacity INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tables TO anon, authenticated;
GRANT ALL ON public.tables TO service_role;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables_read_all" ON public.tables FOR SELECT USING (true);

-- RESERVATIONS
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id TEXT NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(table_id, reservation_date, time_slot)
);
GRANT SELECT, INSERT, DELETE ON public.reservations TO anon, authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_read_all" ON public.reservations FOR SELECT USING (true);
CREATE POLICY "res_insert_all" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "res_delete_all" ON public.reservations FOR DELETE USING (true);

-- MENU
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_th TEXT NOT NULL,
  description_en TEXT,
  description_th TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  sort_order INT DEFAULT 0
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_read_all" ON public.menu_items FOR SELECT USING (true);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;

-- SEED 50 TABLES across 3 zones
-- Riverside R01-R20 (capacity 4)
INSERT INTO public.tables (id, table_number, zone, capacity)
SELECT 'R' || LPAD(g::text, 2, '0'), g, 'Riverside', 4 FROM generate_series(1,20) g;
-- AirConditioned A01-A20 (capacity 2 or 6 mix)
INSERT INTO public.tables (id, table_number, zone, capacity)
SELECT 'A' || LPAD(g::text, 2, '0'), g, 'AirConditioned', CASE WHEN g % 3 = 0 THEN 6 ELSE 2 END FROM generate_series(1,20) g;
-- VIP V01-V10 (capacity 8)
INSERT INTO public.tables (id, table_number, zone, capacity)
SELECT 'V' || LPAD(g::text, 2, '0'), g, 'VIP', 8 FROM generate_series(1,10) g;

-- SEED MENU
INSERT INTO public.menu_items (category, name_en, name_th, description_en, description_th, price, sort_order) VALUES
('Appetizers','Crispy Tom Yum Spring Rolls','ปอเปี๊ยะต้มยำกรอบ','House-made spring rolls with shrimp and lemongrass aioli','ปอเปี๊ยะกุ้งสดเสิร์ฟพร้อมซอสตะไคร้',280,1),
('Appetizers','Pomelo & Crab Salad','ยำส้มโอปูม้า','Sweet pomelo, blue crab, toasted coconut','ส้มโอหวาน เนื้อปูม้า มะพร้าวคั่ว',340,2),
('Main Courses','Massaman Wagyu','มัสมั่นเนื้อวากิว','Slow-braised wagyu in heirloom massaman curry','เนื้อวากิวตุ๋นในน้ำพริกมัสมั่นสูตรดั้งเดิม',890,1),
('Main Courses','Charcoal Gai Yang','ไก่ย่างถ่าน','Free-range chicken, tamarind glaze, jaew dip','ไก่บ้านย่างถ่าน ซอสมะขาม น้ำจิ้มแจ่ว',520,2),
('Seafood','River Prawn Pad Cha','กุ้งแม่น้ำผัดฉ่า','Giant river prawn, krachai, holy basil','กุ้งแม่น้ำเผา ผัดฉ่ากระชาย โหระพา',780,1),
('Seafood','Steamed Sea Bass with Lime','ปลากะพงนึ่งมะนาว','Whole sea bass, garlic-chili-lime broth','ปลากะพงทั้งตัวนึ่งซีอิ๊ว มะนาว พริก',680,2),
('Desserts','Mango Sticky Rice','ข้าวเหนียวมะม่วง','Nam Dok Mai mango, coconut cream','มะม่วงน้ำดอกไม้ กะทิสด',220,1),
('Desserts','Coconut Crème Brûlée','ครีมบรูเล่กะทิ','Pandan-infused custard, palm sugar crust','คัสตาร์ดใบเตย น้ำตาลมะพร้าวกรอบ',240,2),
('Drinks','Butterfly Pea Lemonade','น้ำอัญชันมะนาว','House-pressed, color-changing','น้ำอัญชันสด เปลี่ยนสีด้วยมะนาว',140,1),
('Drinks','Thai Iced Tea','ชาเย็น','Single-origin Cha Thai, condensed milk foam','ชาไทยพรีเมียม โฟมนมข้น',120,2);
