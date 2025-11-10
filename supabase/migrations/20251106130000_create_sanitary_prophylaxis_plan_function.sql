-- Create function to get sanitary prophylaxis plan
CREATE OR REPLACE FUNCTION get_sanitary_prophylaxis_plan(start_date DATE)
RETURNS TABLE (
  day INTEGER,
  date TEXT,
  title TEXT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_date DATE := start_date;
  plan_data RECORD;
BEGIN
  -- Return prophylaxis plan for poultry farming
  -- This is a comprehensive plan based on standard poultry health practices

  RETURN QUERY
  SELECT
    biosecurity_plan.day,
    biosecurity_plan.date,
    biosecurity_plan.title,
    biosecurity_plan.description
  FROM (
    VALUES
      -- Jours 1-7: Arrivée et installation
      (1, (start_date)::TEXT, 'Installation du lot', 'Vérification de l''état de santé des poussins à l''arrivée. Quarantaine des nouveaux arrivants.'),
      (1, (start_date)::TEXT, 'Nettoyage pré-arrivée', 'Désinfection complète des locaux et équipements avant l''arrivée des poussins.'),
      (2, (start_date + INTERVAL '1 day')::TEXT, 'Contrôle des visiteurs', 'Mise en place du registre des visiteurs et restriction d''accès à la zone d''élevage.'),
      (3, (start_date + INTERVAL '2 days')::TEXT, 'Séparation des zones', 'Mise en place de zones propres/sales et pédiluves à l''entrée.'),

      -- Jours 8-14: Contrôles quotidiens
      (7, (start_date + INTERVAL '6 days')::TEXT, 'Contrôle quotidien des accès', 'Vérification systématique des clôtures et portails. Nettoyage des véhicules.'),
      (10, (start_date + INTERVAL '9 days')::TEXT, 'Gestion des déchets', 'Mise en place de la collecte et traitement des déchets selon protocole biosécurité.'),
      (14, (start_date + INTERVAL '13 days')::TEXT, 'Contrôle des rongeurs/insectes', 'Inspection et mise en place de mesures anti-rongeurs et anti-insectes.'),

      -- Jours 15-21: Hygiène et désinfection
      (15, (start_date + INTERVAL '14 days')::TEXT, 'Désinfection des abreuvoirs', 'Nettoyage et désinfection quotidiens des abreuvoirs et mangeoires.'),
      (18, (start_date + INTERVAL '17 days')::TEXT, 'Contrôle de l''eau', 'Vérification de la qualité de l''eau et désinfection des réservoirs.'),
      (21, (start_date + INTERVAL '20 days')::TEXT, 'Nettoyage des locaux', 'Nettoyage quotidien des sols et équipements avec désinfectants appropriés.'),

      -- Jours 22-28: Gestion du personnel
      (22, (start_date + INTERVAL '21 days')::TEXT, 'Formation personnel', 'Formation du personnel aux protocoles de biosécurité et hygiène.'),
      (25, (start_date + INTERVAL '24 days')::TEXT, 'Équipement de protection', 'Distribution et contrôle de l''utilisation des EPI (gants, bottes, blouses).'),
      (28, (start_date + INTERVAL '27 days')::TEXT, 'Contrôle santé personnel', 'Vérification médicale du personnel travaillant avec les animaux.'),

      -- Jours 29-35: Surveillance et alerte
      (30, (start_date + INTERVAL '29 days')::TEXT, 'Surveillance clinique', 'Observation quotidienne des signes cliniques de maladie.'),
      (32, (start_date + INTERVAL '31 days')::TEXT, 'Contrôle des intrants', 'Vérification de l''origine et qualité des aliments, médicaments et litières.'),
      (35, (start_date + INTERVAL '34 days')::TEXT, 'Plan d''urgence', 'Mise à jour du plan d''urgence en cas d''épizootie.'),

      -- Jours 36-42: Préparation commercialisation
      (38, (start_date + INTERVAL '37 days')::TEXT, 'Désinfection finale', 'Désinfection complète avant enlèvement des animaux.'),
      (40, (start_date + INTERVAL '39 days')::TEXT, 'Contrôle vétérinaire', 'Visite vétérinaire finale et certificat de santé.'),
      (42, (start_date + INTERVAL '41 days')::TEXT, 'Commercialisation sécurisée', 'Transport des animaux selon normes biosécurité.')

  ) AS biosecurity_plan(day, date, title, description)
  ORDER BY biosecurity_plan.day;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sanitary_prophylaxis_plan(DATE) TO authenticated;