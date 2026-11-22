import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Moon, UserRound, LogOut, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { WorkspaceError } from '@/components/workspace-page';
import { FormSkeleton } from '@/components/skeletons';
import { Spinner } from '@/components/spinner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import { supabase } from '@/integrations/supabase/client';
import { workspaceQuery } from '@/lib/queries';
import { fr } from '@/lib/fr';

export const Route = createFileRoute('/_authenticated/settings')({
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery()),
  head: () => ({ meta: [{ title: 'Réglages · CreativeScroll' }, { name: 'description', content: 'Gérez votre profil et l’apparence de votre espace CreativeScroll.' }, { property: 'og:title', content: 'Réglages · CreativeScroll' }, { property: 'og:description', content: 'Votre profil et votre thème.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: SettingsPage, pendingComponent: FormSkeleton, errorComponent: WorkspaceError,
});

function SettingsPage() {
  const { data } = useSuspenseQuery(workspaceQuery());
  const { dark, setDark } = useTheme();
  const [name, setName] = useState(data.name);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', data.user.id).select('id').single();
    setBusy(false);
    if (error) { toast.error(fr.error); return; }
    await client.invalidateQueries({ queryKey: ['workspace'] });
    toast.success('Profil enregistré.');
  }
  async function logout() {
    await client.cancelQueries(); client.clear();
    await supabase.auth.signOut();
    await navigate({ to: '/auth', replace: true });
  }
  return <>
    <div className="page-heading"><div><h1>Réglages</h1><p>Votre compte, à votre image.</p></div></div>
    <div className="settings-layout">
      <section className="settings-section"><h2><Moon size={19}/>Apparence</h2><div className="settings-row"><label htmlFor="dark-theme">Thème sombre</label><Switch id="dark-theme" checked={dark} onCheckedChange={setDark} aria-label="Thème sombre"/></div></section>
      <section className="settings-section"><h2><UserRound size={19}/>Profil</h2><form onSubmit={save} className="settings-form"><label htmlFor="profile-name">{fr.name}<input id="profile-name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} autoComplete="name"/></label><label>{fr.email}<input value={data.user.email ?? ''} readOnly type="email"/></label><div className="account-role"><ShieldCheck size={16}/>{data.moderator ? fr.moderatorAccount : fr.account}</div><Button className="w-fit" disabled={busy || name.trim() === data.name || !name.trim()} type="submit">{busy ? <Spinner/> : <Save size={16}/>}{busy ? fr.loading : 'Enregistrer'}</Button></form></section>
      <section className="settings-section"><Button variant="outline" onClick={logout}><LogOut size={16}/>{fr.logout}</Button></section>
    </div>
  </>;
}