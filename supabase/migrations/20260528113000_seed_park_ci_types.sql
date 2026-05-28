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
