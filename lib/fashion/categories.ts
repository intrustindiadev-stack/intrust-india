import { createStaticSupabaseClient } from '../supabaseServer';
import { CategoryMetadata } from '../validation/fashion';

export type CategoryNode = CategoryMetadata & {
  children?: CategoryNode[];
};

export async function getCategoryByPath(pathArray: string[]): Promise<CategoryMetadata | null> {
  const path = pathArray.join('/');
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('fashion_categories')
    .select('*')
    .eq('path', path)
    .eq('is_visible', true)
    .single();

  if (error || !data) return null;
  return data as CategoryMetadata;
}

export async function getCategoryAncestors(pathArray: string[]): Promise<CategoryMetadata[]> {
  if (pathArray.length === 0) return [];
  const paths: string[] = [];
  let current = '';
  for (const segment of pathArray) {
    current = current ? `${current}/${segment}` : segment;
    paths.push(current);
  }
  
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('fashion_categories')
    .select('*')
    .in('path', paths)
    .order('level', { ascending: true });

  if (error) return [];
  return data as CategoryMetadata[];
}

export async function getCategoryDescendants(parentId: string): Promise<CategoryMetadata[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('fashion_categories')
    .select('*')
    .eq('parent_id', parentId)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error) return [];
  return data as CategoryMetadata[];
}

export async function getMegaMenuCategories(): Promise<CategoryNode[]> {
  const supabase = createStaticSupabaseClient();
  // Fetch up to L3 for mega menu
  const { data, error } = await supabase
    .from('fashion_categories')
    .select('*')
    .eq('is_visible', true)
    .lte('level', 3)
    .order('level', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error || !data) return [];

  // Build tree
  const idMap = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const item of data) {
    idMap.set(item.id, { ...item, children: [] });
  }

  for (const item of data) {
    const node = idMap.get(item.id)!;
    if (item.parent_id && idMap.has(item.parent_id)) {
      idMap.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
