import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthFrame } from '@/components/auth-frame';
import { Spinner } from '@/components/spinner';
import { supabase } from '@/integrations/supabase/client';
import { fr } from '@/lib/fr';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title: 'Définir votre mot de passe · CreativeScroll' }, { name: 'description', content: 'Choisissez un nouveau mot de passe pour accéder à votre espace CreativeScroll.' }, { property: 'og:title', content: 'Définir votre mot de passe · CreativeScroll' }, { property: 'og:description', content: 'Un nouveau mot de passe, et vous retrouvez vos contenus.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) setReady('ok');
    });
    // The recovery link signs the user in from the URL; give it a moment before declaring the link invalid.
    const timer = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => { if (active) setReady(data.session ? 'ok' : 'invalid'); });
    }, 1500);
    return () => { active = false; window.clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const fields = new FormData(e.currentTarget);
    const password = String(fields.get('password') ?? '');
    if (password.length < 8) { setError(fr.weak); return; }
    if (password !== fields.get('confirm')) { setError(fr.mismatch); return; }
    setBusy(true);
    const { data, error: err } = await supabase.auth.updateUser({ password });
    if (err || !data.user) { setBusy(false); setError(err?.message.toLowerCase().includes('weak') ? fr.weak : fr.authError); return; }
    const roles = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
    setBusy(false);
    await navigate({ to: roles.data?.some(r => r.role === 'moderator') ? '/moderation' : '/creator', replace: true });
  }

  return (
    <AuthFrame title={fr.resetTitle} subtitle={fr.resetSubtitle}>
      {ready === 'checking' && <p role="status" className="auth-subtitle">{fr.resetChecking}</p>}
      {ready === 'invalid' && <><p role="alert" className="form-error">{fr.resetInvalid}</p><p className="auth-switch"><Link to="/forgot-password" className="auth-forgot">{fr.sendLink}</Link></p></>}
      {ready === 'ok' && (
        <form onSubmit={submit} className="auth-form">
          <label>{fr.newPassword}<input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="••••••••" /></label>
          <label>{fr.confirmPassword}<input name="confirm" type="password" autoComplete="new-password" required placeholder="••••••••" /></label>
          {error && <p role="alert" className="form-error">{error}</p>}
          <Button size="lg" disabled={busy} type="submit">{busy ? fr.loading : fr.savePassword}{busy ? <Spinner /> : <ArrowRight size={18} />}</Button>
        </form>
      )}
    </AuthFrame>
  );
}
