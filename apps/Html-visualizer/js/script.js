// Exemplo HTML padrão
const exampleHTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exemplo HTML</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
            margin-top: 0;
        }
        button {
            background: white;
            color: #667eea;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>🎉 Bem-vindo!</h1>
        <p>Este é um exemplo de HTML com CSS inline.</p>
        <p>Edite o código à esquerda e veja as mudanças em tempo real!</p>
        <button onclick="alert('Olá!')">Clique aqui</button>
    </div>
</body>
</html>`;

// Inicializar CodeMirror com Syntax Highlighting
const editor = CodeMirror.fromTextArea(document.getElementById('htmlInput'), {
    mode: 'htmlmixed',
    theme: 'dracula',
    lineNumbers: true,
    lineWrapping: true,
    autoCloseTags: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    // Mobile optimizations
    viewportMargin: window.innerWidth < 768 ? 10 : Infinity,
    scrollbarStyle: 'native'
});

// Empty state management
const emptyState = document.getElementById('emptyState');
const loadExampleBtn = document.getElementById('loadExampleBtn');

function checkEmptyState() {
    const content = editor.getValue().trim();
    if (content === '') {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

// Load example
loadExampleBtn.addEventListener('click', function() {
    editor.setValue(exampleHTML);
    toast.success('Exemplo carregado!', 'Agora você pode editar o código');
    checkEmptyState();
});

// Check empty state on load
checkEmptyState();

// Atualizar preview em tempo real com debounce para performance
let debounceTimer;
editor.on('change', function() {
    checkEmptyState();
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const htmlContent = editor.getValue();
        const iframe = document.getElementById('htmlOutput');
        iframe.srcdoc = htmlContent;
    }, 300); // 300ms debounce
});

// Formatação automática de código
document.getElementById('formatBtn').addEventListener('click', function() {
    const content = editor.getValue().trim();
    
    if (!content) {
        toast.warning('Editor vazio', 'Adicione algum código HTML para formatar');
        return;
    }
    
    formatHTML();
    toast.success('Código formatado!', 'Seu HTML foi identado automaticamente');
});

// Atalho Ctrl+Shift+F para formatar
editor.setOption('extraKeys', {
    'Ctrl-Shift-F': function() {
        const content = editor.getValue().trim();
        if (content) {
            formatHTML();
            toast.success('Código formatado!', 'Atalho: Ctrl+Shift+F');
        }
    }
});

function formatHTML() {
    const content = editor.getValue();
    const formatted = beautifyHTML(content);
    editor.setValue(formatted);
}

function beautifyHTML(html) {
    let formatted = '';
    let indent = 0;
    const tab = '  ';
    
    html.split(/>\s*</).forEach(function(node) {
        if (node.match(/^\/\w/)) indent--;
        formatted += tab.repeat(indent > 0 ? indent : 0) + '<' + node + '>\r\n';
        if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('input') && !node.startsWith('br') && !node.startsWith('img') && !node.startsWith('hr') && !node.startsWith('meta') && !node.startsWith('link')) {
            indent++;
        }
    });
    
    return formatted.substring(1, formatted.length - 3);
}

// Clear button with confirmation
document.getElementById('clearBtn').addEventListener('click', function() {
    const content = editor.getValue().trim();
    
    if (!content) {
        toast.info('Editor já está vazio', '');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar todo o código?\n\nEsta ação não pode ser desfeita.')) {
        editor.setValue('');
        toast.info('Editor limpo', 'Todo o código foi removido');
        checkEmptyState();
    }
});

// Preview Responsivo
const responsiveButtons = document.querySelectorAll('.responsive-btn');
const iframe = document.getElementById('htmlOutput');

responsiveButtons.forEach(button => {
    button.addEventListener('click', function() {
        // Remove active from all buttons
        responsiveButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        
        this.classList.add('active');
        this.setAttribute('aria-pressed', 'true');
        
        const size = this.getAttribute('data-size');
        iframe.className = '';
        
        // Only apply size classes on desktop (>= 1024px)
        if (window.innerWidth >= 1024) {
            if (size === 'tablet') {
                iframe.classList.add('tablet');
                toast.info('Preview: Tablet', 'Visualizando em 768x1024px');
            } else if (size === 'mobile') {
                iframe.classList.add('mobile');
                toast.info('Preview: Mobile', 'Visualizando em 375x667px');
            } else {
                toast.info('Preview: Desktop', 'Visualizando em tela cheia');
            }
        } else {
            toast.warning('Modo preview indisponível', 'Abra em uma tela maior para usar esta função');
        }
    });
});

// Handle window resize to reset preview modes on mobile
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.innerWidth < 1024) {
            iframe.className = '';
        }
    }, 250);
});

// Download HTML
document.getElementById('downloadBtn').addEventListener('click', function() {
    const htmlContent = editor.getValue().trim();
    
    if (!htmlContent) {
        toast.error('Nada para baixar', 'Adicione algum código HTML primeiro');
        return;
    }
    
    // Show loading toast
    const loadingToast = toast.info('Preparando download...', '', 0);
    
    setTimeout(() => {
        try {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            a.download = `html-export-${timestamp}.html`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Hide loading and show success
            toast.hide(loadingToast);
            toast.success('Download concluído!', `Arquivo: ${a.download}`);
        } catch (error) {
            toast.hide(loadingToast);
            toast.error('Erro no download', 'Tente novamente');
            console.error('Download error:', error);
        }
    }, 500);
});

// Keyboard shortcuts info
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + S to download
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('downloadBtn').click();
    }
});

// Show welcome toast on first load
setTimeout(() => {
    if (!editor.getValue().trim()) {
        toast.info('Bem-vindo! 👋', 'Cole seu HTML ou carregue um exemplo para começar', 5000);
    }
}, 1000);
