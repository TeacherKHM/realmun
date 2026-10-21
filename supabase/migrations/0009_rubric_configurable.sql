-- 0009_rubric_configurable.sql
alter table public.committees
  add column if not exists rubric_criteria jsonb not null default '[
    {"key": "participacion", "label": "Participación", "hint": "Intervenciones y aportes al debate"},
    {"key": "argumentacion", "label": "Argumentación", "hint": "Solidez de los argumentos y fuentes citadas"},
    {"key": "postura", "label": "Postura diplomática", "hint": "Apego a la política exterior de la delegación"},
    {"key": "colaboracion", "label": "Colaboración y forma", "hint": "Bloques de trabajo, cortesía y protocolo"}
  ]'::jsonb;

comment on column public.committees.rubric_criteria is 'Criterios de evaluación de la rúbrica [{key,label,hint}]';
