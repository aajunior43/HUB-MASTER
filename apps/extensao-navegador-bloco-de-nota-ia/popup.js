// Elementos do DOM
const noteArea = document.getElementById('noteArea');
const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const saveKeyText = document.getElementById('saveKeyText');
const statusMessage = document.getElementById('statusMessage');

// Chave da API armazenada
let apiKey = localStorage.getItem('geminiApiKey') || '';

// Carregar API key salva ao abrir o popup
document.addEventListener('DOMContentLoaded', () => {
  if (apiKey) {
    apiKeyInput.value = '•'.repeat(20);
    apiKeyInput.type = 'password';
    saveKeyText.textContent = 'Limpar';
  }
  updateCounts();
});

// Mostrar mensagem de status
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;

  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

// Atualizar contadores
function updateCounts() {
  const text = noteArea.value;
  const charLength = text.length;
  const wordLength = text.trim() ? text.trim().split(/\s+/).length : 0;

  charCount.textContent = `${charLength.toLocaleString('pt-BR')} caractere${charLength !== 1 ? 's' : ''}`;
  wordCount.textContent = `${wordLength.toLocaleString('pt-BR')} palavra${wordLength !== 1 ? 's' : ''}`;
}

// Event listener para mudanças no textarea
noteArea.addEventListener('input', updateCounts);

// Limpar notas
clearBtn.addEventListener('click', () => {
  if (noteArea.value.trim() && confirm('Tem certeza que deseja limpar todas as notas?')) {
    noteArea.value = '';
    updateCounts();
    showStatus('Notas limpas!', 'success');
  }
});

// Salvar ou limpar API Key
saveKeyBtn.addEventListener('click', () => {
  if (apiKey) {
    // Limpar key existente
    if (confirm('Deseja remover a API Key salva?')) {
      localStorage.removeItem('geminiApiKey');
      apiKey = '';
      apiKeyInput.value = '';
      apiKeyInput.type = 'password';
      saveKeyText.textContent = 'Salvar';
      showStatus('API Key removida!', 'success');
    }
  } else {
    // Salvar nova key
    const newKey = apiKeyInput.value.trim();
    if (newKey) {
      if (newKey.length < 30) {
        showStatus('API Key inválida! Verifique e tente novamente.', 'error');
        return;
      }
      localStorage.setItem('geminiApiKey', newKey);
      apiKey = newKey;
      apiKeyInput.value = '•'.repeat(20);
      apiKeyInput.type = 'password';
      saveKeyText.textContent = 'Limpar';
      showStatus('API Key salva com sucesso!', 'success');
    } else {
      showStatus('Cole sua API Key do Gemini!', 'error');
    }
  }
});

// Função para gerar nome de arquivo com Gemini AI
async function generateFilenameWithAI(noteContent) {
  if (!apiKey) {
    throw new Error('API Key não configurada');
  }

  const prompt = `Analise o texto abaixo e crie um nome de arquivo curto, descritivo e profissional.

REGRAS:
- Máximo 40 caracteres
- Apenas letras, números, hífens ou underscores
- Sem espaços
- Sem extensão de arquivo
- Em português quando apropriado
- Responda APENAS o nome, nada mais

TEXTO:
${noteContent.substring(0, 800)}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 60,
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Erro da API:', errorData);
    throw new Error('Erro ao chamar API do Gemini');
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error('Resposta inválida da API');
  }

  const filename = data.candidates[0].content.parts[0].text.trim();

  // Limpar e validar o nome do arquivo
  const cleanFilename = filename
    .replace(/["'`]/g, '')
    .replace(/[^a-zA-Z0-9\-_àáâãèéêìíòóôõùúçÀ-ÿ]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .substring(0, 40);

  return cleanFilename || 'nota';
}

// Baixar notas como arquivo .txt com nome gerado por IA
downloadBtn.addEventListener('click', async () => {
  const notes = noteArea.value.trim();

  if (!notes) {
    showStatus('Não há notas para baixar!', 'error');
    return;
  }

  if (!apiKey) {
    showStatus('Configure sua API Key do Gemini primeiro!', 'error');
    apiKeyInput.focus();
    return;
  }

  try {
    // Desabilitar botão e mostrar loading
    downloadBtn.disabled = true;
    downloadBtn.classList.add('loading');
    showStatus('Gerando nome com IA...', 'info');

    // Gerar nome do arquivo com IA
    const aiFilename = await generateFilenameWithAI(notes);
    const filename = `${aiFilename}.txt`;

    // Criar blob e fazer download
    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Limpar
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    showStatus(`✓ Baixado como: ${filename}`, 'success');

  } catch (error) {
    console.error('Erro:', error);
    showStatus('Erro ao gerar nome. Verifique sua API Key.', 'error');
  } finally {
    // Reabilitar botão
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('loading');
  }
});

// Atalhos de teclado
noteArea.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + D para baixar
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    downloadBtn.click();
  }

  // Ctrl/Cmd + L para limpar
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault();
    clearBtn.click();
  }
});

// Focar automaticamente no textarea ao abrir
noteArea.focus();
