
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import { parseBookmarksHtml } from '@/lib/bookmarksParser';
import { z } from 'zod';

interface Link {
  id: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  categoryId?: string;
  tagIds?: string[];
  folderName?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

interface UploadBackupProps {
  onUpload: (links: Link[]) => void;
}

export const UploadBackup = ({ onUpload }: UploadBackupProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { addCategory, categories } = useCategories();

  const handleFileUpload = (file: File) => {
    const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    const isHtml = file.type === 'text/html' || file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');

    if (!isJson && !isHtml) {
      alert('Selecione um arquivo .json (backup) ou .html (bookmarks do navegador).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;

      // ---- HTML (Netscape Bookmark format from Chrome/Firefox/Edge) ----
      if (isHtml) {
        try {
          const bookmarks = parseBookmarksHtml(content);
          if (bookmarks.length === 0) {
            alert('Nenhum favorito encontrado no arquivo HTML.');
            return;
          }
          const mapped: Link[] = bookmarks.map((b, idx) => ({
            id: `import-${Date.now()}-${idx}`,
            title: b.title,
            url: b.url,
            createdAt: b.createdAt,
            folderName: b.folder,
          }));
          onUpload(mapped);
        } catch {
          alert('Erro ao ler o arquivo HTML de bookmarks.');
        }
        return;
      }

      // ---- JSON backup ----
      try {
        const raw = JSON.parse(content);

        const CategorySchema = z.object({
          id: z.string().optional(),
          name: z.string(),
          color: z.string().default('blue'),
          createdAt: z.string().optional(),
        });
        const LinkSchema = z.object({
          id: z.string(),
          title: z.string(),
          url: z.string(),
          description: z.string().optional(),
          createdAt: z.string().optional().default(new Date().toISOString()),
          categoryId: z.string().optional(),
          tagIds: z.array(z.string()).optional(),
          folderName: z.string().optional(),
          isFavorite: z.boolean().optional(),
          isPinned: z.boolean().optional(),
          isArchived: z.boolean().optional(),
        });
        const BackupSchema = z.object({
          links: z.array(LinkSchema),
          categories: z.array(CategorySchema).optional(),
        });

        let parsedLinks: Link[] = [];
        let parsedCategories: Category[] = [];

        if (Array.isArray(raw)) {
          const res = z.array(LinkSchema).safeParse(raw);
          if (!res.success) {
            alert('Formato de arquivo inválido. Verifique os campos dos links.');
            return;
          }
          parsedLinks = res.data as Link[];
        } else {
          const res = BackupSchema.safeParse(raw);
          if (!res.success) {
            alert('Formato de arquivo inválido. Verifique a estrutura do JSON.');
            return;
          }
          parsedLinks = res.data.links as Link[];
          parsedCategories = (res.data.categories || []) as Category[];
        }

        const existingByName = new Map<string, string>(
          categories.map(c => [c.name.toLowerCase(), c.id])
        );

        for (const cat of parsedCategories) {
          const key = cat.name.toLowerCase();
          if (!existingByName.has(key)) {
            const created = await addCategory(cat.name, cat.color);
            if (created) existingByName.set(key, created.id);
          }
        }

        const idToName = new Map<string, string>();
        for (const cat of parsedCategories) {
          if (cat.id) idToName.set(cat.id, cat.name);
        }

        const mappedLinks: Link[] = parsedLinks.map(l => {
          let mappedCategoryId: string | undefined = undefined;
          if (l.categoryId) {
            const name = idToName.get(l.categoryId);
            if (name) {
              const foundId = existingByName.get(name.toLowerCase());
              if (foundId) mappedCategoryId = foundId;
            }
          }
          return {
            id: l.id,
            title: l.title,
            url: l.url,
            description: l.description,
            createdAt: l.createdAt,
            categoryId: mappedCategoryId,
            tagIds: l.tagIds,
            folderName: l.folderName,
            isFavorite: l.isFavorite,
            isPinned: l.isPinned,
            isArchived: l.isArchived,
          };
        });

        onUpload(mappedLinks);
      } catch {
        alert('Erro ao ler o arquivo JSON. Verifique se o formato está correto.');
      }
    };
    reader.readAsText(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground hover:border-primary'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm mb-4">
          Arraste o arquivo aqui ou selecione
        </p>

        <Label htmlFor="backup-file" className="cursor-pointer">
          <Button variant="outline" asChild>
            <span>
              <Upload className="mr-2 h-4 w-4" />
              Selecionar Arquivo
            </span>
          </Button>
        </Label>

        <Input
          id="backup-file"
          type="file"
          accept=".json,.html,.htm"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      <p className="text-xs text-muted-foreground text-center border-2 border-foreground/20 rounded p-2 font-bold">
        ✅ <strong>JSON</strong> (backup deste app) ou <strong>HTML</strong> (favoritos exportados do Chrome/Firefox/Edge)
      </p>
    </div>
  );
};
