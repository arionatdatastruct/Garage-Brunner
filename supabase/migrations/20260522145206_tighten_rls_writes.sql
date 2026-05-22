-- Replace permissive RLS policies (USING/WITH CHECK = true) with predicates that
-- require a real (non-anonymous) authenticated user. Behaviour for the two real
-- staff accounts is unchanged; anonymous sign-ins are blocked from reads & writes.

-- =====  public.kunden  =====
drop policy if exists "Authenticated users can view kunden"   on public.kunden;
drop policy if exists "Authenticated users can insert kunden" on public.kunden;
drop policy if exists "Authenticated users can update kunden" on public.kunden;
drop policy if exists "Authenticated users can delete kunden" on public.kunden;

create policy "Staff can view kunden" on public.kunden
  for select to authenticated
  using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can insert kunden" on public.kunden
  for insert to authenticated
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can update kunden" on public.kunden
  for update to authenticated
  using      (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can delete kunden" on public.kunden
  for delete to authenticated
  using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- =====  public.fahrzeuge  =====
drop policy if exists "Authenticated users can view fahrzeuge"   on public.fahrzeuge;
drop policy if exists "Authenticated users can insert fahrzeuge" on public.fahrzeuge;
drop policy if exists "Authenticated users can update fahrzeuge" on public.fahrzeuge;
drop policy if exists "Authenticated users can delete fahrzeuge" on public.fahrzeuge;

create policy "Staff can view fahrzeuge" on public.fahrzeuge
  for select to authenticated
  using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can insert fahrzeuge" on public.fahrzeuge
  for insert to authenticated
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can update fahrzeuge" on public.fahrzeuge
  for update to authenticated
  using      (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can delete fahrzeuge" on public.fahrzeuge
  for delete to authenticated
  using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- =====  public.arbeitsrapporte  =====
drop policy if exists "Authenticated users can view rapporte"   on public.arbeitsrapporte;
drop policy if exists "Authenticated users can insert rapporte" on public.arbeitsrapporte;
drop policy if exists "Authenticated users can update rapporte" on public.arbeitsrapporte;
drop policy if exists "Authenticated users can delete rapporte" on public.arbeitsrapporte;

create policy "Staff can view rapporte" on public.arbeitsrapporte
  for select to authenticated
  using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can insert rapporte" on public.arbeitsrapporte
  for insert to authenticated
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can update rapporte" on public.arbeitsrapporte
  for update to authenticated
  using      (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can delete rapporte" on public.arbeitsrapporte
  for delete to authenticated
  using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- =====  public.rapport_positionen  =====
drop policy if exists "Authenticated users can view positionen"   on public.rapport_positionen;
drop policy if exists "Authenticated users can insert positionen" on public.rapport_positionen;
drop policy if exists "Authenticated users can update positionen" on public.rapport_positionen;
drop policy if exists "Authenticated users can delete positionen" on public.rapport_positionen;

create policy "Staff can view positionen" on public.rapport_positionen
  for select to authenticated
  using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can insert positionen" on public.rapport_positionen
  for insert to authenticated
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can update positionen" on public.rapport_positionen
  for update to authenticated
  using      (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff can delete positionen" on public.rapport_positionen
  for delete to authenticated
  using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- =====  storage.objects  (buckets: belege, fotos)  =====
drop policy if exists "Authenticated read belege"   on storage.objects;
drop policy if exists "Authenticated insert belege" on storage.objects;
drop policy if exists "Authenticated update belege" on storage.objects;
drop policy if exists "Authenticated delete belege" on storage.objects;
drop policy if exists "Authenticated read fotos"    on storage.objects;
drop policy if exists "Authenticated insert fotos"  on storage.objects;
drop policy if exists "Authenticated update fotos"  on storage.objects;
drop policy if exists "Authenticated delete fotos"  on storage.objects;

create policy "Staff read belege" on storage.objects
  for select to authenticated
  using (bucket_id = 'belege' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff insert belege" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'belege' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff update belege" on storage.objects
  for update to authenticated
  using      (bucket_id = 'belege' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (bucket_id = 'belege' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff delete belege" on storage.objects
  for delete to authenticated
  using (bucket_id = 'belege' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff read fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff insert fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff update fotos" on storage.objects
  for update to authenticated
  using      (bucket_id = 'fotos' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (bucket_id = 'fotos' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Staff delete fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
