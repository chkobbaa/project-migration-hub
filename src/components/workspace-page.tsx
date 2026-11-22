import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Plus, Search, ArrowUpRight, CalendarDays, FolderOpen, SlidersHorizontal, X, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { ContentCover, StatusBadge, typeIcons } from './content-cover';
import { ContentForm } from './content-form';
import { Spinner } from './spinner';
import { ListSkeleton } from './skeletons';
import { workspaceQuery, type Content } from '@/lib/queries';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { fr } from '@/lib/fr';
import type { Status } from '@/lib/content-rules';

export function EmptyState({ title = fr.empty, subtitle = fr.emptySubtitle, action }: { title?: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><FolderOpen size={26}/></span><h2>{title}</h2><p>{subtitle}</p>{action}</div>;
}
export const WorkspaceLoading = ListSkeleton;
export function WorkspaceError() {
  const router = useRouter();
  return <div className="empty-state"><p role="alert">{fr.error}</p><Button onClick={() => void router.invalidate()}>{fr.retry}</Button></div>;
}
export const dateLabel = (date: string) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function DecisionDialog({ content, decision, onClose }: { content: Content | null; decision: string; onClose: () => void }) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  async function confirm() {
    if (!content || busy) return;
    if (decision === 'REJECTED' && !reason.trim()) { setError(fr.reasonRequired); return; }
    setBusy(true); setError('');
    try {
      const { error: e } = await supabase.rpc('moderate_content', { _content_id: content.id, _decision: decision, ...(reason.trim() ? { _reason: reason.trim() } : {}) });
      if (e) throw e;
      await client.invalidateQueries({ queryKey: ['workspace'] }); toast.success(fr.decisionSaved); onClose();
    } catch { setError(fr.error); } finally { setBusy(false); }
  }
  return <Dialog open={Boolean(content)} onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{fr.confirm}</DialogTitle><DialogDescription>{content?.title} · {fr.decisions[decision as keyof typeof fr.decisions]}</DialogDescription></DialogHeader><label>{fr.reason}{decision === 'REJECTED' ? ' *' : ''}<textarea value={reason} onChange={e => setReason(e.target.value)} required={decision === 'REJECTED'}/></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><Button variant="outline" disabled={busy} onClick={onClose}>{fr.cancel}</Button><Button disabled={busy} onClick={confirm}>{busy ? <><Spinner/>{fr.loading}</> : fr.confirm}</Button></div></DialogContent></Dialog>;
}

function CardBody({ content, review }: { content: Content; review: boolean }) {
  const Icon = typeIcons[content.content_type];
  return <><Link to="/content/$id" params={{ id: content.id }} className="card-cover"><ContentCover content={content}/><StatusBadge status={content.status}/></Link><div className="card-body"><div className="card-type"><Icon size={13}/>{fr.types[content.content_type]}<span className="type-separator">/</span>{content.categories?.name}</div><h3 className="card-title"><Link to="/content/$id" params={{ id: content.id }}>{content.title}</Link></h3><p className="card-description">{review ? `${fr.author} : ${content.author?.display_name || '—'} — ` : ''}{content.description}</p><div className="card-footer"><span className="date"><CalendarDays size={12}/>{dateLabel(content.created_at)}</span><Link to="/content/$id" params={{ id: content.id }}><span>{review ? 'Examiner' : 'Ouvrir'}</span><ArrowUpRight size={15}/></Link></div></div></>;
}
export function ContentCard({ content, review = false }: { content: Content; review?: boolean }) { return <article className="content-card"><CardBody content={content} review={review}/></article>; }

const statuses = ['ALL', 'PENDING', 'VALIDATED', 'REJECTED', 'REMOVED'] as const;
const statusNames = { ALL: 'Tous', PENDING: 'En attente', VALIDATED: 'Validés', REJECTED: 'Refusés', REMOVED: 'Retirés' };

