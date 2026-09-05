import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity, ArrowRight, BookOpen, Building2, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, CircleAlert,
  ClipboardList, Database, Download, ExternalLink, FilePlus2, FileSearch, Fingerprint, FolderOpen, GitBranch,
  Globe2, Link2, ListChecks, Menu, Network, PanelLeft, Play, Plus, RefreshCw, Search, ShieldCheck,
  SlidersHorizontal, StickyNote, Upload, UserRound, X
} from 'lucide-react';
import {
  getFindEntityPathQueryKey, getGetCaseQueryKey, getGetDashboardSummaryQueryKey, getGetEntityCoverageQueryKey,
  getGetEntityNetworkQueryKey, getGetEntityQueryKey, getGetWatchlistEventsQueryKey, getListCasesQueryKey,
  getListWatchlistsQueryKey, getSearchEntitiesQueryKey, getExportEntityNetworkQueryKey, getExportEntityQueryKey,
  useAddCaseEntity, useAddCaseNote, useAddWatchlistEntity, useBatchScreen, useCheckWatchlist, useCreateCase,
  useCreateWatchlist, useExportBatchScreen, useExportEntity, useExportEntityNetwork, useFindEntityPath,
  useGetCase, useGetDashboardSummary, useGetEntity, useGetEntityCoverage, useGetEntityNetwork, useGetSources,
  useGetWatchlistEvents, useListCases, useListWatchlists, useSearchEntities
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function cn(...items: Array<string | false | undefined>) { return items.filter(Boolean).join(' '); }

const navItems = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/search', label: 'Entity search', icon: FileSearch },
  { href: '/batch', label: 'Batch screening', icon: ListChecks },
  { href: '/watchlists', label: 'Watchlists', icon: ClipboardList },
  { href: '/cases', label: 'Research cases', icon: FolderOpen },
  { href: '/paths', label: 'Connection paths', icon: GitBranch },
  { href: '/sources', label: 'Source registry', icon: Globe2 },
];

function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-[84px] items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" data-testid="link-brand" className="ledger-brand flex items-center gap-3 text-sidebar-accent-foreground">
            <span className="ledger-brand-mark grid h-9 w-9 place-items-center bg-primary text-primary-foreground"><ShieldCheck size={18} strokeWidth={2.5} /></span>
            <span className="font-display text-[24px] leading-none tracking-[-.04em]">Cited Ledger</span>
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation" className="rounded-md p-1 text-sidebar-foreground/60 hover:text-sidebar-accent-foreground lg:hidden"><X size={18} /></button>
        </div>
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="eyebrow text-sidebar-foreground/45">Evidence workspace</div>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-sidebar-foreground/75"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" /> Public sanctions sources <span className="font-data text-[10px] text-sidebar-foreground/40">SOURCE</span></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6" aria-label="Primary navigation">
          <div className="eyebrow mb-3 px-3 text-sidebar-foreground/35">Investigate</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMobileOpen(false)}
              className={cn('group flex items-center gap-3 border-l-2 px-3 py-3 text-[13px] font-semibold transition-colors',
                active ? 'border-primary bg-sidebar-accent text-sidebar-accent-foreground' : 'border-transparent text-sidebar-foreground/65 hover:border-sidebar-foreground/30 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground')}>
              <Icon size={16} strokeWidth={active ? 2.3 : 1.8} /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 bg-primary" />}
            </Link>;
          })}
          <div className="eyebrow mb-3 mt-9 px-3 text-sidebar-foreground/35">Reference</div>
          <div className="mx-3 space-y-3 border-l border-sidebar-border pl-4 text-[11px] leading-relaxed text-sidebar-foreground/50">
            <div><span className="font-data text-primary">01</span><br />Every claim has a source.</div>
            <div><span className="font-data text-primary">02</span><br />Proximity is not proof.</div>
          </div>
        </nav>
        <div className="border-t border-sidebar-border p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-primary">JR</span>
            <div className="min-w-0"><div className="truncate text-xs font-semibold text-sidebar-accent-foreground">J. Research desk</div><div className="font-data text-[9px] uppercase tracking-widest text-sidebar-foreground/40">Editorial access</div></div>
            <PanelLeft size={14} className="ml-auto text-sidebar-foreground/30" />
          </div>
        </div>
      </aside>
      {mobileOpen && <button type="button" aria-label="Close menu overlay" data-testid="button-menu-overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-sidebar/50 lg:hidden" />}
      <div className="lg:pl-[264px]">
        <header className="ledger-topbar sticky top-0 z-20 flex h-[82px] items-center justify-between border-b hairline bg-background/90 px-5 backdrop-blur-md sm:px-8">
          <button type="button" aria-label="Open navigation" data-testid="button-open-navigation" onClick={() => setMobileOpen(true)} className="mr-3 rounded-md p-2 hover:bg-muted lg:hidden"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex"><span className="font-data text-foreground">CITED LEDGER /</span> Sanctions intelligence</div>
          <div className="relative ml-auto flex items-center gap-4">
             <div className="hidden items-center gap-2 border-r hairline pr-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:flex"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Public feeds</div>
            <button type="button" aria-label="Open search" data-testid="button-header-search" onClick={() => setLocation('/search')} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Search size={18} /></button>
            <button type="button" aria-label="Open profile" data-testid="button-header-profile" className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-[10px] font-bold text-muted-foreground">JR</button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-10 sm:py-12">{children}</main>
      </div>
    </div>
  );
}

function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="ledger-page-intro mb-8 flex flex-col justify-between gap-5 border-b hairline pb-8 sm:flex-row sm:items-end">
    <div><div className="eyebrow mb-3 text-accent">{eyebrow}</div><h1 className="font-display text-[clamp(2rem,4vw,3.15rem)] leading-[.98] tracking-[-.045em]">{title}</h1></div>
    {children}
  </div>;
}

function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3" data-testid="status-loading">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-muted/70" />)}</div>;
}

function ErrorBlock({ message = 'The source service could not be reached.', retry }: { message?: string; retry?: () => void }) {
  return <div className="flex items-center gap-4 border border-destructive/30 bg-destructive/5 p-5" data-testid="status-error"><CircleAlert size={19} className="shrink-0 text-destructive" /><div className="flex-1"><div className="text-sm font-bold">Research feed unavailable</div><div className="mt-1 text-xs text-muted-foreground">{message}</div></div>{retry && <button type="button" onClick={retry} data-testid="button-retry" className="flex items-center gap-2 text-xs font-bold text-destructive hover:underline"><RefreshCw size={13} /> Retry</button>}</div>;
}

function SchemaMark({ schemaType, size = 32 }: { schemaType?: string; size?: number }) {
  const person = (schemaType || '').toLowerCase().includes('person');
  return <span style={{ width: size, height: size }} className={cn('grid shrink-0 place-items-center border', person ? 'border-accent/35 bg-accent/10 text-accent' : 'border-primary/25 bg-primary/10 text-primary')}><>{person ? <UserRound size={size * .45} /> : <Building2 size={size * .45} />}</></span>;
}

function DatasetPill({ children }: { children: ReactNode }) { return <span className="inline-flex items-center border border-border bg-muted/60 px-2 py-1 font-data text-[9px] uppercase tracking-wider text-muted-foreground">{children}</span>; }

function EntityRow({ entity, index }: { entity: any; index?: number }) {
  return <Link href={`/entities/${entity.id}`} data-testid={`link-entity-${entity.id}`} className="group flex items-center gap-4 border-b hairline px-4 py-4 transition-colors hover:bg-muted/50 sm:px-5">
    <span className="font-data w-5 text-[10px] text-muted-foreground/60">{String((index ?? 0) + 1).padStart(2, '0')}</span>
    <SchemaMark schemaType={entity.schemaType} size={34} />
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold group-hover:text-accent">{entity.name}</span><span className="mt-1 block font-data text-[10px] text-muted-foreground">{entity.id}</span></span>
    <span className="hidden max-w-[180px] text-right text-[11px] text-muted-foreground md:block">{entity.country || entity.schemaType}</span>
    <span className="hidden w-16 text-right font-data text-[11px] text-muted-foreground sm:block">{typeof entity.score === 'number' ? `${Math.round(entity.score * 100)}%` : '—'}</span>
    <ChevronRight size={16} className="text-muted-foreground/45 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
  </Link>;
}

