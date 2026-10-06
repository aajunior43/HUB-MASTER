
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Download, Upload, CheckSquare, Star, Grid3X3, List, AlignJustify, Search, SortAsc, SortDesc, LogOut, ScanSearch, Archive, RotateCcw, Filter, Bookmark, Copy, Check, Palette, Trash2, BarChart2, Wrench } from 'lucide-react';
import { useTheme } from 'next-themes';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddLinkForm } from '@/components/AddLinkForm';
import { LinkCard } from '@/components/LinkCard';
import { LinkListItem } from '@/components/LinkListItem';
import { LinkCompactRow } from '@/components/LinkCompactRow';
import { UploadBackup } from '@/components/UploadBackup';
import { EditLinkForm } from '@/components/EditLinkForm';
import { BulkActions } from '@/components/BulkActions';
import { VirtualizedLinkList } from '@/components/VirtualizedLinkList';
import { FilterPanel, type DateFilter } from '@/components/FilterPanel';
import { SwipeableRow } from '@/components/SwipeableRow';
import { StatsModal } from '@/components/StatsModal';
import { LinkToolsDialog, type AiLinkSuggestion } from '@/components/LinkToolsDialog';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { useFavorites } from '@/hooks/useFavorites';
import { useViewMode } from '@/hooks/useViewMode';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/api/client';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { EnhancedEmptyState } from '@/components/EnhancedEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useLinksKeyboardShortcuts } from '@/hooks/useLinksKeyboardShortcuts';
import { useFilteredLinks } from '@/hooks/useFilteredLinks';
import { useBrokenLinksChecker } from '@/hooks/useBrokenLinksChecker';
import { useLinkCounts } from '@/hooks/useLinkCounts';
import { useLinksBackup } from '@/hooks/useLinksBackup';
import { useTags } from '@/hooks/useTags';
import { useFolders } from '@/hooks/useFolders';
import { getLinkDomain, type Link, type UploadLink } from '@/types/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

const VISUAL_THEMES = [
  { value: 'neomorphism', label: 'Neomorfismo', icon: 'N' },
  { value: 'brutalism', label: 'Brutalism', icon: 'B' },
  { value: 'dark-ui', label: 'Dark UI', icon: 'D' },
  { value: 'claymorphism', label: 'Claymorphism', icon: 'C' },
  { value: 'immersive-3d', label: '3D Immersive', icon: '3D' },
  { value: 'retro', label: 'Retro', icon: 'R' },
  { value: 'y2k', label: 'Y2K', icon: 'Y2K' },
] as const;

// Tipos `Link` e `UploadLink` movidos para src/types/link.ts

