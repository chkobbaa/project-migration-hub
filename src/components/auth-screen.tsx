import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles, Check, MailCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Brand } from './workspace-shell';
import { Spinner } from './spinner';
import { supabase } from '@/integrations/supabase/client';
import { fr } from '@/lib/fr';
import studioAsset from '@/assets/creative-studio.jpg.asset.json';
const studio = studioAsset.url;

type Phase = 'form' | 'leaving' | 'confirm';
// Duration of the staggered "scroll away" exit before the next screen appears.
const EXIT_MS = 1050;
const at = (i: number) => ({ '--i': i }) as CSSProperties;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function AuthScreen() {
  const [signup, setSignup] = useState(false); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [phase, setPhase] = useState<Phase>('form'); const [sentTo, setSentTo] = useState('');
  const navigate = useNavigate();

  function leaveThen(next: () => void) {
    if (reducedMotion()) { next(); return; }
    setPhase('leaving');
    window.setTimeout(next, EXIT_MS);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); const fields = new FormData(e.currentTarget); const email = String(fields.get('email')); const password = String(fields.get('password'));
    if (signup && password.length < 8) { setError(fr.weak); return; } if (signup && password !== fields.get('confirm')) { setError(fr.mismatch); return; }
    setBusy(true);
    try {
      const result = signup ? await supabase.auth.signUp({ email, password, options: { data: { display_name: String(fields.get('name')) }, emailRedirectTo: window.location.origin } }) : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) { const msg = result.error.message.toLowerCase(); throw new Error(msg.includes('already') ? fr.used : msg.includes('invalid') ? fr.invalid : msg.includes('weak') ? fr.weak : fr.authError); }
      if (!result.data.session) {
        if (!signup) throw new Error(fr.authError);
        setSentTo(email); leaveThen(() => setPhase('confirm')); return;
      }
      const { data: user } = await supabase.auth.getUser(); if (!user.user) throw new Error(fr.authError);
      const roles = await supabase.from('user_roles').select('role').eq('user_id', user.user.id); if (roles.error) throw new Error(fr.authError);
      const to = roles.data.some(x => x.role === 'moderator') ? '/moderation' as const : '/creator' as const;
      leaveThen(() => void navigate({ to }));
    } catch (err) { setError(err instanceof Error ? err.message : fr.authError); } finally { setBusy(false); }
  }

  const toggleMode = () => { setSignup(!signup); setError(''); };
  let i = 0;
  return <div className={`auth-page ${phase === 'leaving' ? 'is-leaving' : ''}`}>
    <header className="auth-header"><Brand/><span className="auth-tag"><LockKeyhole size={14}/>{fr.authFoot}</span></header>
    <main className="auth-main">
      {phase === 'confirm' ? <div className="auth-form-area auth-confirm" key="confirm">
        <span className="confirm-icon stagger-item" style={at(0)}><MailCheck size={28}/></span>
        <h1 className="stagger-item" style={at(1)}>{fr.confirmTitle}<span className="brand-dot">.</span></h1>
        <p className="auth-subtitle stagger-item" style={at(2)}>{fr.confirmSent} <strong>{sentTo}</strong>. {fr.confirmNext}</p>
        <Button size="lg" className="stagger-item" style={at(3)} onClick={() => { setSignup(false); setPhase('form'); }}>{fr.backToLogin}<ArrowRight size={18}/></Button>
      </div> : <div className="auth-form-area" key={signup ? 'signup' : 'login'}>
        <div className="auth-eyebrow stagger-item" style={at(i++)}><span className="online-dot"/>{fr.welcome}</div>
        <h1 className="stagger-item" style={at(i++)}>{signup ? fr.signupTitle : fr.loginTitle}<span className="brand-dot">.</span></h1>
        <p className="auth-subtitle stagger-item" style={at(i++)}>{fr.authSubtitle}</p>
        <form onSubmit={submit} className="auth-form">
          {signup && <label className="stagger-item" style={at(i++)}>{fr.name}<input name="name" required autoComplete="name" placeholder="Alex Morgan"/></label>}
          <label className="stagger-item" style={at(i++)}>{fr.email}<input name="email" type="email" autoComplete="email" required placeholder="vous@exemple.fr"/></label>
          <label className="stagger-item" style={at(i++)}>{fr.password}<div className="password-input"><input name="password" type={show ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} required placeholder="••••••••"/><Button type="button" variant="ghost" size="icon" aria-label={show ? fr.hidePassword : fr.showPassword} onClick={() => setShow(!show)}>{show ? <EyeOff/> : <Eye/>}</Button></div></label>
          {signup && <label className="stagger-item" style={at(i++)}>{fr.confirmPassword}<input name="confirm" type={show ? 'text' : 'password'} required autoComplete="new-password" placeholder="••••••••"/></label>}
          {error && <p role="alert" className="form-error">{error}</p>}
          {!signup && <Link to="/forgot-password" className="auth-forgot stagger-item" style={at(i++)}>{fr.forgot}</Link>}
          <Button size="lg" disabled={busy || phase !== 'form'} type="submit" className="stagger-item" style={at(i++)}>{busy ? fr.loading : signup ? fr.signup : fr.login}{busy ? <Spinner size={18}/> : <ArrowRight size={18}/>}</Button>
        </form>
        <p className="auth-switch stagger-item" style={at(i++)}>{signup ? fr.hasAccount : fr.noAccount} <Button variant="link" onClick={toggleMode}>{signup ? fr.login : fr.signup}</Button></p>
        <div className="auth-trust stagger-item" style={at(i++)}><Check size={15}/>{fr.authFoot}</div>
      </div>}
      <div className="auth-visual stagger-item" style={at(3)}><img src={studio} alt="Carnet créatif et thé dans un atelier lumineux"/><div className="auth-visual-copy"><span><Sparkles size={19}/>{fr.brand}</span><h2>Les petites idées font<br/>les grandes découvertes.</h2><p>{fr.studioSubtitle}</p></div><div className="visual-caption">CRÉER · PARTAGER · INSPIRER</div></div>
    </main>
    <footer className="auth-footer">© 2026 CreativeScroll<span>{fr.authFoot}</span></footer>
  </div>;
}