function Dashboard() {
  const summaryQuery = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const summary: any = summaryQuery.data;
  return <div className="fade-in">
    <PageIntro eyebrow="Overview / morning brief" title="The evidence desk"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">A current view of the documented sanctions graph. Start with a name, then follow the evidence.</div></PageIntro>
    {summaryQuery.isLoading && <LoadingBlock rows={5} />}
    {summaryQuery.isError && <ErrorBlock retry={() => summaryQuery.refetch()} />}
    {summary && <div className="space-y-8">
       <section className="ledger-surface grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 xl:grid-cols-4" data-testid="section-dashboard-stats">
        {[
          { label: 'Indexed entities', value: summary.totalEntities, icon: Database, note: 'Across all connected lists' },
          { label: 'Documented links', value: summary.totalEdges, icon: Network, note: 'Cited graph relationships' },
          { label: 'Active datasets', value: summary.datasets?.length ?? 0, icon: Globe2, note: 'Public source registries' },
           { label: 'Source status', value: summary.sourceStatus === 'ready' ? 'Ready' : 'Available', icon: RefreshCw, note: summary.sourceStatus === 'ready' ? (summary.cacheUpdatedAt ? `Cache updated ${new Date(summary.cacheUpdatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Live source configured') : 'Free OFAC feeds ready to index' },
         ].map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="ledger-stat bg-card p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><span className="eyebrow text-muted-foreground">{stat.label}</span><Icon size={16} className="text-accent" /></div><div className="font-data text-[clamp(1.8rem,3vw,2.5rem)] font-medium tracking-[-.05em]">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div><div className="mt-2 text-[11px] text-muted-foreground">{stat.note}</div></div>; })}
      </section>
      <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
        <section className="ledger-surface border border-border bg-card" data-testid="section-recent-entities">
          <div className="flex items-center justify-between border-b hairline px-5 py-4"><div><div className="eyebrow text-accent">Recently observed</div><h2 className="mt-1 text-sm font-bold">Entities entering the desk</h2></div><Link href="/search" data-testid="link-view-all-entities" className="flex items-center gap-2 text-xs font-bold text-accent hover:underline">Search all <ArrowRight size={14} /></Link></div>
          {(summary.recentEntities || []).length ? summary.recentEntities.map((entity: any, i: number) => <EntityRow key={entity.id} entity={entity} index={i} />) : <div className="p-8 text-center text-sm text-muted-foreground" data-testid="status-empty-recent">No recent entities in this cache.</div>}
        </section>
        <section className="ledger-surface border border-border bg-card" data-testid="section-datasets">
          <div className="border-b hairline px-5 py-4"><div className="eyebrow text-accent">Coverage map</div><h2 className="mt-1 text-sm font-bold">Connected datasets</h2></div>
          <div className="p-5">{(summary.datasets || []).map((dataset: any, i: number) => <div key={dataset.name} className="mb-5 last:mb-0"><div className="mb-2 flex justify-between gap-4 text-xs"><span className="font-semibold">{dataset.name}</span><span className="font-data text-muted-foreground">{dataset.count.toLocaleString()}</span></div><div className="h-1 bg-muted"><div className="h-full bg-accent" style={{ width: `${Math.max(8, Math.min(100, (dataset.count / Math.max(...summary.datasets.map((d: any) => d.count), 1)) * 100))}%` }} /></div></div>)}</div>
        </section>
      </div>
       <div className="ledger-callout grid items-center gap-5 border border-accent/30 bg-accent/5 p-5 sm:grid-cols-[auto_1fr_auto] sm:p-6"><span className="grid h-10 w-10 place-items-center bg-accent text-accent-foreground"><Fingerprint size={20} /></span><div><div className="text-sm font-bold">{summary.sourceStatus === 'ready' ? 'Keep the chain visible' : 'Start with public sanctions feeds'}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{summary.sourceStatus === 'ready' ? 'Cited Ledger only presents relationships attached to a citation. Open a dossier to inspect every source before you write.' : 'Search starts with free OFAC SDN and consolidated feeds. Add OpenSanctions later for broader coverage and relationship expansion. No records are fabricated.'}</p></div><Link href="/search" data-testid="link-start-investigation" className="flex items-center justify-center gap-2 bg-primary px-4 py-3 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">{summary.sourceStatus === 'ready' ? 'Start an investigation' : 'Open entity search'} <ArrowRight size={14} /></Link></div>
    </div>}
  </div>;
}

function SearchPage() {
  const [input, setInput] = useState('');
  const [queryText, setQueryText] = useState('');
  const searchQuery = useSearchEntities({ q: queryText, limit: 25 }, { query: { enabled: queryText.length >= 2, queryKey: getSearchEntitiesQueryKey({ q: queryText, limit: 25 }) } });
  const results: any[] = searchQuery.data || [];
  const exact = results.filter((r) => r.score >= .95);
  const likely = results.filter((r) => r.score < .95);
  const submit = (e: FormEvent) => { e.preventDefault(); if (input.trim().length >= 2) setQueryText(input.trim()); };
  return <div className="fade-in">
    <PageIntro eyebrow="Entity search / sanctions lists" title="Find an entity"><div className="text-right text-xs text-muted-foreground">Exact and likely matches<br /><span className="font-data text-[10px]">MAX 25 RESULTS</span></div></PageIntro>
    <form onSubmit={submit} className="mb-8 flex max-w-3xl border border-primary bg-card focus-within:ring-2 focus-within:ring-accent/30" data-testid="form-entity-search">
      <div className="grid w-12 place-items-center text-accent"><Search size={19} /></div><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search by name, alias, or identifier" aria-label="Search entities" data-testid="input-entity-search" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground/60" /><button type="submit" data-testid="button-submit-search" className="bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground">Search</button>
    </form>
    {!queryText && <div className="scan-grid flex min-h-[260px] flex-col items-center justify-center border border-dashed border-border bg-card/40 px-6 text-center" data-testid="status-search-empty"><SlidersHorizontal size={22} className="mb-4 text-accent" /><h2 className="font-display text-2xl">Search the registry</h2><p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">Use at least two characters. Results are ranked against names and known aliases, never inferred from proximity.</p></div>}
    {queryText && searchQuery.isLoading && <LoadingBlock rows={6} />}
    {queryText && searchQuery.isError && <ErrorBlock message="Search could not be completed. Check the API connection and retry." retry={() => searchQuery.refetch()} />}
    {queryText && !searchQuery.isLoading && !searchQuery.isError && !results.length && <div className="border border-dashed border-border bg-card p-12 text-center" data-testid="status-no-search-results"><Search size={22} className="mx-auto mb-3 text-muted-foreground" /><h2 className="text-sm font-bold">No documented matches</h2><p className="mt-1 text-xs text-muted-foreground">Try a legal name, alternate spelling, or source identifier.</p></div>}
    {!!results.length && <div className="space-y-8" data-testid="search-results">
      {!!exact.length && <ResultGroup label="Exact matches" results={exact} />}
      {!!likely.length && <ResultGroup label="Likely matches" results={likely} />}
    </div>}
  </div>;
}

function ResultGroup({ label, results }: { label: string; results: any[] }) {
  return <section className="border border-border bg-card"><div className="flex items-center justify-between border-b hairline px-5 py-4"><div className="eyebrow text-accent">{label}</div><span className="font-data text-[10px] text-muted-foreground">{results.length} {results.length === 1 ? 'record' : 'records'}</span></div><div>{results.map((entity, i) => <div key={entity.id} className="relative"><EntityRow entity={entity} index={i} /><div className="absolute right-12 top-1/2 hidden -translate-y-1/2 sm:block"><div className={cn('font-data text-[10px]', entity.score >= .95 ? 'text-accent' : 'text-muted-foreground')}>{Math.round(entity.score * 100)} match</div></div></div>)}</div></section>;
}

function SourcesPage() {
  const sourcesQuery = useGetSources({ query: { queryKey: ['/api/sources'] } });
  const sources: any[] = sourcesQuery.data || [];
  return <div className="fade-in">
    <PageIntro eyebrow="Source registry / public access" title="Know where it came from"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">Free public feeds and investigative databases Cited Ledger can cite without inventing a unified source.</div></PageIntro>
    {sourcesQuery.isLoading && <LoadingBlock rows={6} />}
    {sourcesQuery.isError && <ErrorBlock message="The source registry could not be loaded." retry={() => sourcesQuery.refetch()} />}
    {!!sources.length && <div className="grid gap-4 lg:grid-cols-2" data-testid="source-registry">
       {sources.map((source) => <article key={source.id} className="ledger-surface border border-border bg-card p-5 sm:p-6" data-testid={`source-card-${source.id}`}>
         <div className="flex items-start justify-between gap-4"><div><div className="eyebrow text-accent">{source.publisher}</div><h2 className="mt-2 font-display text-2xl leading-none tracking-[-.03em]">{source.name}</h2></div><div className="flex shrink-0 flex-col items-end gap-2"><span className={cn('border px-2 py-1 font-data text-[9px] uppercase tracking-wider', source.status === 'indexed' ? 'border-accent/40 bg-accent/10 text-accent' : source.mode === 'automatic' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground')}>{source.status === 'indexed' ? 'Indexed' : source.mode === 'automatic' ? 'Auto feed' : source.status === 'setup_required' ? 'Setup required' : 'Discovery'}</span><span className="font-data text-[9px] uppercase tracking-wider text-muted-foreground">{String(source.category || 'source').replaceAll('_', ' ')}</span></div></div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{source.description}</p>
        <div className="mt-5 flex items-center justify-between gap-4 border-t hairline pt-4"><span className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">{source.format}</span><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline" data-testid={`link-source-registry-${source.id}`}>Official source <ExternalLink size={12} /></a></div>
      </article>)}
    </div>}
     <div className="mt-8 border border-accent/30 bg-accent/5 p-5 text-xs leading-relaxed text-muted-foreground"><span className="font-bold text-foreground">Source boundary.</span> Sanctions, corporate registry, PEP, and adverse-media context are separate categories. GDELT and Google News results are unverified coverage, not an adverse-media finding; PEP datasets remain discovery-only until independently configured.</div>
  </div>;
}

function EntityPage() {
  const params = useParams<{ id: string }>();
  const id = params.id || '';
  const [depth, setDepth] = useState(1);
  const [coverageRefresh, setCoverageRefresh] = useState(false);
  const [entityExportFormat, setEntityExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [networkExportFormat, setNetworkExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const entityQuery = useGetEntity(id, { query: { enabled: !!id, queryKey: getGetEntityQueryKey(id) } });
  const networkQuery = useGetEntityNetwork(id, { depth }, { query: { enabled: !!id, queryKey: getGetEntityNetworkQueryKey(id, { depth }) } });
  const coverageQuery = useGetEntityCoverage(id, { refresh: coverageRefresh }, { query: { enabled: !!id, queryKey: getGetEntityCoverageQueryKey(id, { refresh: coverageRefresh }) } });
  const entityExportQuery = useExportEntity(id, { format: entityExportFormat }, { query: { enabled: false, queryKey: getExportEntityQueryKey(id, { format: entityExportFormat }) } });
  const networkExportQuery = useExportEntityNetwork(id, { depth, format: networkExportFormat }, { query: { enabled: false, queryKey: getExportEntityNetworkQueryKey(id, { depth, format: networkExportFormat }) } });
  const entity: any = entityQuery.data;
  const graph: any = networkQuery.data;
  const coverage: any = coverageQuery.data;
  const propertyEntries = entity ? Object.entries(entity.properties || {}) : [];
  const exportEntityFile = async () => { const response = await entityExportQuery.refetch(); if (response.data) downloadBlob(response.data, `cited-ledger-${id}.${entityExportFormat}`); };
  const exportNetworkFile = async () => { const response = await networkExportQuery.refetch(); if (response.data) downloadBlob(response.data, `cited-ledger-${id}-network.${networkExportFormat}`); };
  return <div className="fade-in">
    <div className="mb-6 flex items-center gap-2 text-[11px] text-muted-foreground"><Link href="/search" data-testid="link-back-search" className="hover:text-accent">Entity search</Link><ChevronRight size={13} /><span className="truncate">{entity?.name || id}</span></div>
    {entityQuery.isLoading && <LoadingBlock rows={4} />}
    {entityQuery.isError && <ErrorBlock retry={() => entityQuery.refetch()} />}
    {entity && <div className="space-y-8">
      <section className="border border-border bg-card p-5 sm:p-8" data-testid="section-entity-header"><div className="flex flex-col gap-6 sm:flex-row sm:items-start"><SchemaMark schemaType={entity.schemaType} size={64} /><div className="min-w-0 flex-1"><div className="eyebrow mb-2 text-accent">{entity.schemaType} / dossier</div><h1 className="break-words font-display text-[clamp(2rem,5vw,3.8rem)] leading-[.95] tracking-[-.05em]">{entity.name}</h1><div className="mt-4 flex flex-wrap items-center gap-2"><span className="font-data text-[10px] text-muted-foreground">{entity.id}</span>{entity.datasets?.map((d: string) => <DatasetPill key={d}>{d}</DatasetPill>)}</div></div><div className="border-l border-border pl-5 sm:text-right"><div className="eyebrow text-muted-foreground">Record status</div><div className="mt-2 flex items-center gap-2 text-xs font-bold sm:justify-end"><span className="h-2 w-2 rounded-full bg-accent" /> Source-linked</div></div></div></section>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="border border-border bg-card" data-testid="section-entity-properties"><div className="border-b hairline px-5 py-4"><div className="eyebrow text-accent">Known attributes</div><h2 className="mt-1 text-sm font-bold">What the sources say</h2></div><div className="divide-y divide-border">{propertyEntries.length ? propertyEntries.map(([key, values]) => <div key={key} className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr]"><div className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">{key}</div><div className="space-y-1 text-sm">{(values as string[]).map((value, i) => <div key={i} data-testid={`text-property-${key}-${i}`}>{value}</div>)}</div></div>) : <div className="p-8 text-center text-sm text-muted-foreground" data-testid="status-empty-properties">No structured attributes available.</div>}</div>
          <div className="border-t hairline px-5 py-4"><div className="eyebrow text-accent">Also known as</div><div className="mt-3 flex flex-wrap gap-2">{entity.aliases?.length ? entity.aliases.map((alias: string) => <DatasetPill key={alias}>{alias}</DatasetPill>) : <span className="text-xs text-muted-foreground">No aliases recorded</span>}</div></div>
        </section>
        <section className="border border-border bg-card" data-testid="section-entity-sources"><div className="flex items-center justify-between border-b hairline px-5 py-4"><div><div className="eyebrow text-accent">Source ledger</div><h2 className="mt-1 text-sm font-bold">Primary citations</h2></div><BookOpen size={16} className="text-muted-foreground" /></div><div className="divide-y divide-border">{entity.sources?.length ? entity.sources.map((source: any, i: number) => <a key={`${source.url}-${i}`} href={source.url} target="_blank" rel="noreferrer" data-testid={`link-source-${i}`} className="group block p-5 transition-colors hover:bg-muted/45"><div className="flex gap-3"><ExternalLink size={14} className="mt-0.5 shrink-0 text-accent" /><div><div className="text-xs font-bold leading-relaxed group-hover:text-accent">{source.title}</div><div className="mt-1 text-[11px] text-muted-foreground">{source.publisher || 'Public source'} <span className="mx-1">·</span> Open source</div></div></div></a>) : <div className="p-8 text-center text-sm text-muted-foreground">No citations attached.</div>}</div></section>
      </div>
       <NetworkPanel graph={graph} depth={depth} setDepth={setDepth} loading={networkQuery.isLoading} error={networkQuery.isError} retry={() => networkQuery.refetch()} />
       <section className="border border-border bg-card" data-testid="section-related-coverage"><div className="flex flex-col justify-between gap-4 border-b hairline px-5 py-4 sm:flex-row sm:items-center"><div><div className="eyebrow text-primary">Progressive related coverage</div><h2 className="mt-1 text-sm font-bold">Unverified context around this record</h2><p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">GDELT and Google News RSS results are discovery context only. They are not sanctions records, primary citations, or corroboration.</p></div><button type="button" onClick={() => setCoverageRefresh(true)} disabled={coverageQuery.isLoading} data-testid="button-refresh-coverage" className="flex items-center justify-center gap-2 border border-primary px-3 py-2 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-45"><RefreshCw size={12} /> {coverageQuery.isLoading ? 'Fetching…' : 'Fetch latest context'}</button></div>{coverageQuery.isLoading && <div className="p-5"><LoadingBlock rows={3} /></div>}{coverageQuery.isError && <div className="p-5"><ErrorBlock message="Related coverage is unavailable. Sourced dossier data remains unchanged." retry={() => coverageQuery.refetch()} /></div>}{coverage && !coverageQuery.isLoading && <div><div className="grid gap-px border-b border-border bg-border sm:grid-cols-2">{(coverage.feeds || []).map((feed: any) => <div key={feed.feed} className="bg-card/80 p-4" data-testid={`status-coverage-feed-${feed.feed}`}><div className="flex items-center justify-between gap-3"><span className="font-data text-[10px] uppercase tracking-wider text-primary">{feed.feed}</span><span className="font-data text-[9px] uppercase text-muted-foreground">{feed.status}</span></div>{feed.message && <p className="mt-2 text-[10px] text-muted-foreground">{feed.message}</p>}</div>)}</div>{coverage.items?.length ? <div className="divide-y divide-border">{coverage.items.map((item: any) => <article key={item.id} className="p-5" data-testid={`card-coverage-item-${item.id}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-data text-[9px] uppercase tracking-wider text-primary">{item.feed} · {item.verification}</div><a href={item.url} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-bold leading-relaxed hover:text-primary">{item.title} <ExternalLink size={12} className="ml-1 inline" /></a><div className="mt-1 text-[10px] text-muted-foreground">{item.publisher}{item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString()}` : ''}</div></div></div>{item.summary && <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">{item.summary}</p>}</article>)}</div> : <div className="p-10 text-center text-xs text-muted-foreground" data-testid="status-empty-related-coverage">No related context returned from the available feeds.</div>}</div>}</section>
       <section className="flex flex-col justify-between gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6" data-testid="section-dossier-exports"><div><div className="eyebrow text-accent">Dossier controls</div><h2 className="mt-1 text-sm font-bold">Export the evidence boundary</h2><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Exports use the source service’s documented record and network formats.</p></div><div className="flex flex-wrap gap-2"><select value={entityExportFormat} onChange={(event) => setEntityExportFormat(event.target.value as 'json' | 'csv' | 'pdf')} data-testid="select-entity-export-format" className="h-9 border border-input bg-background px-2 font-data text-[10px] outline-none focus:border-accent"><option value="json">Dossier JSON</option><option value="csv">Dossier CSV</option><option value="pdf">Dossier PDF</option></select><button type="button" onClick={exportEntityFile} disabled={entityExportQuery.isFetching} data-testid="button-export-dossier" className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-[10px] font-bold text-primary-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-45"><Download size={12} /> {entityExportQuery.isFetching ? 'Preparing…' : 'Export dossier'}</button><select value={networkExportFormat} onChange={(event) => setNetworkExportFormat(event.target.value as 'json' | 'csv' | 'pdf')} data-testid="select-network-export-format" className="h-9 border border-input bg-background px-2 font-data text-[10px] outline-none focus:border-accent"><option value="json">Network JSON</option><option value="csv">Network CSV</option><option value="pdf">Network PDF</option></select><button type="button" onClick={exportNetworkFile} disabled={networkExportQuery.isFetching} data-testid="button-export-network" className="inline-flex h-9 items-center gap-2 border border-primary px-3 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-45"><Download size={12} /> {networkExportQuery.isFetching ? 'Preparing…' : 'Export network'}</button></div>{(entityExportQuery.isError || networkExportQuery.isError) && <div className="text-[10px] text-destructive" data-testid="status-export-error">The requested export could not be prepared.</div>}</section>
    </div>}
  </div>;
}

function NetworkPanel({ graph, depth, setDepth, loading, error, retry }: { graph: any; depth: number; setDepth: (n: number) => void; loading: boolean; error: boolean; retry: () => void }) {
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const positions = useMemo(() => {
    if (!graph?.nodes) return [];
    const center = graph.nodes.find((n: any) => n.depth === 0) || graph.nodes[0];
    const outer = graph.nodes.filter((n: any) => n.id !== center?.id);
    return [{ node: center, x: 50, y: 50 }, ...outer.map((node: any, i: number) => { const angle = (i / Math.max(outer.length, 1)) * Math.PI * 2 - Math.PI / 2; return { node, x: 50 + Math.cos(angle) * 31, y: 50 + Math.sin(angle) * 31 }; })].filter((p) => p.node);
  }, [graph]);
  const pos = (id: string) => positions.find((p: any) => p.node.id === id);
  return <section className="border border-border bg-card" data-testid="section-entity-network"><div className="flex flex-col justify-between gap-4 border-b hairline px-5 py-4 sm:flex-row sm:items-center"><div><div className="eyebrow text-accent">Relationship graph</div><h2 className="mt-1 text-sm font-bold">Documented connections</h2></div><div className="flex items-center gap-3"><span className="font-data text-[10px] text-muted-foreground">{graph?.nodes?.length || 0} NODES / {graph?.edges?.length || 0} EDGES</span><button type="button" onClick={() => setDepth(depth === 1 ? 2 : 1)} data-testid="button-toggle-network-depth" className="flex items-center gap-2 border border-border px-3 py-2 text-[11px] font-bold transition-colors hover:border-accent hover:text-accent"><ChevronDown size={13} /> Depth {depth}</button></div></div>
    {loading && <div className="p-5"><LoadingBlock rows={3} /></div>}
    {error && <div className="p-5"><ErrorBlock message="Network expansion failed." retry={retry} /></div>}
     {graph && !loading && <div className="grid lg:grid-cols-[1fr_330px]"><div className="scan-grid relative min-h-[420px] overflow-hidden border-b border-border lg:border-b-0 lg:border-r" data-testid="network-graph-canvas"><div className="absolute inset-0 opacity-50">{graph.edges?.map((edge: any, i: number) => { const a = pos(edge.source); const b = pos(edge.target); return a && b ? <svg key={i} className="absolute inset-0 h-full w-full overflow-visible"><line x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`} stroke={selectedEdge === edge ? 'hsl(var(--primary))' : 'hsl(var(--accent) / .5)'} strokeWidth={selectedEdge === edge ? '3' : '1.5'} strokeDasharray={edge.confidence?.toLowerCase().includes('low') ? '4 4' : undefined} className="cursor-pointer transition-all" onClick={() => setSelectedEdge(edge)} aria-label={`Select ${edge.relationshipType} relationship`} /></svg> : null; })}</div>{positions.map(({ node, x, y }: any) => <Link key={node.id} href={`/entities/${node.id}`} data-testid={`link-network-node-${node.id}`} style={{ left: `${x}%`, top: `${y}%` }} className={cn('absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:z-10 hover:scale-105', node.depth === 0 ? 'w-32' : 'w-24')}><div className={cn('mx-auto grid place-items-center border-2 bg-card shadow-sm', node.depth === 0 ? 'h-14 w-14 border-primary text-primary' : 'h-10 w-10 border-accent/60 text-accent')}><span className="font-data text-[10px]">{node.depth === 0 ? 'ROOT' : `0${node.depth}`}</span></div><div className="mt-2 line-clamp-2 text-center text-[10px] font-bold leading-tight">{node.label}</div><div className="mt-1 text-center font-data text-[8px] uppercase text-muted-foreground">{node.schemaType}</div></Link>)}</div><div className="max-h-[420px] overflow-auto p-5">{selectedEdge && <div className="mb-5 border border-primary/30 bg-primary/5 p-4" data-testid="selected-network-edge"><div className="eyebrow text-primary">Selected relationship</div><div className="mt-2 text-sm font-bold">{selectedEdge.relationshipType}</div><div className="mt-1 text-[10px] text-muted-foreground">{selectedEdge.confidence} confidence</div><a href={selectedEdge.citation?.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"><ExternalLink size={11} /> {selectedEdge.citation?.title || 'Open source citation'}</a></div>}<div className="eyebrow mb-4 text-muted-foreground">Evidence trail</div>{graph.edges?.length ? graph.edges.map((edge: any, i: number) => <button type="button" key={i} onClick={() => setSelectedEdge(edge)} className={cn('mb-4 block w-full border-l-2 pl-3 text-left transition-colors', selectedEdge === edge ? 'border-primary bg-primary/5' : 'border-accent/40 hover:bg-muted/45')} data-testid={`network-edge-${i}`}><div className="text-xs font-bold">{edge.relationshipType}</div><div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{edge.confidence} confidence</div><span className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-accent"><Link2 size={11} /> {edge.citation?.title || 'View citation'}</span></button>) : <div className="text-xs text-muted-foreground">No documented relationships at this depth.</div>}<div className="mt-6 border-t hairline pt-4 text-[10px] leading-relaxed text-muted-foreground">Lines show cited relationships only. A connection is not an allegation.</div></div></div>}
  </section>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BatchPage() {
  const [csv, setCsv] = useState('');
  const [submittedCsv, setSubmittedCsv] = useState<string | null>(null);
  const [limit, setLimit] = useState('5');
  const screenMutation = useBatchScreen();
  const exportMutation = useExportBatchScreen();
  const result: any = screenMutation.data;
  const inputs = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!csv.trim()) return;
    setSubmittedCsv(csv);
    screenMutation.mutate({ data: { csv: csv.trim(), limitPerName: Number(limit) } });
  };
  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ''));
    reader.readAsText(file);
  };
  const exportResults = (format: 'csv' | 'json' | 'pdf') => {
    if (!result?.items?.length) return;
    exportMutation.mutate({ data: { items: result.items, format } }, {
      onSuccess: (blob) => downloadBlob(blob, `cited-ledger-batch-${format}.${format === 'pdf' ? 'pdf' : format}`),
    });
  };
  const unavailable = result?.items?.filter((item: any) => item.status !== 'matched' && item.status !== 'complete' && !item.matches?.length).length || 0;
  return <div className="fade-in">
    <PageIntro eyebrow="Batch screening / intake desk" title="Screen a name list"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">Paste a CSV or newline list. Every row returns its own status and match rationale.</div></PageIntro>
    <div className="grid gap-8 xl:grid-cols-[minmax(0,460px)_1fr]">
      <form onSubmit={submit} className="border border-border bg-card p-5 sm:p-6" data-testid="form-batch-screen">
        <div className="mb-5 flex items-start justify-between gap-4"><div><div className="eyebrow text-accent">01 / intake</div><h2 className="mt-1 text-sm font-bold">Names to screen</h2></div><label className="inline-flex cursor-pointer items-center gap-2 border border-border px-3 py-2 text-[10px] font-bold text-muted-foreground transition-colors hover:border-accent hover:text-accent"><Upload size={13} /> Upload CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={readFile} data-testid="input-batch-file" /></label></div>
        <textarea value={csv} onChange={(event) => setCsv(event.target.value)} placeholder={"Name, country\nMariya Petrov\nNorthstar Holdings"} data-testid="input-batch-names" className="min-h-[250px] w-full resize-y border border-input bg-background p-4 font-data text-xs leading-6 outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/55 focus:border-accent focus:ring-2 focus:ring-accent/15" />
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="block"><span className="eyebrow mb-2 block text-muted-foreground">Max matches / input</span><select value={limit} onChange={(event) => setLimit(event.target.value)} data-testid="select-batch-limit" className="h-10 w-full border border-input bg-background px-3 font-data text-xs outline-none focus:border-accent"><option value="3">3</option><option value="5">5</option><option value="10">10</option></select></label><button type="submit" disabled={screenMutation.isPending || !csv.trim()} data-testid="button-run-batch" className="flex h-10 items-center justify-center gap-2 bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-45"><Play size={13} /> {screenMutation.isPending ? 'Screening…' : 'Run screening'}</button></div>
        <div className="mt-5 border-t hairline pt-4 text-[10px] leading-relaxed text-muted-foreground">CSV is parsed by the source service. Cited Ledger does not infer identity from proximity; review each rationale before reporting.</div>
        {!!inputs.length && <div className="mt-4 font-data text-[10px] text-muted-foreground" data-testid="text-batch-input-count">{inputs.length} input {inputs.length === 1 ? 'row' : 'rows'} ready</div>}
      </form>
      <section className="min-w-0" data-testid="section-batch-results">
        {!submittedCsv && <div className="scan-grid flex min-h-[320px] flex-col items-center justify-center border border-dashed border-border px-6 text-center"><ListChecks size={23} className="mb-4 text-accent" /><h2 className="font-display text-2xl">Results stay row-level</h2><p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">Run a list to see confidence, match reasons, and source availability without collapsing the evidence trail.</p></div>}
        {submittedCsv && screenMutation.isPending && <LoadingBlock rows={5} />}
        {submittedCsv && screenMutation.isError && <ErrorBlock message="Batch screening could not be completed. The submitted list was not altered." retry={() => screenMutation.mutate({ data: { csv: submittedCsv, limitPerName: Number(limit) } })} />}
        {result && !screenMutation.isPending && <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4 border border-border bg-card p-5"><div><div className="eyebrow text-accent">02 / review</div><h2 className="mt-1 text-sm font-bold">{result.items?.length || 0} rows returned</h2><p className="mt-1 text-[10px] text-muted-foreground">Generated {result.generatedAt ? new Date(result.generatedAt).toLocaleString() : 'by source service'}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => exportResults('csv')} disabled={exportMutation.isPending} data-testid="button-export-batch-csv" className="inline-flex items-center gap-1 border border-border px-3 py-2 text-[10px] font-bold hover:border-accent hover:text-accent"><Download size={12} /> CSV</button><button type="button" onClick={() => exportResults('json')} disabled={exportMutation.isPending} data-testid="button-export-batch-json" className="inline-flex items-center gap-1 border border-border px-3 py-2 text-[10px] font-bold hover:border-accent hover:text-accent"><Download size={12} /> JSON</button><button type="button" onClick={() => exportResults('pdf')} disabled={exportMutation.isPending} data-testid="button-export-batch-pdf" className="inline-flex items-center gap-1 bg-primary px-3 py-2 text-[10px] font-bold text-primary-foreground hover:bg-accent hover:text-accent-foreground"><Download size={12} /> PDF</button></div></div>
          {exportMutation.isError && <div className="border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive" data-testid="status-batch-export-error">The export service could not prepare this file. The on-screen results remain available.</div>}
          {unavailable > 0 && <div className="flex items-start gap-3 border border-primary/30 bg-primary/5 p-4 text-xs" data-testid="status-batch-partial"><CircleAlert size={15} className="mt-0.5 shrink-0 text-primary" /><span><strong>{unavailable} row{unavailable === 1 ? '' : 's'} need attention.</strong> No usable match was returned or its source was unavailable. This is not a negative finding.</span></div>}
          {!result.items?.length && <div className="border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground" data-testid="status-empty-batch-results">The source service returned no screenable rows. Check the CSV header and input format.</div>}
          <div className="space-y-3">{result.items?.map((item: any, index: number) => <article key={`${item.input}-${index}`} className="border border-border bg-card" data-testid={`card-batch-result-${index}`}><div className="flex flex-col gap-3 border-b hairline px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><div className="font-data text-[10px] text-muted-foreground">INPUT {String(index + 1).padStart(2, '0')}</div><h3 className="mt-1 truncate text-sm font-bold">{item.input}</h3></div><span className={cn('inline-flex items-center gap-1.5 self-start border px-2 py-1 font-data text-[9px] uppercase tracking-wider sm:self-auto', item.matches?.length ? 'border-accent/35 bg-accent/10 text-accent' : 'border-border bg-muted text-muted-foreground')}>{item.matches?.length ? <CheckCircle2 size={11} /> : <CircleAlert size={11} />}{item.status || (item.matches?.length ? 'matched' : 'unavailable')}</span></div>{item.message && <div className="border-b hairline px-4 py-3 text-xs text-muted-foreground sm:px-5">{item.message}</div>}<div className="divide-y divide-border">{item.matches?.length ? item.matches.map((match: any, matchIndex: number) => <div key={`${match.id}-${matchIndex}`} className="px-4 py-4 sm:px-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/entities/${match.id}`} data-testid={`link-batch-match-${index}-${matchIndex}`} className="text-sm font-bold hover:text-accent">{match.name}</Link><div className="mt-1 font-data text-[10px] text-muted-foreground">{match.id} · {match.schemaType}</div></div><span className="font-data text-xs text-accent">{Math.round(match.score * 100)}% match</span></div>{match.reasons?.length ? <div className="mt-3 flex flex-wrap gap-2">{match.reasons.map((reason: any, reasonIndex: number) => <span key={reasonIndex} className="border border-border bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground"><strong className="text-foreground">{reason.label}:</strong> {reason.detail}</span>)}</div> : <div className="mt-3 text-[10px] text-muted-foreground">No match rationale supplied by the source service.</div>}</div>) : <div className="px-4 py-5 text-xs text-muted-foreground sm:px-5">No documented match returned for this input. Check the unavailable state above before drawing conclusions.</div>}</div></article>)}</div>
        </div>}
      </section>
    </div>
  </div>;
}

function WatchlistsPage() {
  const listQuery = useListWatchlists({ query: { queryKey: getListWatchlistsQueryKey() } });
  const watchlists: any[] = listQuery.data || [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [entityId, setEntityId] = useState('');
  const createMutation = useCreateWatchlist();
  const addMutation = useAddWatchlistEntity();
  const checkMutation = useCheckWatchlist();
  const eventsQuery = useGetWatchlistEvents(selectedId || 0, { query: { enabled: !!selectedId, queryKey: getGetWatchlistEventsQueryKey(selectedId || 0) } });
  const create = (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; createMutation.mutate({ data: { name: name.trim() } }, { onSuccess: (watchlist) => { setName(''); setSelectedId(watchlist.id); queryClient.invalidateQueries({ queryKey: getListWatchlistsQueryKey() }); } }); };
  const addEntity = (event: FormEvent) => { event.preventDefault(); if (!selectedId || !entityId.trim()) return; addMutation.mutate({ id: selectedId, data: { entityId: entityId.trim() } }, { onSuccess: () => { setEntityId(''); queryClient.invalidateQueries({ queryKey: getListWatchlistsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetWatchlistEventsQueryKey(selectedId) }); } }); };
  const check = () => { if (!selectedId) return; checkMutation.mutate({ id: selectedId }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListWatchlistsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetWatchlistEventsQueryKey(selectedId) }); } }); };
  const selected = watchlists.find((watchlist) => watchlist.id === selectedId);
  return <div className="fade-in">
    <PageIntro eyebrow="Watchlists / change detection" title="Keep an eye on the graph"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">Watchlists are investigator-maintained sets of entity IDs. Checks compare source records and report changes without asserting intent.</div></PageIntro>
    <div className="grid gap-8 xl:grid-cols-[330px_1fr]">
      <section className="space-y-5">
        <form onSubmit={create} className="border border-primary/35 bg-primary/5 p-5" data-testid="form-create-watchlist"><div className="eyebrow text-primary">New watchlist</div><h2 className="mt-1 text-sm font-bold">Create a monitoring set</h2><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Baltic shipping review" data-testid="input-watchlist-name" className="mt-4 h-10 w-full border border-input bg-background px-3 text-xs outline-none focus:border-accent" /><button type="submit" disabled={createMutation.isPending || !name.trim()} data-testid="button-create-watchlist" className="mt-3 flex h-10 w-full items-center justify-center gap-2 bg-primary text-xs font-bold text-primary-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-45"><Plus size={14} /> {createMutation.isPending ? 'Creating…' : 'Create watchlist'}</button></form>
        {listQuery.isLoading && <LoadingBlock rows={4} />}
        {listQuery.isError && <ErrorBlock message="Watchlists could not be loaded." retry={() => listQuery.refetch()} />}
        {!listQuery.isLoading && !listQuery.isError && !watchlists.length && <div className="border border-dashed border-border p-7 text-center text-xs text-muted-foreground" data-testid="status-empty-watchlists">No watchlists yet. Create one to begin change detection.</div>}
        <div className="space-y-2">{watchlists.map((watchlist) => <button type="button" key={watchlist.id} onClick={() => setSelectedId(watchlist.id)} data-testid={`button-select-watchlist-${watchlist.id}`} className={cn('block w-full border p-4 text-left transition-colors', selectedId === watchlist.id ? 'border-accent bg-accent/5' : 'border-border bg-card hover:border-accent/50')}><div className="flex items-start justify-between gap-3"><span className="text-sm font-bold">{watchlist.name}</span><ChevronRight size={15} className={selectedId === watchlist.id ? 'text-accent' : 'text-muted-foreground'} /></div><div className="mt-3 flex items-center justify-between font-data text-[9px] uppercase tracking-wider text-muted-foreground"><span>{watchlist.entities} entities</span><span>{watchlist.updatedAt ? new Date(watchlist.updatedAt).toLocaleDateString() : '—'}</span></div></button>)}</div>
      </section>
      <section className="min-w-0">
        {!selected && <div className="scan-grid flex min-h-[360px] flex-col items-center justify-center border border-dashed border-border px-6 text-center"><ClipboardList size={23} className="mb-4 text-accent" /><h2 className="font-display text-2xl">Select a watchlist</h2><p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">The check desk will show the monitored IDs and the event ledger once a set is selected.</p></div>}
        {selected && <div className="space-y-5">
          <div className="flex flex-col justify-between gap-4 border border-border bg-card p-5 sm:flex-row sm:items-end sm:p-6"><div><div className="eyebrow text-accent">Active watchlist</div><h2 className="mt-1 font-display text-3xl tracking-[-.04em]">{selected.name}</h2><div className="mt-2 font-data text-[10px] text-muted-foreground">{selected.entities} entity IDs · updated {new Date(selected.updatedAt).toLocaleString()}</div></div><button type="button" onClick={check} disabled={checkMutation.isPending} data-testid="button-check-watchlist" className="flex items-center justify-center gap-2 bg-primary px-4 py-3 text-xs font-bold text-primary-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-45"><RefreshCw size={14} className={checkMutation.isPending ? 'animate-spin' : ''} /> {checkMutation.isPending ? 'Checking…' : 'Run source check'}</button></div>
          {checkMutation.data && <div className="border border-accent/30 bg-accent/5 p-4 text-xs" data-testid="status-watchlist-check"><strong>Check complete.</strong> {checkMutation.data.checked} records checked; {checkMutation.data.changes} change{checkMutation.data.changes === 1 ? '' : 's'} detected.</div>}
          <form onSubmit={addEntity} className="flex flex-col gap-3 border border-border bg-card p-5 sm:flex-row sm:items-end" data-testid="form-add-watchlist-entity"><label className="min-w-0 flex-1"><span className="eyebrow mb-2 block text-muted-foreground">Add entity ID</span><input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="e.g. ofac:entity-id" data-testid="input-watchlist-entity-id" className="h-10 w-full border border-input bg-background px-3 font-data text-xs outline-none focus:border-accent" /></label><button type="submit" disabled={addMutation.isPending || !entityId.trim()} data-testid="button-add-watchlist-entity" className="flex h-10 items-center justify-center gap-2 border border-primary px-4 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-45"><Plus size={13} /> Add ID</button></form>
          <section className="border border-border bg-card" data-testid="section-watchlist-events"><div className="flex items-center justify-between border-b hairline px-5 py-4"><div><div className="eyebrow text-accent">Change ledger</div><h3 className="mt-1 text-sm font-bold">Observed events</h3></div><CalendarClock size={16} className="text-muted-foreground" /></div>{eventsQuery.isLoading && <div className="p-5"><LoadingBlock rows={3} /></div>}{eventsQuery.isError && <div className="p-5"><ErrorBlock message="Change events are unavailable for this watchlist." retry={() => eventsQuery.refetch()} /></div>}{!eventsQuery.isLoading && !eventsQuery.isError && !eventsQuery.data?.length && <div className="p-10 text-center text-xs text-muted-foreground" data-testid="status-empty-watchlist-events">No changes recorded yet. Run a source check to establish the first comparison.</div>}{eventsQuery.data?.map((event: any) => <article key={event.id} className="border-b hairline px-5 py-4 last:border-b-0" data-testid={`row-watchlist-event-${event.id}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-data text-[10px] text-accent">{event.eventType}</div><h4 className="mt-1 text-xs font-bold">{event.summary}</h4><div className="mt-2 font-data text-[9px] text-muted-foreground">{event.entityId} · {event.detectedAt ? new Date(event.detectedAt).toLocaleString() : 'Undated'}</div></div><span className={cn('border px-2 py-1 font-data text-[9px] uppercase', event.readAt ? 'border-border text-muted-foreground' : 'border-accent/30 bg-accent/10 text-accent')}>{event.readAt ? 'reviewed' : 'new'}</span></div></article>)}</section>
        </div>}
      </section>
    </div>
  </div>;
}

function CasesPage() {
  const casesQuery = useListCases({ query: { queryKey: getListCasesQueryKey() } });
  const cases: any[] = casesQuery.data || [];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateCase();
  const create = (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; createMutation.mutate({ data: { name: name.trim(), description: description.trim() || null } }, { onSuccess: () => { setName(''); setDescription(''); queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() }); } }); };
  return <div className="fade-in">
    <PageIntro eyebrow="Research cases / working files" title="Keep the reporting trail together"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">Cases hold investigator-authored notes alongside links to source-backed entity records. The two are never presented as the same kind of evidence.</div></PageIntro>
    <div className="grid gap-8 xl:grid-cols-[360px_1fr]">
      <form onSubmit={create} className="border border-primary/35 bg-primary/5 p-5 sm:p-6" data-testid="form-create-case"><div className="eyebrow text-primary">New case folder</div><h2 className="mt-1 text-sm font-bold">Open an investigation</h2><label className="mt-5 block"><span className="eyebrow mb-2 block text-muted-foreground">Case name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Meridian port ownership" data-testid="input-case-name" className="h-10 w-full border border-input bg-background px-3 text-xs outline-none focus:border-accent" /></label><label className="mt-4 block"><span className="eyebrow mb-2 block text-muted-foreground">Working description <span className="normal-case tracking-normal">(optional)</span></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What question is this desk pursuing?" data-testid="input-case-description" className="min-h-[105px] w-full resize-y border border-input bg-background p-3 text-xs leading-relaxed outline-none focus:border-accent" /></label><button type="submit" disabled={createMutation.isPending || !name.trim()} data-testid="button-create-case" className="mt-4 flex h-10 w-full items-center justify-center gap-2 bg-primary text-xs font-bold text-primary-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-45"><FilePlus2 size={14} /> {createMutation.isPending ? 'Opening…' : 'Open case folder'}</button></form>
      <section>{casesQuery.isLoading && <LoadingBlock rows={4} />}{casesQuery.isError && <ErrorBlock message="Research cases could not be loaded." retry={() => casesQuery.refetch()} />}{!casesQuery.isLoading && !casesQuery.isError && !cases.length && <div className="border border-dashed border-border p-12 text-center" data-testid="status-empty-cases"><FolderOpen size={22} className="mx-auto mb-3 text-muted-foreground" /><h2 className="text-sm font-bold">No case folders</h2><p className="mt-1 text-xs text-muted-foreground">Create a folder when a question needs its own evidence trail.</p></div>}<div className="grid gap-4 md:grid-cols-2">{cases.map((researchCase) => <Link href={`/cases/${researchCase.id}`} key={researchCase.id} data-testid={`link-case-${researchCase.id}`} className="group border border-border bg-card p-5 transition-colors hover:border-accent"><div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 place-items-center border border-primary/25 bg-primary/5 text-primary"><FolderOpen size={16} /></div><span className="font-data text-[9px] text-muted-foreground">{researchCase.updatedAt ? new Date(researchCase.updatedAt).toLocaleDateString() : '—'}</span></div><h3 className="mt-5 font-display text-2xl leading-none tracking-[-.03em] group-hover:text-accent">{researchCase.name}</h3><p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{researchCase.description || 'No working description added.'}</p><div className="mt-6 flex gap-4 border-t hairline pt-4 font-data text-[10px] uppercase tracking-wider text-muted-foreground"><span>{researchCase.entityCount} records</span><span>{researchCase.noteCount} notes</span></div></Link>)}</div></section>
    </div>
  </div>;
}

function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = Number(params.id);
  const caseQuery = useGetCase(caseId, { query: { enabled: Number.isFinite(caseId), queryKey: getGetCaseQueryKey(caseId) } });
  const addEntityMutation = useAddCaseEntity();
  const addNoteMutation = useAddCaseNote();
  const [entityId, setEntityId] = useState('');
  const [entityNote, setEntityNote] = useState('');
  const [note, setNote] = useState('');
  const detail: any = caseQuery.data;
  const addEntity = (event: FormEvent) => { event.preventDefault(); if (!entityId.trim()) return; addEntityMutation.mutate({ id: caseId, data: { entityId: entityId.trim(), note: entityNote.trim() || null } }, { onSuccess: () => { setEntityId(''); setEntityNote(''); queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) }); queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() }); } }); };
  const addNote = (event: FormEvent) => { event.preventDefault(); if (!note.trim()) return; addNoteMutation.mutate({ id: caseId, data: { body: note.trim() } }, { onSuccess: () => { setNote(''); queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) }); queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() }); } }); };
  return <div className="fade-in">
    <div className="mb-6 flex items-center gap-2 text-[11px] text-muted-foreground"><Link href="/cases" data-testid="link-back-cases" className="hover:text-accent">Research cases</Link><ChevronRight size={13} /><span className="truncate">{detail?.name || `Case ${params.id}`}</span></div>
    {caseQuery.isLoading && <LoadingBlock rows={4} />}{caseQuery.isError && <ErrorBlock message="This case folder could not be opened." retry={() => caseQuery.refetch()} />}{detail && <div className="space-y-8">
      <section className="border border-border bg-card p-5 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="eyebrow mb-2 text-accent">Investigation folder / case {detail.id}</div><h1 className="font-display text-[clamp(2rem,5vw,3.6rem)] leading-[.95] tracking-[-.05em]">{detail.name}</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{detail.description || 'No working description added.'}</p></div><div className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">{detail.entities?.length || 0} records · {detail.notes?.length || 0} notes</div></div></section>
      <div className="grid gap-8 xl:grid-cols-2">
        <section className="border border-accent/30 bg-accent/5" data-testid="section-case-sourced-records"><div className="border-b border-accent/20 px-5 py-4"><div className="eyebrow text-accent">Source-linked records</div><h2 className="mt-1 text-sm font-bold">Entities in this case</h2><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">These are references to the sanctions graph, not case-authored claims.</p></div><form onSubmit={addEntity} className="border-b border-accent/20 p-5" data-testid="form-add-case-entity"><label className="block"><span className="eyebrow mb-2 block text-muted-foreground">Entity ID</span><input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="Paste a documented entity ID" data-testid="input-case-entity-id" className="h-10 w-full border border-input bg-background px-3 font-data text-xs outline-none focus:border-accent" /></label><label className="mt-3 block"><span className="eyebrow mb-2 block text-muted-foreground">Desk context <span className="normal-case tracking-normal">(optional)</span></span><input value={entityNote} onChange={(event) => setEntityNote(event.target.value)} placeholder="Why is this record relevant?" data-testid="input-case-entity-note" className="h-10 w-full border border-input bg-background px-3 text-xs outline-none focus:border-accent" /></label><button type="submit" disabled={addEntityMutation.isPending || !entityId.trim()} data-testid="button-add-case-entity" className="mt-3 flex h-10 items-center gap-2 border border-accent px-4 text-xs font-bold text-accent hover:bg-accent hover:text-accent-foreground disabled:opacity-45"><Plus size={13} /> Add sourced record</button></form><div className="divide-y divide-accent/15">{detail.entities?.length ? detail.entities.map((item: any) => <article key={item.id} className="px-5 py-4" data-testid={`row-case-entity-${item.id}`}><Link href={`/entities/${item.entityId}`} data-testid={`link-case-entity-${item.id}`} className="font-data text-xs font-bold text-accent hover:underline">{item.entityId}</Link>{item.note && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Desk context: {item.note}</p>}<div className="mt-2 font-data text-[9px] text-muted-foreground">Added {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : '—'}</div></article>) : <div className="p-8 text-center text-xs text-muted-foreground" data-testid="status-empty-case-entities">No source-linked records yet.</div>}</div></section>
        <section className="border border-border bg-card" data-testid="section-case-notes"><div className="border-b hairline px-5 py-4"><div className="eyebrow text-primary">Investigator-authored</div><h2 className="mt-1 text-sm font-bold">Desk notes</h2><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Working material stays visually separate from sourced records and is not a citation.</p></div><form onSubmit={addNote} className="border-b hairline p-5" data-testid="form-add-case-note"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a working note, question, or reporting lead…" data-testid="input-case-note" className="min-h-[120px] w-full resize-y border border-input bg-background p-3 text-xs leading-relaxed outline-none focus:border-primary" /><button type="submit" disabled={addNoteMutation.isPending || !note.trim()} data-testid="button-add-case-note" className="mt-3 flex h-10 items-center gap-2 bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-45"><StickyNote size={13} /> Add desk note</button></form><div className="divide-y divide-border">{detail.notes?.length ? detail.notes.map((item: any) => <article key={item.id} className="px-5 py-5" data-testid={`row-case-note-${item.id}`}><div className="flex items-center justify-between gap-3"><span className="font-data text-[9px] uppercase tracking-wider text-primary">Author note</span><span className="font-data text-[9px] text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p></article>) : <div className="p-8 text-center text-xs text-muted-foreground" data-testid="status-empty-case-notes">No desk notes yet. Keep inference and reporting questions here.</div>}</div></section>
      </div>
    </div>}
  </div>;
}

function PathsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [submitted, setSubmitted] = useState<{ from: string; to: string } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<{ from: string; to: string } | null>(null);
  const pathQuery = useFindEntityPath(selectedRoute || { from: '', to: '' }, { query: { enabled: !!selectedRoute?.from && !!selectedRoute?.to, queryKey: getFindEntityPathQueryKey(selectedRoute || { from: '', to: '' }) } });
  const result: any = pathQuery.data;
  const submit = (e: FormEvent) => { e.preventDefault(); const fromValues = from.split(',').map((value) => value.trim()).filter(Boolean); const toValues = to.split(',').map((value) => value.trim()).filter(Boolean); if (fromValues.length && toValues.length && !(fromValues.length === 1 && toValues.length === 1 && fromValues[0] === toValues[0])) { setSubmitted({ from: from.trim(), to: to.trim() }); setSelectedRoute({ from: fromValues[0], to: toValues[0] }); } };
  const fromEndpoints = submitted?.from.split(',').map((value) => value.trim()).filter(Boolean) || [];
  const toEndpoints = submitted?.to.split(',').map((value) => value.trim()).filter(Boolean) || [];
  const routeOptions = fromEndpoints.flatMap((fromEndpoint) => toEndpoints.map((toEndpoint) => ({ from: fromEndpoint, to: toEndpoint }))).slice(0, 25);
  return <div className="fade-in"><PageIntro eyebrow="Graph tools / shortest route" title="Trace a connection"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">Move between two known entities through relationships backed by a source citation.</div></PageIntro>
    <form onSubmit={submit} className="mb-5 grid gap-3 border border-border bg-card p-5 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end sm:p-6" data-testid="form-path-search"><PathInput label="From endpoint(s)" value={from} setValue={setFrom} testId="input-path-from" placeholder="ID or name; separate many with commas" /><div className="hidden pb-3 text-accent sm:block"><ArrowRight size={18} /></div><PathInput label="To endpoint(s)" value={to} setValue={setTo} testId="input-path-to" placeholder="ID or name; separate many with commas" /><button type="submit" data-testid="button-find-path" className="flex h-11 items-center justify-center gap-2 bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"><GitBranch size={15} /> Find shortest path</button></form>
     <div className="mb-10 border border-accent/25 bg-accent/5 px-4 py-3 text-[10px] leading-relaxed text-muted-foreground" data-testid="status-path-input-help"><span className="font-bold text-foreground">Fuzzy and one-to-many ready.</span> Enter names or IDs. Comma-separated endpoints become selectable endpoint pairs; Cited Ledger checks the selected pair and shows only the cited route.</div>
    {!submitted && <div className="scan-grid flex min-h-[270px] flex-col items-center justify-center border border-dashed border-border bg-card/40 px-6 text-center" data-testid="status-path-empty"><GitBranch size={26} className="mb-4 text-accent" /><h2 className="font-display text-2xl">Follow the documented chain</h2><p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">Enter two entity IDs to test whether the source graph connects them. The result shows only the shortest cited route.</p></div>}
    {submitted && <div className="mb-5 flex flex-wrap items-center gap-3 border border-primary/30 bg-primary/5 p-4" data-testid="status-selected-path"><span className="eyebrow text-primary">Selected route</span>{routeOptions.length > 1 && <select value={`${selectedRoute?.from}|||${selectedRoute?.to}`} onChange={(event) => { const [nextFrom, nextTo] = event.target.value.split('|||'); setSelectedRoute({ from: nextFrom, to: nextTo }); }} data-testid="select-path-route" className="h-8 max-w-full border border-primary/25 bg-card px-2 font-data text-[10px] outline-none focus:border-primary">{routeOptions.map((routeOption) => <option key={`${routeOption.from}|||${routeOption.to}`} value={`${routeOption.from}|||${routeOption.to}`}>{routeOption.from} → {routeOption.to}</option>)}</select>}{routeOptions.length === 1 && <div className="flex flex-wrap items-center gap-2 font-data text-[10px]"><span className="border border-primary/25 bg-card px-2 py-1">{selectedRoute?.from}</span><ArrowRight size={13} className="text-primary" /><span className="border border-primary/25 bg-card px-2 py-1">{selectedRoute?.to}</span></div>}<span className="text-[10px] text-muted-foreground">{routeOptions.length > 1 ? `${routeOptions.length} endpoint pair${routeOptions.length === 1 ? '' : 's'} available` : 'The source service is checking this pair'}</span></div>}
    {submitted && pathQuery.isLoading && <LoadingBlock rows={4} />}
    {submitted && pathQuery.isError && <ErrorBlock message="The path service could not complete this query." retry={() => pathQuery.refetch()} />}
    {result && !pathQuery.isLoading && <PathResultView result={result} />}
  </div>;
}

