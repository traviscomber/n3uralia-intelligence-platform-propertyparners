-- ============================================================
-- ROLES EXPANSION MIGRATION - EXECUTABLE SCRIPT
-- Adds agent_id to kpi_snapshots, creates agent_activities table
-- Seeds directors, agents, and 6 months of KPI data
-- ============================================================

-- 1. Extend kpi_snapshots with agent_id
ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_agent_id ON kpi_snapshots(agent_id);

-- 2. Create agent_activities table
CREATE TABLE IF NOT EXISTS agent_activities (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('llamada', 'visita', 'oferta', 'cierre')),
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  description   TEXT,
  value_uf      NUMERIC(12, 2),
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'lost')),
  scheduled_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_activities_agent_id  ON agent_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activities_status    ON agent_activities(status);
CREATE INDEX IF NOT EXISTS idx_agent_activities_scheduled ON agent_activities(scheduled_at);

ALTER TABLE agent_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_activities_service_all" ON agent_activities;
CREATE POLICY "agent_activities_service_all"
  ON agent_activities FOR ALL USING (true) WITH CHECK (true);

-- 3. Seed profiles: directors
DELETE FROM profiles WHERE id IN (
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006'
);

INSERT INTO profiles (id, full_name, role, team, avatar_url) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Juan Morales',       'director', 'Equipo Alpha', null),
  ('d0000000-0000-0000-0000-000000000002', 'María García',       'director', 'Equipo Beta',  null),
  ('d0000000-0000-0000-0000-000000000003', 'Carlos López',       'director', 'Equipo Gamma', null),
  ('a0000000-0000-0000-0000-000000000001', 'Sofía Ramos',        'seller',   'Equipo Alpha', null),
  ('a0000000-0000-0000-0000-000000000002', 'Diego Herrera',      'seller',   'Equipo Alpha', null),
  ('a0000000-0000-0000-0000-000000000003', 'Valentina Torres',   'seller',   'Equipo Beta',  null),
  ('a0000000-0000-0000-0000-000000000004', 'Andrés Muñoz',       'seller',   'Equipo Beta',  null),
  ('a0000000-0000-0000-0000-000000000005', 'Camila Pérez',       'seller',   'Equipo Gamma', null),
  ('a0000000-0000-0000-0000-000000000006', 'Matías Silva',       'seller',   'Equipo Gamma', null);

-- 4. KPI snapshots — directors (6 months)
DELETE FROM kpi_snapshots WHERE director_id IN (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003'
) AND agent_id IS NULL;

INSERT INTO kpi_snapshots (period_date, period_type, ventas_count, ventas_uf, captaciones_count, visitas_count, leads_count, conversion_rate, comision_total, stock_count, velocidad_venta, monthly_target, director_id, agent_id)
VALUES
  -- Juan Morales (Alpha)
  (date_trunc('month', now() - interval '5 months'), 'monthly', 4, 18200, 8,  32, 45,  8.9,  546000, 24, 38, 5, 'd0000000-0000-0000-0000-000000000001', null),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 5, 22400, 10, 40, 52,  9.6,  672000, 22, 35, 5, 'd0000000-0000-0000-0000-000000000001', null),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 6, 27600, 11, 45, 58, 10.3,  828000, 20, 32, 6, 'd0000000-0000-0000-0000-000000000001', null),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 5, 23100, 9,  38, 50, 10.0,  693000, 21, 34, 6, 'd0000000-0000-0000-0000-000000000001', null),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 7, 32200, 13, 52, 67, 10.4,  966000, 19, 29, 7, 'd0000000-0000-0000-0000-000000000001', null),
  (date_trunc('month', now()),                        'monthly', 3, 13800, 6,  24, 31,  9.7,  414000, 18, 30, 7, 'd0000000-0000-0000-0000-000000000001', null),
  -- María García (Beta)
  (date_trunc('month', now() - interval '5 months'), 'monthly', 3, 13500, 7,  28, 40,  7.5,  405000, 26, 42, 5, 'd0000000-0000-0000-0000-000000000002', null),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 4, 18200, 9,  35, 48,  8.3,  546000, 24, 38, 5, 'd0000000-0000-0000-0000-000000000002', null),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 4, 18400, 8,  33, 45,  8.9,  552000, 23, 37, 6, 'd0000000-0000-0000-0000-000000000002', null),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 6, 27000, 12, 48, 61,  9.8,  810000, 21, 33, 6, 'd0000000-0000-0000-0000-000000000002', null),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 5, 22500, 10, 42, 54,  9.3,  675000, 20, 35, 7, 'd0000000-0000-0000-0000-000000000002', null),
  (date_trunc('month', now()),                        'monthly', 4, 18000, 7,  29, 38, 10.5,  540000, 19, 31, 7, 'd0000000-0000-0000-0000-000000000002', null),
  -- Carlos López (Gamma)
  (date_trunc('month', now() - interval '5 months'), 'monthly', 2,  9200, 5,  22, 34,  5.9,  276000, 28, 48, 4, 'd0000000-0000-0000-0000-000000000003', null),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 3, 13700, 7,  28, 42,  7.1,  411000, 26, 44, 4, 'd0000000-0000-0000-0000-000000000003', null),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 3, 13900, 6,  25, 38,  7.9,  417000, 25, 42, 5, 'd0000000-0000-0000-0000-000000000003', null),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 4, 18600, 8,  32, 44,  9.1,  558000, 23, 38, 5, 'd0000000-0000-0000-0000-000000000003', null),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 4, 18100, 9,  36, 47,  8.5,  543000, 22, 40, 5, 'd0000000-0000-0000-0000-000000000003', null),
  (date_trunc('month', now()),                        'monthly', 2,  9400, 4,  18, 24,  8.3,  282000, 21, 41, 5, 'd0000000-0000-0000-0000-000000000003', null);

