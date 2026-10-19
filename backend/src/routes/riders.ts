import { Router, Request, Response } from 'express';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { validateBody, RiderPatchSchema } from '../middleware/validate';
import { log } from '../lib/logger';

const router = Router();

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!isSupabaseReady) {
    return res.json({
      id: req.params.id,
      phone: '',
      name: null,
      email: null,
      saved_home: null,
      saved_work: null,
    });
  }

  const { data, error } = await supabase!
    .from('riders')
    .select('id, phone, name, email, saved_home, saved_work, preferred_lang, total_trips, rating')
    .eq('id', req.params.id)
    .single();
  if (error) {
    return res.status(404).json({ error: error.message });
  }
  return res.json(data);
});

// PATCH /api/riders/:id — update rider profile (name, etc.)
router.patch('/:id', requireAuth, validateBody(RiderPatchSchema), async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const patch = req.validatedBody as Record<string, unknown>;
  if (isSupabaseReady) {
    const { data, error } = await supabase!
      .from('riders')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (!error && data) return res.json({ ok: true, rider: data });
    log.warn('Rider patch failed', { error: error?.message });
  }
  // In-memory fallback — just ack success
  res.json({ ok: true });
});

router.get('/:id/trips', requireAuth, async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!isSupabaseReady) return res.json([]);

  const { data, error } = await supabase!
    .from('trips')
    .select('*')
    .eq('rider_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

export { router as riderRoutes };
