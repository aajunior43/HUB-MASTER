/**
 * JR Links API Client
 * Encaminha todas as operações para o Supabase mantendo a mesma interface
 * pública usada em toda a aplicação.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Link } from '@/types/link';
export type { Link } from '@/types/link';

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── helpers ─────────────────────────────────────────────────────────────
async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Não autenticado');
  return data.user.id;
}

function throwIfError<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function attachTagIds(links: Link[]): Promise<Link[]> {
  if (links.length === 0) return links;
  const ids = links.map((l) => l.id);
  const { data, error } = await supabase
    .from('link_tags')
    .select('link_id, tag_id')
    .in('link_id', ids);
  if (error) {
    console.error('[api] attachTagIds failed:', error);
    return links.map((l) => ({ ...l, tagIds: [] }));
  }
  const map = new Map<string, string[]>();
  (data || []).forEach((r: { link_id: string; tag_id: string }) => {
    const arr = map.get(r.link_id) || [];
    arr.push(r.tag_id);
    map.set(r.link_id, arr);
  });
  return links.map((l) => ({ ...l, tagIds: map.get(l.id) || [] }));
}

async function replaceLinkTags(link_id: string, tag_ids: string[]) {
  const { error } = await supabase.rpc('replace_link_tags', {
    _link_id: link_id,
    _tag_ids: tag_ids,
  });
  if (error) throw new Error(error.message);
}


export const api = {
  // Auth (delega para Supabase; o AuthProvider gerencia a sessão)
  auth: {
    async signIn(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return {
        access_token: data.session?.access_token ?? '',
        user: {
          id: data.user!.id,
          email: data.user!.email ?? '',
          full_name: (data.user!.user_metadata as { full_name?: string })?.full_name ?? '',
        } as User,
      };
    },
    async signUp(email: string, password: string, full_name = '') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name },
        },
      });
      if (error) throw new Error(error.message);
      return {
        access_token: data.session?.access_token ?? '',
        user: {
          id: data.user?.id ?? '',
          email: data.user?.email ?? email,
          full_name,
        } as User,
      };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async me(): Promise<User> {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('Não autenticado');
      return {
        id: data.user.id,
        email: data.user.email ?? '',
        full_name: (data.user.user_metadata as { full_name?: string })?.full_name ?? '',
      };
    },
  },


  // Links
  links: {
    async list(): Promise<Link[]> {
      const uid = await currentUserId();
      const rows = throwIfError(
        await supabase
          .from('links')
          .select('*')
          .eq('user_id', uid)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
      ) as Link[];
      return attachTagIds(rows);
    },

    async favoriteIds(): Promise<string[]> {
      const uid = await currentUserId();
      const rows = throwIfError(
        await supabase
          .from('links')
          .select('id')
          .eq('user_id', uid)
          .eq('is_favorite', true)
          .is('deleted_at', null)
      ) as Array<{ id: string }>;
      return rows.map((row) => row.id);
    },

    async create(data: {
      title: string;
      url: string;
      description?: string;
      category_id?: string;
      folder_id?: string;
      tag_ids?: string[];
      is_favorite?: boolean;
      is_pinned?: boolean;
    }): Promise<Link> {
      const uid = await currentUserId();
      const { tag_ids, ...rest } = data;
      const inserted = throwIfError(
        await supabase
          .from('links')
          .insert({ ...rest, user_id: uid })
          .select()
          .single()
      ) as Link;
      if (tag_ids && tag_ids.length) await replaceLinkTags(inserted.id, tag_ids);
      return { ...inserted, tagIds: tag_ids ?? [] };
    },

    async update(id: string, data: Partial<Link> & { tag_ids?: string[] }): Promise<Link> {
      const uid = await currentUserId();
      const { tag_ids, tagIds: _tagIds, id: _drop, user_id: _u, created_at: _c, updated_at: _up, ...rest } =
        data as Partial<Link> & { tag_ids?: string[] };
      const updated = throwIfError(
        await supabase
          .from('links')
          .update(rest)
          .eq('id', id)
          .eq('user_id', uid)
          .select()
          .single()
      ) as Link;
      if (tag_ids) await replaceLinkTags(id, tag_ids);
      const [withTags] = await attachTagIds([updated]);
      return withTags;
    },

    async delete(id: string, permanent = false) {
      const uid = await currentUserId();
      if (permanent) {
        throwIfError(
          await supabase.from('links').delete().eq('id', id).eq('user_id', uid)
        );
      } else {
        throwIfError(
          await supabase
            .from('links')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', uid)
        );
      }
    },


    async bulkCreate(
      links: Array<Partial<Link> & { title: string; url: string; tag_ids?: string[] }>
    ): Promise<Link[]> {
      const uid = await currentUserId();
      const payload = links.map(({ tag_ids: _t, tagIds: _domainTags, ...l }) => ({ ...l, user_id: uid }));
      const rows = throwIfError(
        await supabase.from('links').insert(payload).select()
      ) as Link[];
      // aplica tags de cada link em paralelo (RPC atômico)
      await Promise.all(
        rows.map((r, i) => {
          const tids = links[i]?.tag_ids;
          return tids && tids.length ? replaceLinkTags(r.id, tids) : Promise.resolve();
        })
      );
      return rows.map((r, i) => ({ ...r, tagIds: links[i]?.tag_ids ?? [] }));
    },

    async bulkDelete(ids: string[]) {
      if (ids.length === 0) return;
      const uid = await currentUserId();
      throwIfError(
        await supabase
          .from('links')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', ids)
          .eq('user_id', uid)
      );
    },

    async bulkPermanentDelete(ids: string[]) {
      if (ids.length === 0) return;
      const uid = await currentUserId();
      throwIfError(
        await supabase
          .from('links')
          .delete()
          .in('id', ids)
          .eq('user_id', uid)
      );
    },

    async bulkMoveToFolder(ids: string[], folderId: string | null) {
      if (ids.length === 0) return;
      const uid = await currentUserId();
      throwIfError(
        await supabase
          .from('links')
          .update({ folder_id: folderId })
          .in('id', ids)
          .eq('user_id', uid)
      );
    },

    async reorderPins(ids: string[]) {
      const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)('reorder_pinned_links', { _link_ids: ids });
      if (error) throw new Error(error.message);
    },

    async trash(): Promise<Link[]> {
      const uid = await currentUserId();
      const rows = throwIfError(
        await supabase
          .from('links')
          .select('*')
          .eq('user_id', uid)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })
      ) as Link[];
      return attachTagIds(rows);
    },

    async restore(id: string): Promise<Link> {
      const uid = await currentUserId();
      return throwIfError(
        await supabase
          .from('links')
          .update({ deleted_at: null })
          .eq('id', id)
          .eq('user_id', uid)
          .select()
          .single()
      ) as Link;
    },

    async toggleFavorite(id: string): Promise<Link> {
      const { data, error } = await supabase.rpc('toggle_link_favorite', { _link_id: id });
      if (error) throw new Error(error.message);
      return data as Link;
    },
  },


  // Categories
  categories: {
    async list(): Promise<Category[]> {
      const uid = await currentUserId();
      return throwIfError(
        await supabase.from('categories').select('*').eq('user_id', uid).order('name')
      ) as Category[];
    },
    async create(name: string, color = 'blue'): Promise<Category> {
      const uid = await currentUserId();
      return throwIfError(
        await supabase
          .from('categories')
          .insert({ name, color, user_id: uid })
          .select()
          .single()
      ) as Category;
    },
    async update(id: string, data: { name?: string; color?: string }): Promise<Category> {
      const uid = await currentUserId();
      return throwIfError(
        await supabase.from('categories').update(data).eq('id', id).eq('user_id', uid).select().single()
      ) as Category;
    },
    async delete(id: string) {
      const uid = await currentUserId();
      throwIfError(await supabase.from('categories').delete().eq('id', id).eq('user_id', uid));
    },
  },

  // Tags
  tags: {
    async list(): Promise<Tag[]> {
      const uid = await currentUserId();
      return throwIfError(
        await supabase.from('tags').select('*').eq('user_id', uid).order('name')
      ) as Tag[];
    },
    async create(name: string, color = '#3B82F6'): Promise<Tag> {
      const uid = await currentUserId();
      return throwIfError(
        await supabase.from('tags').insert({ name, color, user_id: uid }).select().single()
      ) as Tag;
    },
    async delete(id: string) {
      const uid = await currentUserId();
      throwIfError(await supabase.from('tags').delete().eq('id', id).eq('user_id', uid));
    },
  },

  // Folders
  folders: {
    async list(): Promise<Folder[]> {
      const uid = await currentUserId();
      return throwIfError(
        await supabase.from('folders').select('*').eq('user_id', uid).order('name')
      ) as Folder[];
    },
    async create(
      name: string,
      color = 'blue',
      icon = 'folder',
      parent_id?: string
    ): Promise<Folder> {
      const uid = await currentUserId();
      return throwIfError(
        await supabase
          .from('folders')
          .insert({ name, color, icon, parent_id: parent_id ?? null, user_id: uid })
          .select()
          .single()
      ) as Folder;
    },
    async delete(id: string) {
      const uid = await currentUserId();
      throwIfError(await supabase.from('folders').delete().eq('id', id).eq('user_id', uid));
    },
  },
};
