import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Flag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceError } from '@/components/workspace-page';
import { DetailSkeleton } from '@/components/skeletons';
import { Spinner } from '@/components/spinner';
import { ContentCover, StatusBadge } from '@/components/content-cover';
import { ContentForm } from '@/components/content-form';
import { workspaceQuery } from '@/lib/queries';
import { canEdit, canDeleteUnreviewed, canReport, safeUrl } from '@/lib/content-rules';
import { DecisionDialog } from '@/components/workspace-page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { fr } from '@/lib/fr';
export const Route = createFileRoute('/_authenticated/content/$id')({
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery()),
  head: () => ({ meta: [{ title: 'Détails du contenu · CreativeScroll' }, { name: 'description', content: 'Consultez, modifiez ou modérez un contenu.' }, { property: 'og:title', content: 'Détails du contenu · CreativeScroll' }, { property: 'og:description', content: 'Chaque contenu mérite un regard attentif.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: DetailPage, pendingComponent: DetailSkeleton, errorComponent: WorkspaceError,
});
function DetailPage() {
  const { id } = Route.useParams(); const { data } = useSuspenseQuery(workspaceQuery()); const client = useQueryClient();
  const navigate = useNavigate();
  const content = data.contents.find(c => c.id === id);
  const [editing, setEditing] = useState(false); const [reason, setReason] = useState(''); const [media, setMedia] = useState<string | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false); const [deleting, setDeleting] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (content?.media_url) supabase.storage.from('content-media').createSignedUrl(content.media_url, 3600).then(r => setMedia(r.data?.signedUrl ?? null)); }, [content?.media_url]);
  const back = data.moderator ? '/moderation' as const : '/contents' as const;
  if (!content) return <div className="empty-state"><h2>{fr.emptyFiltered}</h2><Link to={back} className="text-action">{fr.back}</Link></div>;
  const body = (content.body && typeof content.body === 'object' && !Array.isArray(content.body) ? content.body : {}) as Record<string, unknown>;
  async function report() {
    if (!reason.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('record_content_report', { _content_id: id, _reason: reason.trim() });
    setBusy(false);
    if (error) { toast.error(fr.error); return; }
    await client.invalidateQueries({ queryKey: ['workspace'] });
    setReporting(false); setReason(''); toast.success('Signalement enregistré.');
  }
  async function discard() {
    if (!content || busy) return;
    setBusy(true);
    const { error } = await supabase.from('contents').delete().eq('id', id).select('id').single();
    if (error) { setBusy(false); toast.error(fr.error); return; }
    if (content.media_url) {
      const removed = await supabase.storage.from('content-media').remove([content.media_url]);
      if (removed.error) toast.error('Le contenu est supprimé, mais le fichier n’a pas pu être retiré.');
    }
    await client.invalidateQueries({ queryKey: ['workspace'] });
    await navigate({ to: '/contents' });
  }
  const own = content.author_id === data.user.id;
  return <>
    <Link to={back} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={14} />{fr.back}</Link>
    {editing ? <><div className="page-heading"><div><h1>{fr.edit}</h1></div></div><ContentForm categories={data.categories} userId={data.user.id} existing={content} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} /></> : <article className="grid max-w-3xl gap-5">
      <div className="card-cover relative max-h-80 overflow-hidden rounded-lg"><ContentCover content={content} /><StatusBadge status={content.status} /></div>
      <div className="card-type">{fr.types[content.content_type]} / {content.categories?.name}</div>
      <h1 className="text-3xl font-semibold">{content.title}</h1>
      <p className="text-muted-foreground">{data.moderator && `${fr.author} : ${content.author?.display_name} — `}{content.description}</p>
      {typeof body['text'] === 'string' && <p className="whitespace-pre-wrap">{body['text']}</p>}
      {typeof body['url'] === 'string' && safeUrl(body['url']) && <a className="underline text-success break-words" href={body['url']} target="_blank" rel="noreferrer">{fr.link}</a>}
      {media && /\.(png|jpe?g|webp|gif)$/i.test(content.media_url ?? '') && <img src={media} alt={content.title} className="max-h-80 w-full rounded-lg object-contain"/>}
      {media && /\.(mp4|webm|mov)$/i.test(content.media_url ?? '') && <video src={media} controls className="max-h-80 w-full rounded-lg"/>}
      {media && <a className="underline text-success" href={media} target="_blank" rel="noreferrer">{fr.media}</a>}
      {content.rejection_reason && <p className="rounded-lg border border-destructive p-3 text-destructive"><strong>{fr.rejection} :</strong> {content.rejection_reason}</p>}
      {own && canEdit(content.status) && <Button className="w-fit" onClick={() => setEditing(true)}>{fr.edit}</Button>}
      {own && canDeleteUnreviewed(content.status, content.reviewed_at) && <Button variant="outline" className="w-fit text-destructive" onClick={() => setDeleting(true)}><Trash2 size={16}/>Supprimer</Button>}
      {data.moderator && <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          {content.status === 'PENDING' && <><Button onClick={() => setDecision('ACCEPTED')}>{fr.accept}</Button><Button variant="destructive" onClick={() => setDecision('REJECTED')}>{fr.reject}</Button></>}
          {content.status === 'VALIDATED' && <Button variant="destructive" onClick={() => setDecision('REMOVED')}>{fr.remove}</Button>}
          {content.status === 'REMOVED' && <Button variant="outline" onClick={() => setDecision('RESTORED')}>{fr.restore}</Button>}
          {canReport('moderator', content.status) && <Button variant="outline" onClick={() => setReporting(true)}><Flag size={16}/>Signaler</Button>}
        </div></div>}
    </article>}
    {decision && <DecisionDialog content={content} decision={decision} onClose={() => setDecision(null)}/>}
    <Dialog open={reporting || deleting} onOpenChange={open=>{if(!open&&!busy){setReporting(false);setDeleting(false);}}}><DialogContent><DialogHeader><DialogTitle>{deleting?'Supprimer ce contenu ?':'Signaler ce contenu'}</DialogTitle><DialogDescription>{deleting?'Cette suppression est définitive.':content.title}</DialogDescription></DialogHeader>{reporting && <label>Motif du signalement<Textarea value={reason} onChange={e=>setReason(e.target.value)} required/></label>}<div className="form-actions"><Button variant="outline" disabled={busy} onClick={()=>{setReporting(false);setDeleting(false);}}>{fr.cancel}</Button><Button variant={deleting?'destructive':'default'} disabled={busy || (reporting && !reason.trim())} onClick={()=>void (deleting?discard():report())}>{busy?<><Spinner/>{fr.loading}</>:deleting?'Supprimer':'Signaler'}</Button></div></DialogContent></Dialog>
  </>;
}