-- 5. KPI snapshots — agents (6 months)
DELETE FROM kpi_snapshots WHERE agent_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006'
);

INSERT INTO kpi_snapshots (period_date, period_type, ventas_count, ventas_uf, captaciones_count, visitas_count, leads_count, conversion_rate, comision_total, stock_count, velocidad_venta, monthly_target, director_id, agent_id)
VALUES
  -- Sofía Ramos
  (date_trunc('month', now() - interval '5 months'), 'monthly', 2,  9100, 4, 16, 22,  9.1, 273000, 12, 38, 3, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 3, 13500, 5, 20, 27, 11.1, 405000, 11, 34, 3, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 3, 13800, 6, 22, 29, 10.3, 414000, 10, 31, 3, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 2,  9200, 5, 19, 25,  8.0, 276000, 11, 35, 3, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 4, 18400, 7, 26, 34, 11.8, 552000,  9, 28, 4, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  (date_trunc('month', now()),                        'monthly', 2,  9200, 3, 12, 16, 12.5, 276000,  9, 29, 4, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  -- Diego Herrera
  (date_trunc('month', now() - interval '5 months'), 'monthly', 2,  9100, 4, 16, 23,  8.7, 273000, 12, 40, 2, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 2,  8900, 5, 20, 25,  8.0, 267000, 11, 37, 2, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 3, 13800, 5, 23, 29, 10.3, 414000, 10, 33, 3, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 3, 13900, 4, 19, 25, 12.0, 417000, 10, 33, 3, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 3, 13800, 6, 26, 33,  9.1, 414000, 10, 31, 3, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  (date_trunc('month', now()),                        'monthly', 1,  4600, 3, 12, 15,  6.7, 138000,  9, 31, 3, 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  -- Valentina Torres
  (date_trunc('month', now() - interval '5 months'), 'monthly', 2,  9000, 4, 14, 21,  9.5, 270000, 13, 43, 2, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003'),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 2,  9100, 5, 18, 24,  8.3, 273000, 12, 40, 2, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003'),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 3, 13500, 4, 16, 22, 13.6, 405000, 11, 36, 3, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003'),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 3, 13500, 6, 24, 31,  9.7, 405000, 10, 34, 3, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003'),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 3, 13500, 5, 21, 27, 11.1, 405000, 10, 35, 3, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003'),
  (date_trunc('month', now()),                        'monthly', 2,  9000, 3, 14, 19, 10.5, 270000,  9, 32, 3, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003'),
  -- Andrés Muñoz
  (date_trunc('month', now() - interval '5 months'), 'monthly', 1,  4500, 3, 14, 19,  5.3, 135000, 13, 45, 2, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004'),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 2,  9100, 4, 17, 24,  8.3, 273000, 12, 42, 2, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004'),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 1,  4900, 4, 17, 23,  4.3, 147000, 12, 41, 2, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004'),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 3, 13500, 6, 24, 30, 10.0, 405000, 11, 37, 2, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004'),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 2,  9000, 5, 21, 27,  7.4, 270000, 10, 40, 3, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004'),
  (date_trunc('month', now()),                        'monthly', 2,  9000, 4, 15, 19, 10.5, 270000,  9, 34, 3, 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004'),
  -- Camila Pérez
  (date_trunc('month', now() - interval '5 months'), 'monthly', 1,  4600, 3, 11, 17,  5.9, 138000, 14, 49, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005'),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 2,  9200, 4, 15, 22,  9.1, 276000, 13, 45, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005'),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 2,  9200, 3, 12, 19, 10.5, 276000, 12, 43, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005'),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 2,  9300, 4, 16, 22,  9.1, 279000, 11, 41, 3, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005'),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 3, 13700, 5, 20, 26, 11.5, 411000, 10, 38, 3, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005'),
  (date_trunc('month', now()),                        'monthly', 1,  4700, 2,  9, 12,  8.3, 141000, 10, 40, 3, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005'),
  -- Matías Silva
  (date_trunc('month', now() - interval '5 months'), 'monthly', 1,  4600, 2, 11, 17,  5.9, 138000, 14, 51, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006'),
  (date_trunc('month', now() - interval '4 months'), 'monthly', 1,  4500, 3, 13, 20,  5.0, 135000, 13, 48, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006'),
  (date_trunc('month', now() - interval '3 months'), 'monthly', 1,  4700, 3, 13, 19,  5.3, 141000, 13, 44, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006'),
  (date_trunc('month', now() - interval '2 months'), 'monthly', 2,  9300, 4, 16, 22,  9.1, 279000, 12, 40, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006'),
  (date_trunc('month', now() - interval '1 months'), 'monthly', 1,  4400, 4, 16, 21,  4.8, 132000, 12, 43, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006'),
  (date_trunc('month', now()),                        'monthly', 1,  4700, 2,  9, 12,  8.3, 141000, 11, 42, 2, 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006');

-- 6. Agent activities seed
DELETE FROM agent_activities WHERE agent_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006'
);

INSERT INTO agent_activities (agent_id, activity_type, description, value_uf, status, scheduled_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'llamada', 'Seguimiento cliente Av. Vitacura 3200', 14500, 'pending', now()::date + time '09:00'),
  ('a0000000-0000-0000-0000-000000000001', 'visita',  'Visita depto 2D La Dehesa',             18200, 'pending', now()::date + time '11:30'),
  ('a0000000-0000-0000-0000-000000000001', 'oferta',  'Enviar oferta Alonso de Córdova 4500',  23600, 'pending', now()::date + time '15:00'),
  ('a0000000-0000-0000-0000-000000000001', 'llamada', 'Call de confirmación pre-cierre',       19800, 'done',    (now() - interval '1 day')::date + time '10:00'),
  ('a0000000-0000-0000-0000-000000000001', 'cierre',  'Cierre escritura El Bosque',            21400, 'done',    (now() - interval '3 days')::date + time '14:00'),
  ('a0000000-0000-0000-0000-000000000002', 'visita',  'Visita duplex Av. Kennedy 7800',        16500, 'pending', now()::date + time '10:00'),
  ('a0000000-0000-0000-0000-000000000002', 'llamada', 'Call introducción nuevo lead',          null,  'pending', now()::date + time '12:00'),
  ('a0000000-0000-0000-0000-000000000002', 'oferta',  'Oferta departamento Vitacura Sur',      19200, 'lost',    (now() - interval '2 days')::date + time '15:00'),
  ('a0000000-0000-0000-0000-000000000002', 'visita',  'Segunda visita cliente Molina',         16500, 'done',    (now() - interval '1 day')::date + time '11:00'),
  ('a0000000-0000-0000-0000-000000000003', 'llamada', 'Call calificación lead digital',        null,  'pending', now()::date + time '09:30'),
  ('a0000000-0000-0000-0000-000000000003', 'visita',  'Visita casa Camino El Alba',            22000, 'pending', now()::date + time '11:00'),
  ('a0000000-0000-0000-0000-000000000003', 'cierre',  'Firma promesa Av. Bicentenario',        20800, 'pending', now()::date + time '16:30'),
  ('a0000000-0000-0000-0000-000000000003', 'oferta',  'Contraoferta cliente García',           21500, 'done',    (now() - interval '1 day')::date + time '14:00'),
  ('a0000000-0000-0000-0000-000000000004', 'llamada', 'Retomar contacto lead frío',            null,  'pending', now()::date + time '10:30'),
  ('a0000000-0000-0000-0000-000000000004', 'visita',  'Primera visita Cerro San Luis',         17800, 'pending', now()::date + time '14:00'),
  ('a0000000-0000-0000-0000-000000000004', 'llamada', 'Follow-up oferta enviada',              18900, 'done',    (now() - interval '2 days')::date + time '11:00'),
  ('a0000000-0000-0000-0000-000000000005', 'visita',  'Visita terreno Lo Curro',               32000, 'pending', now()::date + time '09:00'),
  ('a0000000-0000-0000-0000-000000000005', 'llamada', 'Seguimiento carta oferta',              19600, 'pending', now()::date + time '13:00'),
  ('a0000000-0000-0000-0000-000000000005', 'oferta',  'Oferta casa El Tranque',                28500, 'done',    (now() - interval '1 day')::date + time '15:00'),
  ('a0000000-0000-0000-0000-000000000006', 'llamada', 'Contacto inicial lead referido',        null,  'pending', now()::date + time '10:00'),
  ('a0000000-0000-0000-0000-000000000006', 'visita',  'Visita depto Ciudad Empresarial',       15600, 'pending', now()::date + time '12:30'),
  ('a0000000-0000-0000-0000-000000000006', 'llamada', 'Segundo follow-up cliente Rojas',       16800, 'done',    (now() - interval '2 days')::date + time '09:00');

-- 7. Verification queries
SELECT '[v0] Migration complete - Results:' as status;

SELECT COUNT(*) as profiles_count, COUNT(DISTINCT role) as unique_roles 
FROM profiles WHERE id IN (
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006'
);

SELECT COUNT(*) as agent_activities_count, 
       COUNT(DISTINCT agent_id) as unique_agents,
       COUNT(DISTINCT activity_type) as activity_types
FROM agent_activities;

SELECT COUNT(*) as kpi_with_agent_id
FROM kpi_snapshots WHERE agent_id IS NOT NULL;

SELECT 'Migration Verification: agent_activities table' as section;
SELECT * FROM agent_activities LIMIT 5;
