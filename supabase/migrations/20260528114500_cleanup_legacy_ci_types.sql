delete from public.ci_types
where name in (
  'Application',
  'DESKTOP',
  'Desktop',
  'LAPTOP',
  'Laptop',
  'Moniteur',
  'Ordinateur portable',
  'Ordinateur fixe',
  'PC fixe',
  'PC portable',
  'Photocopieur',
  'Serveur de fichiers',
  'Base de donnees',
  'Serveur web',
  'Switch',
  'Routeur',
  'Borne Wi-Fi',
  'Firewall',
  'Licence',
  'Clavier',
  'Souris',
  'Webcam',
  'Casque',
  'Scanner',
  'Cartouche',
  'Toner',
  'Batterie',
  'Chargeur',
  'Papier',
  'RJ45',
  'HDMI',
  'USB-C',
  'Alimentation',
  'DisplayPort',
  'Telephone fixe',
  'Smartphone professionnel'
);

insert into public.ci_types (name)
select new_types.name
from (
  values
    ('Ordinateur'),
    ('Serveur'),
    ('Imprimante'),
    ('Ecran'),
    ('Reseau'),
    ('Logiciel'),
    ('Peripherique'),
    ('Consommable'),
    ('Cable'),
    ('Telephone'),
    ('Autre')
) as new_types(name)
where not exists (
  select 1
  from public.ci_types existing_types
  where existing_types.name = new_types.name
);
