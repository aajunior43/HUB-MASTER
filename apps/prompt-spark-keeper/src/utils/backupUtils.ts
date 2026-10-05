
import JSZip from 'jszip';
import { Prompt } from '@/types/prompt';
import { sanitizeFilename, downloadTextFile } from './downloadUtils';

// Format prompt content for backup
const formatPromptForBackup = (prompt: Prompt): string => {
  const formattedDate = new Date(prompt.created_at).toLocaleString('pt-BR');
  const updatedDate = new Date(prompt.updated_at).toLocaleString('pt-BR');
  
  return `TÍTULO: ${prompt.title}

CATEGORIA: ${prompt.category}

TAGS: ${prompt.tags.join(', ')}

CONTEÚDO:
${prompt.content}

---
CRIADO EM: ${formattedDate}
ATUALIZADO EM: ${updatedDate}
VERSÃO: ${prompt.version}
ID: ${prompt.id}
`;
};

// Download all prompts as a single TXT file
export const downloadAllPromptsAsTxt = (prompts: Prompt[]): void => {
  if (prompts.length === 0) {
    return;
  }

  const header = `BACKUP DE PROMPTS
Data do backup: ${new Date().toLocaleString('pt-BR')}
Total de prompts: ${prompts.length}

${'='.repeat(80)}

`;

  const content = prompts
    .map((prompt, index) => {
      const separator = index === 0 ? '' : '\n' + '='.repeat(80) + '\n\n';
      return separator + formatPromptForBackup(prompt);
    })
    .join('');

  const fullContent = header + content;
  const filename = `backup_prompts_${new Date().toISOString().split('T')[0]}.txt`;
  
  downloadTextFile(fullContent, filename);
};

// Download all prompts as individual TXT files in a ZIP
export const downloadAllPromptsAsZip = async (prompts: Prompt[]): Promise<void> => {
  if (prompts.length === 0) {
    return;
  }

  const zip = new JSZip();
  
  // Create a folder for the prompts
  const promptsFolder = zip.folder('prompts');
  
  // Add each prompt as a separate file
  prompts.forEach((prompt, index) => {
    const sanitizedTitle = sanitizeFilename(prompt.title);
    const filename = `${(index + 1).toString().padStart(3, '0')}_${sanitizedTitle}.txt`;
    const content = formatPromptForBackup(prompt);
    
    promptsFolder?.file(filename, content);
  });

  // Add a summary file
  const summary = `RESUMO DO BACKUP
Data do backup: ${new Date().toLocaleString('pt-BR')}
Total de prompts: ${prompts.length}

LISTA DE PROMPTS:
${prompts.map((prompt, index) => 
  `${(index + 1).toString().padStart(3, '0')}. ${prompt.title} (${prompt.category})`
).join('\n')}
`;

  zip.file('RESUMO_BACKUP.txt', summary);

  // Generate and download the ZIP file
  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_prompts_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar arquivo ZIP:', error);
    throw new Error('Não foi possível gerar o arquivo ZIP');
  }
};