/** Icon that expands into a search field when tapped. */
function ExpandingSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(Boolean(value));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  return <div className={`expand-search ${open ? 'is-open' : ''}`}>
    <button type="button" className="icon-btn" aria-label={fr.openSearch} aria-expanded={open} onClick={() => setOpen(true)}><Search size={17}/></button>
    <input ref={input} aria-label={fr.search} placeholder={fr.search} value={value} tabIndex={open ? 0 : -1} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { onChange(''); setOpen(false); } }} onBlur={() => { if (!value) setOpen(false); }}/>
    {open && <button type="button" className="icon-btn ghost" aria-label={fr.closeSearch} onMouseDown={e => e.preventDefault()} onClick={() => { onChange(''); setOpen(false); }}><X size={15}/></button>}
  </div>;
}

function FilterMenu({ showStatus, status, setStatus, sort, setSort, defaultSort, counts }: { showStatus: boolean; status: Status | 'ALL'; setStatus: (s: Status | 'ALL') => void; sort: string; setSort: (s: string) => void; defaultSort: string; counts: Record<string, number> }) {
  const active = status !== 'ALL' || sort !== defaultSort;
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild><button type="button" className={`icon-btn ${active ? 'has-dot' : ''}`} aria-label={fr.filter}><SlidersHorizontal size={17}/></button></DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} className="filter-menu">
      {showStatus && <><DropdownMenu.Label className="filter-label">{fr.statusLabel}</DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={status} onValueChange={v => { const s = statuses.find(x => x === v); if (s) setStatus(s); }}>
          {statuses.map(s => <DropdownMenu.RadioItem key={s} value={s} className="filter-item"><span>{statusNames[s]}</span><small>{counts[s] ?? 0}</small><DropdownMenu.ItemIndicator className="filter-check"><Check size={14}/></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>)}
        </DropdownMenu.RadioGroup><DropdownMenu.Separator className="filter-sep"/></>}
      <DropdownMenu.Label className="filter-label">{fr.sortBy}</DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
        <DropdownMenu.RadioItem value="recent" className="filter-item"><span>{fr.recent}</span><DropdownMenu.ItemIndicator className="filter-check"><Check size={14}/></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="oldest" className="filter-item"><span>{fr.oldest}</span><DropdownMenu.ItemIndicator className="filter-check"><Check size={14}/></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>;
}

export function CreateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data } = useSuspenseQuery(workspaceQuery());
  const mobile = useIsMobile();
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side={mobile ? 'bottom' : 'right'} className="create-sheet">
      <SheetHeader><SheetTitle>{fr.create}</SheetTitle><SheetDescription>{fr.newSubtitle}</SheetDescription></SheetHeader>
      <ContentForm categories={data.categories} userId={data.user.id} onSaved={() => onOpenChange(false)} onCancel={() => onOpenChange(false)}/>
    </SheetContent>
  </Sheet>;
}