const Index = () => {
  const [links, setLinks] = useState<Link[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'domain'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [domainFilter, setDomainFilter] = useState('');

  // brokenLinkIds/isCheckingLinks agora vêm de useBrokenLinksChecker
  const [showArchive, setShowArchive] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showBookmarkletDialog, setShowBookmarkletDialog] = useState(false);
  const [bookmarkletCopied, setBookmarkletCopied] = useState(false);
  const [quickAddUrl, setQuickAddUrl] = useState<string | undefined>(undefined);
  const [quickAddTitle, setQuickAddTitle] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrash, setShowTrash] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showMoveFolder, setShowMoveFolder] = useState(false);
  const pendingDeletes = useRef<Map<string, { link: Link; timer: ReturnType<typeof setTimeout> }>>(new Map());

  const { toast } = useToast();
  const { categories, getOrCreateCategory } = useCategories();
  const { tags, addTag } = useTags();
  const { folders, reloadFolders } = useFolders();
  const { favoriteIds } = useFavorites();
  const { viewMode, toggleViewMode } = useViewMode();
  const { selectedIds, isSelectionMode, toggleSelection, clearSelection, toggleSelectionMode } = useBulkOperations();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const activeTheme = theme === 'dark' ? 'neomorphism' : (theme ?? 'neomorphism');
  const isMobile = useIsMobile();
  const linksRef = useRef<Link[]>([]);
  useEffect(() => { linksRef.current = links; }, [links]);
  useEffect(() => {
    setLinks((current) => current.map((link) => ({
      ...link,
      is_favorite: favoriteIds.includes(link.id),
    })));
  }, [favoriteIds]);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('quick-add');
    const titleParam = params.get('title');
    if (urlParam || params.get('new') === '1') {
      setQuickAddUrl(urlParam);
      setQuickAddTitle(titleParam || undefined);
      setShowAddForm(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadLinks = useCallback(async () => {
    if (!user) return;
    const cacheKey = `offline-links:${user.id}`;
    try {
      const data = await api.links.list();
      setLinks(data || []);
      localStorage.setItem(cacheKey, JSON.stringify(data || []));
    } catch (error) {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]') as Link[];
        setLinks(cached);
        toast({ title: 'Modo offline', description: `${cached.length} links carregados do último acesso.` });
      } catch {
        toast({ title: "Erro ao carregar", description: "Não foi possível carregar seus links.", variant: "destructive" });
      }
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    setIsLoading(true);
    loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`links:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'links',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        clearTimeout(timer);
        timer = setTimeout(loadLinks, 350);
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [loadLinks, user]);

  useLinksKeyboardShortcuts({
    onFocusSearch: () => document.querySelector<HTMLInputElement>('input[placeholder*="Buscar"]')?.focus(),
    onNewLink: () => { setShowAddForm(true); setEditingLink(null); setShowUploadForm(false); },
    onToggleFavorites: () => setShowOnlyFavorites((v) => !v),
    onToggleView: toggleViewMode,
    onEscape: () => { setShowAddForm(false); setShowUploadForm(false); setEditingLink(null); clearSelection(); },
  });

  const visibleLinks = useFilteredLinks(links, {
    searchTerm, showOnlyFavorites, domainFilter, selectedCategoryId,
    selectedTagId, selectedFolderId, dateFilter, showArchive, showTrash, sortBy, sortOrder,
  });
  const hasActiveFilters = selectedCategoryId !== null || selectedTagId !== '' || selectedFolderId !== null || dateFilter !== 'all';

  const { brokenLinkIds, healthResults, isCheckingLinks, checkBrokenLinks } = useBrokenLinksChecker(links);

  const addLink = async (newLink: { title: string; url: string; description?: string; categoryId?: string; tagIds?: string[] }) => {
    if (!user) return;
    try {
      const data = await api.links.create({
        title: newLink.title,
        url: newLink.url,
        description: newLink.description || undefined,
        category_id: newLink.categoryId || undefined,
        tag_ids: newLink.tagIds || [],
      });
      setLinks(prev => [data, ...prev]);
      setShowAddForm(false);
      setQuickAddUrl(undefined);
      setQuickAddTitle(undefined);
      toast({ title: "Link adicionado", description: "Salvo com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar o link.", variant: "destructive" });
    }
  };

  const removeLink = useCallback(async (id: string) => {
    if (!user) return;
    const original = linksRef.current.find(l => l.id === id);
    if (!original) return;
    // Optimistic remove
    setLinks(prev => prev.filter(l => l.id !== id));
    const timer = setTimeout(async () => {
      try {
        await api.links.delete(id, false);
      } catch (error) {
        setLinks(prev => [original, ...prev]);
        toast({ title: "Erro ao excluir", variant: "destructive" });
      }
      pendingDeletes.current.delete(id);
    }, 5000);
    pendingDeletes.current.set(id, { link: original, timer });
    toast({
      title: "Link removido",
      action: (
        <ToastAction
          altText="Desfazer"
          onClick={() => {
            const pending = pendingDeletes.current.get(id);
            if (pending) {
              clearTimeout(pending.timer);
              pendingDeletes.current.delete(id);
              setLinks(prev => [pending.link, ...prev]);
            }
          }}
        >
          Desfazer
        </ToastAction>
      ),
    });
  }, [user, toast]);

  const editLink = async (updatedLink: Link) => {
    if (!user) return;
    try {
      await api.links.update(updatedLink.id, {
        title: updatedLink.title,
        url: updatedLink.url,
        description: updatedLink.description ?? undefined,
        category_id: updatedLink.category_id || undefined,
        tag_ids: updatedLink.tagIds || [],
      });
      setLinks(prev => prev.map(l => l.id === updatedLink.id ? updatedLink : l));
      setEditingLink(null);
      toast({ title: "Link atualizado" });
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleEditLink = useCallback((link: { id: string; title: string; url: string; createdAt: string; categoryId?: string; description?: string | null }) => {
    const existing = linksRef.current.find(l => l.id === link.id);
    setEditingLink({
      id: link.id, title: link.title, url: link.url,
      created_at: link.createdAt, updated_at: link.createdAt,
      category_id: link.categoryId ?? null,
      folder_id: existing?.folder_id ?? null,
      is_favorite: favoriteIds.includes(link.id),
      user_id: user?.id || '',
      is_archived: existing?.is_archived ?? false,
      is_pinned: existing?.is_pinned ?? false,
      deleted_at: existing?.deleted_at ?? null,
      description: link.description ?? existing?.description ?? null,
      tagIds: existing?.tagIds || [],
    });
    setShowAddForm(false);
    setShowUploadForm(false);
  }, [favoriteIds, user]);

  const optimisticUpdate = useCallback(async (id: string, optimistic: Partial<Link>, dbData: object) => {
    const original = linksRef.current.find(l => l.id === id);
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...optimistic } : l));
    try {
      await api.links.update(id, dbData as any);
    } catch (error) {
      if (original) {
        setLinks(prev => prev.map(l => l.id === id ? original : l));
        toast({ title: "Erro ao sincronizar", variant: "destructive" });
      }
    }
  }, [toast]);

  const archiveLink = useCallback((id: string) => {
    optimisticUpdate(id, { is_archived: true }, { is_archived: true });
    toast({ title: "Link arquivado" });
  }, [optimisticUpdate, toast]);

  const unarchiveLink = useCallback((id: string) => {
    optimisticUpdate(id, { is_archived: false }, { is_archived: false });
    toast({ title: "Link restaurado" });
  }, [optimisticUpdate, toast]);

  const pinLink = useCallback((id: string) => {
    optimisticUpdate(id, { is_pinned: true }, { is_pinned: true });
    toast({ title: "Link fixado no topo" });
  }, [optimisticUpdate, toast]);

  const unpinLink = useCallback((id: string) => {
    optimisticUpdate(id, { is_pinned: false }, { is_pinned: false });
    toast({ title: "Link desafixado" });
  }, [optimisticUpdate, toast]);

  const restoreFromTrash = useCallback(async (id: string) => {
    await optimisticUpdate(id, { deleted_at: null }, { deleted_at: null });
    toast({ title: "Link restaurado da lixeira" });
  }, [optimisticUpdate, toast]);

  const permanentDelete = useCallback(async (id: string) => {
    if (!user) return;
    setLinks(prev => prev.filter(l => l.id !== id));
    try { await api.links.delete(id, true); } catch { /* item already removed locally */ }
    toast({ title: "Link excluído permanentemente" });
  }, [user, toast]);

  const uploadLinks = async (uploadedLinks: UploadLink[]) => {
    if (!user) return;
    const normalize = (u: string) => {
      try { const obj = new URL(u.startsWith('http') ? u : `https://${u}`); return obj.hostname.replace('www.', '') + obj.pathname.replace(/\/$/, ''); }
      catch { return u; }
    };
    const existingUrls = new Set(links.map(l => normalize(l.url)));
    const newLinks = uploadedLinks.filter(l => !existingUrls.has(normalize(l.url)));
    if (newLinks.length === 0) { toast({ title: "Nenhum link novo" }); setShowUploadForm(false); return; }

    try {
      const folders = await api.folders.list();
      const folderByPath = new Map<string, string>();
      for (const folder of folders) folderByPath.set(folder.name.toLowerCase(), folder.id);

      const resolveFolder = async (folderPath?: string) => {
        if (!folderPath) return undefined;
        const segments = folderPath.split('/').map((part) => part.trim()).filter(Boolean);
        let parentId: string | undefined;
        let fullPath = '';
        for (const segment of segments) {
          fullPath = fullPath ? `${fullPath} / ${segment}` : segment;
          const key = fullPath.toLowerCase();
          let id = folderByPath.get(key);
          if (!id) {
            const created = await api.folders.create(segment, 'blue', 'folder', parentId);
            id = created.id;
            folderByPath.set(key, id);
          }
          parentId = id;
        }
        return parentId;
      };

      const payload = [];
      for (const link of newLinks) {
        payload.push({
          title: link.title,
          url: link.url,
          description: link.description,
          created_at: link.createdAt,
          category_id: link.categoryId || undefined,
          folder_id: await resolveFolder(link.folderName),
          tag_ids: link.tagIds ?? [],
          is_favorite: link.isFavorite ?? false,
          is_pinned: link.isPinned ?? false,
          is_archived: link.isArchived ?? false,
        });
      }
      const data = await api.links.bulkCreate(
        payload
      );
      setLinks(prev => [...data, ...prev]);
      setShowUploadForm(false);
      reloadFolders();
      toast({ title: "Importado!", description: `${newLinks.length} novos links importados.` });
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleUpdateLink = useCallback(async (linkId: string, updates: any) => {
    try {
      await api.links.update(linkId, updates);
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, ...updates } : l));
    } catch (error) {
      console.error('Error updating link:', error);
    }
  }, []);

  const { downloadBackup, downloadBackupHTML, exportSelection } = useLinksBackup(links, categories);

  const handleBulkDelete = async () => {
    if (!user) return;
    try {
      await api.links.bulkDelete(selectedIds);
      setLinks(prev => prev.filter(l => !selectedIds.includes(l.id)));
      toast({ title: `${selectedIds.length} links removidos` });
      clearSelection();
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleBulkExport = () => exportSelection(selectedIds);

  const moveSelectedToFolder = async (folderId: string | null) => {
    await api.links.bulkMoveToFolder(selectedIds, folderId);
    setLinks((current) => current.map((link) =>
      selectedIds.includes(link.id) ? { ...link, folder_id: folderId } : link));
    toast({ title: `${selectedIds.length} link(s) movido(s)` });
    clearSelection();
    setShowMoveFolder(false);
  };

  const mergeDuplicates = useCallback(async (keeper: Link, duplicates: Link[]) => {
    const duplicateIds = duplicates.map((link) => link.id);
    const merged: Link = {
      ...keeper,
      description: keeper.description || duplicates.find((link) => link.description)?.description || null,
      is_favorite: [keeper, ...duplicates].some((link) => link.is_favorite),
      is_pinned: [keeper, ...duplicates].some((link) => link.is_pinned),
      tagIds: Array.from(new Set([keeper, ...duplicates].flatMap((link) => link.tagIds ?? []))),
    };
    await api.links.update(keeper.id, {
      description: merged.description,
      is_favorite: merged.is_favorite,
      is_pinned: merged.is_pinned,
      tag_ids: merged.tagIds,
    });
    await api.links.bulkPermanentDelete(duplicateIds);
    setLinks((current) => current
      .filter((link) => !duplicateIds.includes(link.id))
      .map((link) => link.id === keeper.id ? merged : link));
    toast({ title: 'Duplicados mesclados', description: `${duplicateIds.length} cópia(s) removida(s).` });
  }, [toast]);

  const applyAiSuggestion = useCallback(async (link: Link, suggestion: AiLinkSuggestion) => {
    const category = suggestion.category
      ? await getOrCreateCategory(suggestion.category, 'purple')
      : null;
    const suggestedTags = [];
    for (const name of (suggestion.tags ?? []).slice(0, 5)) {
      const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
      const tag = existing ?? await addTag(name);
      if (tag) suggestedTags.push(tag.id);
    }
    const updates = {
      title: suggestion.title?.trim() || link.title,
      description: suggestion.description?.trim() || link.description,
      category_id: category?.id ?? link.category_id,
      tag_ids: Array.from(new Set([...(link.tagIds ?? []), ...suggestedTags])),
    };
    const updated = await api.links.update(link.id, updates);
    setLinks((current) => current.map((item) => item.id === link.id
      ? updated
      : item));
    toast({ title: 'Sugestão aplicada', description: 'Título, resumo, categoria e tags foram atualizados.' });
  }, [addTag, getOrCreateCategory, tags, toast]);

  const closeAllForms = () => { setShowAddForm(false); setShowUploadForm(false); setEditingLink(null); };

  const { favoriteCount, archivedCount, activeCount, trashCount, topDomains } = useLinkCounts(links);

  const bookmarkletCode = useMemo(
    () => `javascript:(function(){var a=window.location.origin+window.location.pathname;window.open(a+'?quick-add='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank','width=520,height=680');})();`,
    []
  );

  const handleCopyBookmarklet = useCallback(() => {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      setBookmarkletCopied(true);
      setTimeout(() => setBookmarkletCopied(false), 2000);
    });
  }, [bookmarkletCode]);

  return (
    <div className="app-shell h-screen flex flex-col overflow-hidden bg-background">

      {/* ── HEADER ── */}
      <header className="app-header shrink-0 z-30 border-b border-foreground/10">
        <div className="px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="brand-mark w-9 h-9 bg-gradient-to-br from-[hsl(var(--primary-glow))] to-accent rounded-xl flex items-center justify-center text-base shrink-0 shadow-neo-sm ring-1 ring-primary/20">
              📎
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-foreground tracking-tight leading-none">JR Links</h1>
              <p className="text-[10px] text-muted-foreground font-bold mt-0.5 leading-none">
                {isLoading ? '...' : (
                  <>
                    <span className="text-foreground font-black">{activeCount}</span>
                    <span> links</span>
                    {favoriteCount > 0 && <span className="text-accent ml-1">· {favoriteCount} ⭐</span>}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-black tracking-wide text-muted-foreground hover:text-foreground" title="Hub de ferramentas">
              <a href="/">HUB</a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex h-7 px-2 text-[11px] font-black tracking-wide text-muted-foreground hover:text-foreground" title="Cofre de chaves">
              <a href="/vault">COFRE</a>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  title="Escolher estilo visual"
                  aria-label="Escolher estilo visual"
                >
                  <Palette className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="theme-menu w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Estilo visual
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={activeTheme} onValueChange={setTheme}>
                  {VISUAL_THEMES.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value} className="theme-menu-item gap-2.5 rounded-lg">
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-md border border-border/40 bg-card px-1 text-[8px] font-black shadow-neo-sm">
                        {item.icon}
                      </span>
                      <span className="font-semibold">{item.label}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setShowBookmarkletDialog(true)} variant="ghost" size="sm" className="hidden sm:flex h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Bookmarklet">
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
            <div className="w-7 h-7 rounded-full bg-primary/90 shadow-neo-sm flex items-center justify-center text-[11px] font-black text-primary-foreground shrink-0 ml-1" title={user?.email}>
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <Button onClick={signOut} variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR (desktop only) ── */}
        <aside className="sidebar-panel hidden md:flex flex-col w-52 shrink-0 border-r border-border/20 bg-card/70 shadow-[8px_0_18px_hsl(var(--neo-dark)/0.45),inset_-1px_0_0_hsl(var(--neo-light)/0.18)] overflow-hidden">

          {/* Actions */}
          <div className="p-3 space-y-1.5 border-b-2 border-foreground/10 shrink-0">
            <Button
              onClick={() => { closeAllForms(); setShowAddForm(true); }}
              size="sm"
              className="w-full h-8 text-xs bg-accent text-accent-foreground justify-start gap-2"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Novo Link
              <kbd className="ml-auto text-[9px] opacity-50 font-mono">⌃N</kbd>
            </Button>
            <div className="flex gap-1.5">
              <Button onClick={() => { closeAllForms(); setShowUploadForm(true); }} variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1.5">
                <Upload className="h-3 w-3 shrink-0" /> Importar
              </Button>
              {links.length > 0 && (
                <>
                  <Button onClick={downloadBackup} variant="outline" size="sm" className="h-7 w-7 p-0 shrink-0" title="Exportar JSON">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button onClick={downloadBackupHTML} variant="outline" size="sm" className="h-7 px-2 shrink-0 text-[10px] font-bold" title="Exportar HTML (importar no browser)">
                    HTML
                  </Button>
                </>
              )}
            </div>
            {links.length > 0 && !showArchive && (
              <Button onClick={() => checkBrokenLinks()} variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5" disabled={isCheckingLinks}>
                <ScanSearch className="h-3 w-3 shrink-0" />
                {isCheckingLinks ? 'Verificando...' : '🔍 Verificar links'}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 divide-x-2 divide-foreground/10 border-b-2 border-foreground/10 shrink-0">
            <div className="py-2.5 px-1 text-center">
              <p className="text-lg font-black leading-none">{activeCount}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Links</p>
            </div>
            <div className="py-2.5 px-1 text-center">
              <p className="text-lg font-black leading-none text-yellow-500">{favoriteCount}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Favs</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-2 overflow-y-auto space-y-0.5">
            <p className="text-[9px] font-black tracking-widest text-muted-foreground uppercase px-2.5 pt-2 pb-1.5">Navegar</p>

            {[
              { label: 'Todos os links', icon: '📋', active: !showArchive && !showTrash, onClick: () => { setShowArchive(false); setShowTrash(false); }, count: activeCount },
              { label: 'Arquivo', icon: '🗄️', active: showArchive && !showTrash, onClick: () => { setShowArchive(true); setShowTrash(false); }, count: archivedCount },
              { label: 'Lixeira', icon: '🗑️', active: showTrash, onClick: () => { setShowTrash(true); setShowArchive(false); }, count: trashCount },
            ].map(item => (
              <button key={item.label} onClick={item.onClick}
                data-active={item.active}
                className={cn('sidebar-nav-item w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 text-xs font-bold',
                  item.active ? 'bg-primary text-primary-foreground shadow-neo-inset' : 'text-foreground/80 hover:bg-muted hover:shadow-neo-sm hover:text-foreground')}>
                <span className="shrink-0 text-sm leading-none">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                <span className={cn('text-[10px] tabular-nums shrink-0 font-normal', item.active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{item.count}</span>
              </button>
            ))}

            {/* Stats button */}
            <button onClick={() => setShowStats(true)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all duration-150 text-xs font-bold text-foreground/80 hover:bg-foreground/10 hover:text-foreground mt-1">
              <BarChart2 className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Estatísticas</span>
            </button>
            <button onClick={() => setShowTools(true)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all duration-150 text-xs font-bold text-foreground/80 hover:bg-foreground/10 hover:text-foreground">
              <Wrench className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Ferramentas</span>
            </button>

            {/* Collections */}
            {topDomains.length > 0 && (
              <>
                <p className="text-[9px] font-black tracking-widest text-muted-foreground uppercase px-2.5 pt-3 pb-1.5">Coleções</p>
                {topDomains.map(([domain, count]) => (
                  <button key={domain} onClick={() => setDomainFilter(domainFilter === domain ? '' : domain)}
                    className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 text-xs font-bold',
                      domainFilter === domain ? 'bg-accent text-accent-foreground shadow-neo-inset' : 'text-foreground/80 hover:bg-muted hover:shadow-neo-sm')}>
                    <span className="flex-1 truncate">{domain}</span>
                    <span className="text-[10px] tabular-nums shrink-0 font-normal text-muted-foreground">{count}</span>
                  </button>
                ))}
              </>
            )}
            {folders.length > 0 && (
              <>
                <p className="text-[9px] font-black tracking-widest text-muted-foreground uppercase px-2.5 pt-3 pb-1.5">Pastas</p>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 text-xs font-bold',
                      selectedFolderId === folder.id ? 'bg-primary text-primary-foreground shadow-neo-inset' : 'text-foreground/80 hover:bg-muted hover:shadow-neo-sm',
                    )}
                  >
                    <span>📁</span><span className="flex-1 truncate">{folder.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="content-column p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-5 space-y-4">

            {/* Mobile count + selection row */}
            {links.length > 0 && (
              <section className="md:hidden flex items-center gap-1.5">
                <span className="text-[11px] font-black text-muted-foreground">
                  <span className="text-foreground">{visibleLinks.length}</span>
                  {visibleLinks.length !== links.length && <span>/{links.length}</span>}
                  {showArchive && <span className="ml-1 text-foreground">• 🗄️ Arquivo</span>}
                  {showTrash && <span className="ml-1 text-muted-foreground">• 🗑️ Lixeira</span>}
                  {showOnlyFavorites && <span className="ml-1 text-yellow-500">• ⭐</span>}
                  {brokenLinkIds.size > 0 && <span className="ml-1 text-destructive">• ⚠️{brokenLinkIds.size}</span>}
                </span>
                <div className="flex-1" />
                <Button onClick={() => setShowStats(true)} variant="ghost" size="sm" className="hidden sm:flex h-6 w-6 p-0 text-muted-foreground" title="Estatísticas">
                  <BarChart2 className="h-3 w-3" />
                </Button>
                <Button onClick={() => setShowTools(true)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" title="Ferramentas">
                  <Wrench className="h-3 w-3" />
                </Button>
                {!showArchive && !showTrash && (
                  <Button onClick={toggleSelectionMode} variant={isSelectionMode ? 'default' : 'ghost'} size="sm" className="hidden sm:flex h-6 w-6 p-0">
                    <CheckSquare className="h-3 w-3" />
                  </Button>
                )}
                <Button onClick={() => setShowFilterPanel(v => !v)} variant={showFilterPanel || hasActiveFilters ? 'default' : 'ghost'} size="sm" className="h-6 w-6 p-0">
                  <Filter className="h-3 w-3" />
                </Button>
              </section>
            )}

            {/* Desktop toolbar */}
            {links.length > 0 && (
              <section className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-1.5 min-w-0 text-xs font-bold text-muted-foreground">
                  <span className="text-foreground font-black">{visibleLinks.length}</span>
                  {visibleLinks.length !== links.length && <span>de {links.length}</span>}
                  <span>links</span>
                  {showArchive && <span className="font-black">• 🗄️ Arquivo</span>}
                  {showOnlyFavorites && <span className="text-yellow-500 font-black">• ⭐ Favoritos</span>}
                  {brokenLinkIds.size > 0 && !showArchive && (
                    <span className="text-destructive font-black">• ⚠️ {brokenLinkIds.size} quebrados</span>
                  )}
                </div>
                <div className="flex-1" />
                {!showArchive && (
                  <>
                    <Button onClick={toggleSelectionMode} variant={isSelectionMode ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1.5 px-2.5">
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">{isSelectionMode ? 'Cancelar' : 'Selecionar'}</span>
                    </Button>
                    <Button onClick={() => setShowOnlyFavorites(v => !v)} variant={showOnlyFavorites ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1.5 px-2.5">
                      <Star className={`h-3.5 w-3.5 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                      <span className="hidden lg:inline">Favoritos</span>
                    </Button>
                  </>
                )}
                <Button onClick={() => setShowTools(true)} variant="ghost" size="sm" className="h-7 text-xs gap-1.5 px-2.5" title="Duplicados, monitoramento, IA e aplicativo">
                  <Wrench className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Ferramentas</span>
                </Button>
                <Button onClick={toggleViewMode} variant="ghost" size="sm" className="h-7 w-7 p-0" title={viewMode === 'grid' ? 'Mudar para lista' : viewMode === 'list' ? 'Mudar para compacto' : 'Mudar para grade'}>
                  {viewMode === 'grid' ? <List className="h-3.5 w-3.5" /> : viewMode === 'list' ? <AlignJustify className="h-3.5 w-3.5" /> : <Grid3X3 className="h-3.5 w-3.5" />}
                </Button>
              </section>
            )}

            {/* Search + sort + filters */}
            {links.length > 0 && (
              <section className="search-toolbar space-y-2 sticky top-0 z-20 bg-background/95 p-2.5 -mx-1 md:mx-0">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar links... (Ctrl+K)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm border-0 bg-input"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-base leading-none">×</button>
                    )}
                  </div>
                  <Button onClick={() => setShowFilterPanel(v => !v)} variant={showFilterPanel || hasActiveFilters ? 'default' : 'ghost'} size="sm" className="hidden md:flex h-8 w-8 p-0 shrink-0" title="Filtros">
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                  <div className="mobile-sort-row flex gap-0.5 sm:w-auto">
                    {(['date', 'title', 'domain'] as const).map(s => (
                      <Button key={s} variant={sortBy === s ? 'default' : 'ghost'} size="sm" className={`h-8 text-[10px] px-2 ${s !== 'date' ? 'hidden sm:inline-flex' : ''}`}
                        onClick={() => { if (sortBy === s) setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else setSortBy(s); }}>
                        {s === 'date' ? '📅' : s === 'title' ? 'A-Z' : '🌐'}
                        {sortBy === s && (sortOrder === 'asc' ? <SortAsc className="h-2.5 w-2.5 ml-0.5" /> : <SortDesc className="h-2.5 w-2.5 ml-0.5" />)}
                      </Button>
                    ))}
                  </div>
                </div>
                {showFilterPanel && (
                  <FilterPanel
                    categories={categories}
                    tags={tags}
                    selectedCategoryId={selectedCategoryId}
                    selectedTagId={selectedTagId}
                    onCategoryChange={setSelectedCategoryId}
                    onTagChange={setSelectedTagId}
                    dateFilter={dateFilter}
                    onDateFilterChange={setDateFilter}
                  />
                )}
              </section>
            )}

            {/* Forms */}
            {showAddForm && (
              <Card>
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Adicionar Novo Link</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0">
                  <AddLinkForm
                    onSubmit={addLink}
                    onCancel={() => { setShowAddForm(false); setQuickAddUrl(undefined); setQuickAddTitle(undefined); }}
                    existingLinks={links.map(l => ({ id: l.id, title: l.title, url: l.url, category_id: l.category_id }))}
                    initialUrl={quickAddUrl}
                    initialTitle={quickAddTitle}
                  />
                </CardContent>
              </Card>
            )}
            {editingLink && (
              <Card>
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Editar Link</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0">
                  <EditLinkForm link={editingLink} onSubmit={editLink} onCancel={() => setEditingLink(null)} />
                </CardContent>
              </Card>
            )}
            {showUploadForm && (
              <Card>
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Importar Backup</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0">
                  <UploadBackup onUpload={uploadLinks} />
                  <div className="flex justify-end mt-3">
                    <Button variant="outline" size="sm" onClick={() => setShowUploadForm(false)} className="text-xs">Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trash view */}
            {showTrash && !isLoading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-black">Lixeira</span>
                  <span className="text-xs text-muted-foreground ml-1">({trashCount} itens)</span>
                  {trashCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={async () => {
                        if (!user) return;
                        const ids = links.filter(l => !!l.deleted_at).map(l => l.id);
                        const removed = links.filter(l => ids.includes(l.id));
                        setLinks(prev => prev.filter(l => !l.deleted_at));
                        try {
                          await api.links.bulkPermanentDelete(ids);
                          toast({ title: `${ids.length} links excluídos permanentemente` });
                        } catch {
                          setLinks(prev => [...removed, ...prev]);
                          toast({ title: 'Erro ao esvaziar a lixeira', variant: 'destructive' });
                        }
                      }}
                    >
                      Esvaziar lixeira
                    </Button>
                  )}
                </div>
                {visibleLinks.length === 0 ? (
                  <Card className="text-center py-12 border-dashed">
                    <CardContent className="p-6">
                      <p className="text-4xl mb-3">🗑️</p>
                      <p className="text-lg font-black mb-2">Lixeira vazia</p>
                      <p className="text-muted-foreground text-sm">Nenhum link na lixeira.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-1.5">
                    {visibleLinks.map(link => (
                      <div key={link.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-foreground/20 bg-card opacity-70">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate line-through text-muted-foreground">{link.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                          {link.deleted_at && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Excluído em {new Date(link.deleted_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs shrink-0 gap-1" onClick={() => restoreFromTrash(link.id)}>
                          <RotateCcw className="h-3 w-3" /> Restaurar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => permanentDelete(link.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Links grid / list */}
            <main className={showTrash ? 'hidden' : ''}>
              {isLoading ? (
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-card border-2 border-foreground/10 rounded-lg p-2.5 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : links.length === 0 ? (
                showArchive ? (
                  <Card className="text-center py-12 border-dashed">
                    <CardContent className="p-6">
                      <p className="text-lg font-black mb-2">Arquivo vazio</p>
                      <p className="text-muted-foreground text-sm">Nenhum link arquivado.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <EnhancedEmptyState onAddLink={() => setShowAddForm(true)} onImportBackup={() => setShowUploadForm(true)} />
                )
              ) : visibleLinks.length === 0 ? (
                <Card className="text-center py-12 border-dashed">
                  <CardContent className="p-6">
                    <p className="text-lg font-black mb-2">Nenhum resultado</p>
                    <p className="text-muted-foreground text-sm mb-4">
                      {searchTerm ? `Nada encontrado para "${searchTerm.substring(0, 30)}"` : 'Nenhum link nesta visualização'}
                    </p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {searchTerm && <Button onClick={() => setSearchTerm('')} variant="outline" size="sm">Limpar Busca</Button>}
                      {showOnlyFavorites && <Button onClick={() => setShowOnlyFavorites(false)} variant="outline" size="sm">Ver Todos</Button>}
                      {domainFilter && <Button onClick={() => setDomainFilter('')} variant="outline" size="sm">Limpar Filtro</Button>}
                      {hasActiveFilters && <Button onClick={() => { setSelectedCategoryId(null); setSelectedTagId(''); setSelectedFolderId(null); setDateFilter('all'); }} variant="outline" size="sm">Limpar Filtros</Button>}
                    </div>
                  </CardContent>
                </Card>
              ) : (() => {
                const rawPinned = visibleLinks.filter(l => l.is_pinned);
                const pinned = [...rawPinned].sort((a, b) =>
                  (a.pin_position ?? Number.MAX_SAFE_INTEGER) - (b.pin_position ?? Number.MAX_SAFE_INTEGER));
                const unpinned = visibleLinks.filter(l => !l.is_pinned);

                const linkProps = (link: typeof visibleLinks[0]) => ({
                  link: { ...link, createdAt: link.created_at, categoryId: link.category_id, description: link.description },
                  onRemove: removeLink, onEdit: handleEditLink, onUpdate: handleUpdateLink,
                  onArchive: !showArchive ? archiveLink : undefined,
                  onUnarchive: showArchive ? unarchiveLink : undefined,
                  onPin: !showArchive && !link.is_pinned ? pinLink : undefined,
                  onUnpin: !showArchive && link.is_pinned ? unpinLink : undefined,
                  isSelected: selectedIds.includes(link.id), isSelectionMode,
                  onToggleSelection: () => toggleSelection(link.id),
                  isBroken: brokenLinkIds.has(link.id), isArchived: showArchive,
                });

                const handleDragEnd = (event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  const oldIdx = pinned.findIndex(l => l.id === active.id);
                  const newIdx = pinned.findIndex(l => l.id === over.id);
                  if (oldIdx === -1 || newIdx === -1) return;
                  const reordered = arrayMove(pinned, oldIdx, newIdx);
                  setLinks((current) => current.map((link) => {
                    const position = reordered.findIndex((item) => item.id === link.id);
                    return position >= 0 ? { ...link, pin_position: position } : link;
                  }));
                  api.links.reorderPins(reordered.map((link) => link.id)).catch(() => {
                    toast({ title: 'Erro ao salvar a ordem', variant: 'destructive' });
                    loadLinks();
                  });
                };

                const pinnedSection = (renderFn: (l: typeof visibleLinks[0]) => React.ReactNode, listClass: string) =>
                  pinned.length > 0 ? (
                    <div>
                      <p className="text-[9px] font-black tracking-widest text-muted-foreground uppercase mb-2 flex items-center gap-1">
                        📌 Fixados <span className="text-foreground/40 font-normal">· arraste para reordenar</span>
                      </p>
                      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={pinned.map(l => l.id)} strategy={verticalListSortingStrategy}>
                          <div className={listClass}>{pinned.map(l => renderFn(l))}</div>
                        </SortableContext>
                      </DndContext>
                      {unpinned.length > 0 && <div className="border-t-2 border-foreground/10 mt-3" />}
                    </div>
                  ) : null;

                if (viewMode === 'grid') {
                  const gridClass = "grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";
                  const renderCard = (link: typeof visibleLinks[0]) => (
                    <LinkCard key={link.id} {...linkProps(link)} />
                  );
                  return (
                    <div key="grid" className="space-y-3">
                      {pinnedSection(renderCard, `${gridClass}`)}
                      {unpinned.length > 0 && <div className={gridClass} style={{ gridAutoRows: '1fr' }}>{unpinned.map(renderCard)}</div>}
                    </div>
                  );
                }

                if (viewMode === 'compact') {
                  const renderCompact = (link: typeof visibleLinks[0]) => (
                    <SwipeableRow
                      key={link.id}
                      onSwipeLeft={!showArchive ? () => archiveLink(link.id) : () => unarchiveLink(link.id)}
                      onSwipeRight={undefined}
                      rightLabel={showArchive ? 'Restaurar' : 'Arquivar'}
                      leftLabel=""
                      disabled={isSelectionMode}
                    >
                      <LinkCompactRow key={link.id} {...{ ...linkProps(link), link: { ...link, createdAt: link.created_at, categoryId: link.category_id ?? undefined, description: link.description } }} />
                    </SwipeableRow>
                  );
                  return (
                    <div key="compact" className="space-y-3">
                      {pinnedSection(renderCompact, "space-y-0.5")}
                      {unpinned.length > 0 && <div className="space-y-0.5">{unpinned.map(renderCompact)}</div>}
                    </div>
                  );
                }

                // list view
                if (visibleLinks.length > 100 && !isMobile) {
                  return (
                    <VirtualizedLinkList
                      links={visibleLinks}
                      onRemove={removeLink} onEdit={handleEditLink} onUpdate={handleUpdateLink}
                      isSelectionMode={isSelectionMode} selectedIds={selectedIds}
                      onToggleSelection={toggleSelection}
                      height={Math.min(window.innerHeight - 280, visibleLinks.length * 92)}
                      rowHeight={92}
                    />
                  );
                }
                const renderItem = (link: typeof visibleLinks[0]) => (
                  <SwipeableRow
                    key={link.id}
                    onSwipeLeft={!showArchive ? () => archiveLink(link.id) : () => unarchiveLink(link.id)}
                    onSwipeRight={undefined}
                    rightLabel={showArchive ? 'Restaurar' : 'Arquivar'}
                    leftLabel=""
                    disabled={isSelectionMode}
                  >
                    <LinkListItem key={link.id} {...{ ...linkProps(link), link: { ...link, createdAt: link.created_at, categoryId: link.category_id ?? undefined, description: link.description ?? undefined } }} />
                  </SwipeableRow>
                );
                return (
                  <div key="list" className="space-y-3">
                    {pinnedSection(renderItem, "space-y-1.5")}
                    {unpinned.length > 0 && <div className="space-y-1.5">{unpinned.map(renderItem)}</div>}
                  </div>
                );
              })()}
            </main>

            <BulkActions
              selectedCount={selectedIds.length}
              onDeleteSelected={handleBulkDelete}
              onExportSelected={handleBulkExport}
              onCheckSelected={() => checkBrokenLinks(selectedIds)}
              onMoveToFolder={() => setShowMoveFolder(true)}
              onClearSelection={clearSelection}
              isVisible={isSelectionMode}
            />

            {/* Bookmarklet dialog */}
            <Dialog open={showBookmarkletDialog} onOpenChange={setShowBookmarkletDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>🔖 Bookmarklet</DialogTitle>
                  <DialogDescription>Salve links de qualquer página com um clique no favorito do seu navegador.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-bold">Como usar:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Copie o código abaixo</li>
                      <li>Crie um favorito no navegador</li>
                      <li>Cole o código como URL do favorito</li>
                      <li>Em qualquer página, clique no favorito para salvar</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Código do Bookmarklet</p>
                    <code className="block text-[10px] font-mono bg-muted border-2 border-foreground rounded-md p-2.5 break-all leading-relaxed">
                      {bookmarkletCode}
                    </code>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowBookmarkletDialog(false)}>Fechar</Button>
                  <Button onClick={handleCopyBookmarklet} className="gap-2">
                    {bookmarkletCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {bookmarkletCopied ? 'Copiado!' : 'Copiar código'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showMoveFolder} onOpenChange={setShowMoveFolder}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Mover links</DialogTitle>
                  <DialogDescription>Escolha a pasta de destino para {selectedIds.length} link(s).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <Button variant="outline" onClick={() => moveSelectedToFolder(null)}>Sem pasta</Button>
                  {folders.map((folder) => (
                    <Button key={folder.id} variant="outline" onClick={() => moveSelectedToFolder(folder.id)} className="justify-start">
                      📁 {folder.name}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </div>

      <StatsModal open={showStats} onClose={() => setShowStats(false)} links={links} />
      <LinkToolsDialog
        open={showTools}
        onOpenChange={setShowTools}
        links={links}
        healthResults={healthResults}
        isCheckingLinks={isCheckingLinks}
        onCheckLinks={checkBrokenLinks}
        onMergeDuplicates={mergeDuplicates}
        onApplyAiSuggestion={applyAiSuggestion}
      />

      {/* Mobile bottom nav */}
      <MobileBottomNav
        showArchive={showArchive}
        onShowAll={() => { setShowArchive(false); setShowOnlyFavorites(false); }}
        showOnlyFavorites={showOnlyFavorites}
        onToggleFavorites={() => { setShowOnlyFavorites(v => !v); setShowArchive(false); }}
        onAddLink={() => { closeAllForms(); setShowAddForm(true); }}
        viewMode={viewMode}
        onToggleView={toggleViewMode}
        activeCount={activeCount}
      />

    </div>
  );
};

export default Index;
