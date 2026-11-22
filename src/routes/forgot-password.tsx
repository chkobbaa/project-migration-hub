import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthFrame } from '@/components/auth-frame';
import { Spinner } from '@/components/spinner';
import { supabase } from '@/integrations/supabase/client';
import { fr } from '@/lib/fr';

export const Route = createFileRoute('/forgot-password')({
  head: () => ({ meta: [{ title: 'Nouveau mot de passe · CreativeScroll' }, { name: 'description', content: 'Recevez un lien pour vérifier votre email et choisir un nouveau mot de passe CreativeScroll.' }, { property: 'og:title', content: 'Nouveau mot de passe · CreativeScroll' }, { property: 'og:description', content: 'Vérifiez votre adresse et retrouvez votre espace créatif.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    if (!email) return;
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (err) { setError(fr.authError); return; }
    setSent(true);
  }
  return (
    <AuthFrame title={fr.forgotTitle} subtitle={fr.forgotSubtitle}>
      <form onSubmit={submit} className="auth-form">
        <label>{fr.email}<input name="email" type="email" autoComplete="email" required placeholder="vous@exemple.fr" /></label>
        {error && <p role="alert" className="form-error">{error}</p>}
        {sent && <p role="status" className="form-success">{fr.linkSent}</p>}
        <Button size="lg" disabled={busy} type="submit">{busy ? fr.loading : fr.sendLink}{busy ? <Spinner /> : <ArrowRight size={18} />}</Button>
      </form>
      <p className="auth-switch"><Link to="/auth" className="auth-forgot">{fr.backToLogin}</Link></p>
    </AuthFrame>
  );
}
