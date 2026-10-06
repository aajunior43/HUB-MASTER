
import { useState } from 'react';
import { Download, FileArchive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Prompt } from '@/types/prompt';
import { downloadAllPromptsAsTxt, downloadAllPromptsAsZip } from '@/utils/backupUtils';
import { useToast } from '@/hooks/use-toast';

interface BackupButtonsProps {
  prompts: Prompt[];
}

export const BackupButtons = ({ prompts }: BackupButtonsProps) => {
  const [isDownloadingTxt, setIsDownloadingTxt] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const { toast } = useToast();

  const handleDownloadTxt = async () => {
    if (prompts.length === 0) {
      toast({
        title: "Nenhum prompt encontrado",
        description: "Não há prompts para fazer backup.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingTxt(true);
    try {
      downloadAllPromptsAsTxt(prompts);
      toast({
        title: "Backup concluído",
        description: `${prompts.length} prompts exportados para arquivo TXT.`,
      });
    } catch (error) {
      toast({
        title: "Erro no backup",
        description: "Não foi possível gerar o arquivo de backup.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingTxt(false);
    }
  };

  const handleDownloadZip = async () => {
    if (prompts.length === 0) {
      toast({
        title: "Nenhum prompt encontrado",
        description: "Não há prompts para fazer backup.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingZip(true);
    try {
      await downloadAllPromptsAsZip(prompts);
      toast({
        title: "Backup concluído",
        description: `${prompts.length} prompts exportados para arquivo ZIP.`,
      });
    } catch (error) {
      toast({
        title: "Erro no backup",
        description: "Não foi possível gerar o arquivo ZIP.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadTxt}
        disabled={isDownloadingTxt || prompts.length === 0}
        className="border-border hover:bg-accent"
      >
        {isDownloadingTxt ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isDownloadingTxt ? 'Exportando...' : 'Backup TXT'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadZip}
        disabled={isDownloadingZip || prompts.length === 0}
        className="border-border hover:bg-accent"
      >
        {isDownloadingZip ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileArchive className="w-4 h-4 mr-2" />
        )}
        {isDownloadingZip ? 'Compactando...' : 'Backup ZIP'}
      </Button>
    </div>
  );
};
