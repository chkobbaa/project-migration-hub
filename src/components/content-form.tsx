import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Spinner } from './spinner';
import { supabase } from '@/integrations/supabase/client';
import { fr } from '@/lib/fr';
import { validMedia, safeUrl, type Kind } from '@/lib/content-rules';
import type { Content } from '@/lib/queries';

type Category = { id: string; name: string };
const kinds = Object.keys(fr.types) as Kind[];

export function ContentForm({ categories, userId, existing, onSaved, onCancel }: { categories: Category[]; userId: string; existing?: Content; onSaved?: () => void; onCancel?: () => void }) {
  const navigate = useNavigate(); const client = useQueryClient();
  const body = (existing?.body && typeof existing.body === 'object' && !Array.isArray(existing.body) ? existing.body : {}) as Record<string, unknown>;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [category, setCategory] = useState(existing?.category_id ?? '');
  const [kind, setKind] = useState<Kind>(existing?.content_type ?? 'QUIZ');
  const [link, setLink] = useState(typeof body['url'] === 'string' ? body['url'] : '');
  const [text, setText] = useState(typeof body['text'] === 'string' ? body['text'] : '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) { toast.error(fr.required); return; }
    if (link && !safeUrl(link)) { toast.error(fr.invalidUrl); return; }
    if (file && !validMedia(file)) { toast.error(file.size > 20 * 1024 * 1024 ? fr.fileTooLarge : fr.invalidFile); return; }
    setBusy(true);
    try {
      let media_url = existing?.media_url ?? null;
      if (file) {
        const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const up = await supabase.storage.from('content-media').upload(path, file);
        if (up.error) throw up.error;
        media_url = path;
      }
      const payload = { title: title.trim(), description: description.trim(), category_id: category, content_type: kind, body: { ...body, url: link || undefined, text: text || undefined }, media_url };
      const res = existing
        ? await supabase.from('contents').update({ ...payload, status: 'PENDING' }).eq('id', existing.id).select('id').single()
        : await supabase.from('contents').insert({ ...payload, author_id: userId }).select('id').single();
      if (res.error) throw res.error;
      await client.invalidateQueries({ queryKey: ['workspace'] });
      toast.success(existing ? fr.saved : fr.submitted);
      onSaved?.();
      await navigate({ to: '/content/$id', params: { id: res.data.id } });
    } catch { toast.error(fr.error); } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="content-form">
    <div className="grid gap-2"><Label htmlFor="t">{fr.title}</Label><Input id="t" value={title} placeholder={fr.titlePlaceholder} onChange={e => setTitle(e.target.value)} /></div>
    <div className="grid gap-2"><Label htmlFor="d">{fr.description}</Label><Textarea id="d" value={description} placeholder={fr.descriptionPlaceholder} onChange={e => setDescription(e.target.value)} /></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor="c">{fr.category}</Label><select id="c" className="sort-select" value={category} onChange={e => setCategory(e.target.value)}><option value="">{fr.chooseCategory}</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="grid gap-2"><Label htmlFor="k">{fr.type}</Label><select id="k" className="sort-select" value={kind} onChange={e => setKind(e.target.value as Kind)}>{kinds.map(k => <option key={k} value={k}>{fr.types[k]}</option>)}</select></div>
    </div>
    <div className="grid gap-2"><Label htmlFor="l">{fr.link}</Label><Input id="l" value={link} placeholder="https://" onChange={e => setLink(e.target.value)} /></div>
    <div className="grid gap-2"><Label htmlFor="x">{kind === 'SHORT_DOC' ? fr.text : fr.instructions}</Label><Textarea id="x" rows={5} value={text} onChange={e => setText(e.target.value)} /></div>
    <div className="grid gap-2"><Label htmlFor="f">{fr.media}</Label><Input id="f" type="file" accept="image/*,video/*,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} /><small className="text-muted-foreground"><Upload size={12} className="inline" /> {fr.uploadHelp}</small></div>
    <div className="form-submit-row"><Button type="submit" disabled={busy}>{busy ? <><Spinner />{file ? fr.uploading : fr.loading}</> : existing ? fr.edit : fr.submit}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => (onCancel ? onCancel() : void navigate({ to: '/contents' }))}>{fr.cancel}</Button></div>
  </form>;
}