function PathInput({ label, value, setValue, testId, placeholder }: { label: string; value: string; setValue: (v: string) => void; testId: string; placeholder: string }) {
  return <label className="block"><span className="eyebrow mb-2 block text-muted-foreground">{label}</span><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} data-testid={testId} className="h-11 w-full border border-input bg-background px-3 font-data text-xs outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>;
}

function PathResultView({ result }: { result: any }) {
  if (!result.found) return <div className="border border-dashed border-border bg-card p-12 text-center" data-testid="status-path-not-found"><CircleAlert size={22} className="mx-auto mb-3 text-muted-foreground" /><h2 className="text-sm font-bold">No cited path found</h2><p className="mt-1 text-xs text-muted-foreground">These entities are not connected within the documented graph.</p></div>;
  return <section className="border border-border bg-card" data-testid="section-path-result"><div className="flex items-center justify-between border-b hairline px-5 py-4"><div><div className="eyebrow text-accent">Path located</div><h2 className="mt-1 text-sm font-bold">Shortest documented connection</h2></div><span className="font-data text-[10px] text-muted-foreground">{result.edges?.length || 0} RELATIONSHIPS</span></div><div className="overflow-x-auto p-5 sm:p-8"><div className="flex min-w-[560px] items-start">{result.nodes?.map((node: any, i: number) => <div key={node.id} className="flex flex-1 items-start"><Link href={`/entities/${node.id}`} data-testid={`link-path-node-${node.id}`} className="group w-full text-center"><SchemaMark schemaType={node.schemaType} size={48} /><div className="mt-3 text-xs font-bold group-hover:text-accent">{node.label}</div><div className="mt-1 font-data text-[9px] text-muted-foreground">{node.id}</div></Link>{i < result.nodes.length - 1 && <div className="mt-6 flex min-w-[90px] flex-1 items-center px-3"><div className="h-px flex-1 bg-accent" /><ArrowRight size={14} className="text-accent" /></div>}</div>)}</div><div className="mt-8 grid gap-3 border-t hairline pt-5 sm:grid-cols-2">{result.edges?.map((edge: any, i: number) => <div key={i} className="border-l-2 border-accent/50 pl-3"><div className="text-xs font-bold">{edge.relationshipType}</div><div className="mt-1 text-[10px] text-muted-foreground">{edge.confidence} confidence <span className="mx-1">·</span> {edge.citation?.publisher || 'Source citation'}</div><a href={edge.citation?.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"><ExternalLink size={11} /> {edge.citation?.title || 'Open source'}</a></div>)}</div></div></section>;
}

function Router() {
  const [route] = useLocation();
  return <AppShell><ErrorBoundary resetKey={route}><Switch><Route path="/" component={Dashboard} /><Route path="/search" component={SearchPage} /><Route path="/batch" component={BatchPage} /><Route path="/watchlists" component={WatchlistsPage} /><Route path="/cases/:id" component={CaseDetailPage} /><Route path="/cases" component={CasesPage} /><Route path="/sources" component={SourcesPage} /><Route path="/entities/:id" component={EntityPage} /><Route path="/paths" component={PathsPage} /><Route component={NotFound} /></Switch></ErrorBoundary></AppShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;