-- Vincular Marcello Borbas à UF São Paulo no diretório público.
-- Preserva os demais campos, contatos, comissões e demais representantes.
UPDATE public.profiles
SET territory_uf = 'SP'
WHERE lower(trim(email)) = 'marcelloborbas@gmail.com'
  AND (territory_uf IS NULL OR trim(territory_uf) = '');

UPDATE public.commercial_representative_details AS d
SET state = 'SP'
FROM public.commercial_representatives AS c
WHERE d.representative_id = c.id
  AND lower(trim(c.email)) = 'marcelloborbas@gmail.com'
  AND (d.state IS NULL OR trim(d.state) = '');

-- A list_public_representatives() passará a retornar a UF cadastrada
-- após a aplicação desta migração no banco efetivamente usado pelo site.
