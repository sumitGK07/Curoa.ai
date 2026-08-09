-- =========================================================
-- Curoa.AI — sample seed data
-- Run after schema.sql to populate the hospitals directory
-- with example records for local development and demos.
--
--   mysql -u root -p curoa_db < database/seed.sql
-- =========================================================

INSERT INTO hospitals (name, type, address, phone, latitude, longitude, is_open, hours_note, emergency, rating) VALUES
('Sunrise General Hospital', 'Multi-specialty Hospital', '142 MG Road, Camp, Pune, MH 411001', '+91 20 4567 8901', 18.519500, 73.855300, 1, 'Open 24 hours', 1, 4.4),
('Lakeside Family Clinic', 'General Physician Clinic', '9 Boat Club Road, Pune, MH 411001', '+91 20 2345 6789', 18.530400, 73.856700, 1, 'Open until 9:00 PM', 0, 4.6),
('St. Martin''s Medical Center', 'Hospital & Trauma Center', '77 Airport Road, Pune, MH 411006', '+91 20 6789 0123', 18.567900, 73.914300, 1, 'Open 24 hours', 1, 4.2),
('Green Valley Urgent Care', 'Urgent Care', '21 Baner Road, Pune, MH 411045', '+91 20 3456 7890', 18.559000, 73.786800, 0, 'Opens tomorrow at 8:00 AM', 0, 4.0),
('Riverside Children''s Hospital', 'Pediatric Hospital', '5 FC Road, Shivajinagar, Pune, MH 411005', '+91 20 2233 4455', 18.531400, 73.844600, 1, 'Open 24 hours', 1, 4.7),
('Harborview Skin & Allergy Clinic', 'Dermatology Clinic', '63 Koregaon Park, Pune, MH 411001', '+91 20 4123 9988', 18.536200, 73.893800, 0, 'Opens at 10:00 AM', 0, 4.5);
