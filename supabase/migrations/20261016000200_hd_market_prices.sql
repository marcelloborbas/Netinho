-- Verified public retail references, requested by the owner on 2026-10-16.
-- Only HD cash prices without an existing commercial value are populated.
-- No freight/credit terms or wholesale availability is inferred. FCO is untouched.
begin;
update public.products set price_cash = 377.67, price_note = 'Referência de mercado em 16/10/2026. Pix; frete não incluído. Referência de varejo de terceiro; para CNPJ pode haver acréscimo tributário conforme UF. Fonte: https://www.magazineluiza.com.br/colar-embreagem-para-mbb-1214-1313-1314-1318-1414-1418-1517-hd-embreagens/p/gbgaa1fh00/au/kecr/?seller_id=lojaodocarro' where manufacturer = 'HD' and code = 'M3324.HD' and price_cash is null;
update public.products set price_cash = 603.26, price_note = 'Referência de mercado em 16/10/2026. Pix; frete não incluído. Referência de varejo de terceiro; para CNPJ pode haver acréscimo tributário conforme UF. Fonte: https://www.magazineluiza.com.br/colar-embreagem-para-vw-constellation-17330-19330-19390-2433-hd-embreagens/p/dkjk6a5c14/au/kecr/?seller_id=lojaodocarro' where manufacturer = 'HD' and code = 'M3398.HD' and price_cash is null;
commit;