export function WorkspacePage({ mode = 'creator', createOpen = false, onCreateOpenChange }: { mode?: 'creator' | 'moderation' | 'reports' | 'history'; createOpen?: boolean; onCreateOpenChange?: (open: boolean) => void }) {
  const { data } = useSuspenseQuery(workspaceQuery());
  const [status, setStatus] = useState<Status | 'ALL'>('ALL'); const [search, setSearch] = useState(''); const defaultSort = mode === 'moderation' ? 'oldest' : 'recent'; const [sort, setSort] = useState(defaultSort); const [action, setAction] = useState<{ content: Content; decision: string } | null>(null);
  const own = data.contents.filter(c => c.author_id === data.user.id);
  const base = mode === 'creator' ? own : mode === 'moderation' ? data.contents.filter(c => c.status === 'PENDING') : data.contents.filter(c => data.reports.some(r => r.content_id === c.id));
  const filtered = base.filter(c => (status === 'ALL' || c.status === status) && c.title.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))).sort((a, b) => sort === 'oldest' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
  const decisions = data.decisions.filter(d => d.moderator_id === data.user.id);
  const title = mode === 'creator' ? fr.contents : mode === 'moderation' ? fr.pending : mode === 'reports' ? fr.reports : fr.history;
  const counts: Record<string, number> = Object.fromEntries(statuses.map(s => [s, s === 'ALL' ? base.length : base.filter(c => c.status === s).length]));
  const filtersActive = status !== 'ALL' || search !== '';
  const openCreate = () => onCreateOpenChange?.(true);
  return <>
    <div className="page-heading">
      <div><h1>{title}</h1><p>{mode === 'creator' ? fr.creatorSubtitle : mode === 'moderation' ? fr.reviewSubtitle : mode === 'reports' ? fr.reportSubtitle : fr.historySubtitle}</p></div>
      {mode === 'creator' && <Button className="create-action" onClick={openCreate} aria-label={fr.newContent}><Plus size={18}/><span>{fr.newContent}</span></Button>}
    </div>
    {mode === 'history' ? decisions.length ? <table className="history-table"><thead><tr><th>Contenu</th><th>Décision</th><th>Date</th><th>{fr.reason}</th></tr></thead><tbody>{decisions.map(d => <tr key={d.id}><td><Link to="/content/$id" params={{ id: d.content_id }}>{d.contents?.title}</Link></td><td>{fr.decisions[d.decision as keyof typeof fr.decisions]}</td><td>{dateLabel(d.created_at)}</td><td>{d.reason || '—'}</td></tr>)}</tbody></table> : <EmptyState title={fr.noHistory} subtitle={fr.historySubtitle}/> : <>
      <div className="list-toolbar">
        <div className="list-title"><span className="count-bubble">{filtered.length}{filtered.length !== base.length ? ` / ${base.length}` : ''}</span>{status !== 'ALL' && <button type="button" className="filter-chip" onClick={() => setStatus('ALL')}>{statusNames[status]}<X size={12}/></button>}</div>
        <div className="toolbar-icons"><ExpandingSearch value={search} onChange={setSearch}/><FilterMenu showStatus={mode === 'creator'} status={status} setStatus={setStatus} sort={sort} setSort={setSort} defaultSort={defaultSort} counts={counts}/></div>
      </div>
      {filtered.length ? <div className="content-grid">{filtered.map(c => mode === 'reports' ? <article className="content-card" key={c.id}><CardBody content={c} review/><div className="report-reasons"><strong>{data.reports.filter(r => r.content_id === c.id).length} {fr.reportCount}</strong>{data.reports.filter(r => r.content_id === c.id).map(r => <p key={r.id}>{r.reason}</p>)}</div><div className="report-actions"><Button variant="destructive" disabled={c.status !== 'VALIDATED'} onClick={() => setAction({ content: c, decision: 'REMOVED' })}>{fr.remove}</Button><Button variant="outline" disabled={c.status !== 'VALIDATED' && c.status !== 'REMOVED'} onClick={() => setAction({ content: c, decision: 'RESTORED' })}>{fr.restore}</Button></div></article> : <ContentCard key={c.id} content={c} review={mode === 'moderation'}/>)}</div>
        : <EmptyState
            title={filtersActive && base.length ? fr.emptyFiltered : mode === 'reports' ? fr.noReports : mode === 'moderation' ? 'Tout est à jour' : fr.homeEmptyTitle}
            subtitle={mode === 'moderation' ? 'Aucun contenu en attente de modération.' : mode === 'reports' ? 'Aucun contenu signalé pour le moment.' : filtersActive && base.length ? 'Essayez un autre mot ou un autre filtre.' : fr.homeEmptySubtitle}
            action={mode === 'creator' && !(filtersActive && base.length) ? <Button onClick={openCreate}><Sparkles size={16}/>{fr.studioCta}</Button> : filtersActive && base.length ? <Button variant="outline" onClick={() => { setStatus('ALL'); setSearch(''); }}>{fr.clearFilters}</Button> : undefined}/>}
    </>}
    {action && <DecisionDialog content={action.content} decision={action.decision} onClose={() => setAction(null)}/>}
    {mode === 'creator' && onCreateOpenChange && <CreateSheet open={createOpen} onOpenChange={onCreateOpenChange}/>}
  </>;
}
