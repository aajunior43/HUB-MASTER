import { useState } from "react";

export default function PromptGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleGenerate = async () => {
    if (!apiKey) {
      alert("Insira sua API Key do Google Gemini");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Configuração da API do Google Gemini
      const genAI = {
        getGenerativeModel: () => ({
          generateContent: async (content) => {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: content[1].text
                  }]
                }]
              })
            });

            if (!response.ok) {
              throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();
            return {
              response: {
                text: () => data.candidates[0].content.parts[0].text
              }
            };
          }
        })
      };

      // Criar o modelo
      const model = genAI.getGenerativeModel();

      // Prompt do sistema
      const systemPrompt = `Você é um especialista em criação de prompts para LLMs. Sua tarefa é criar prompts detalhados e eficazes para obtenção de respostas de alta qualidade.`;

      // Prompt do usuário
      let userPrompt = customInput || 'Crie um prompt para tarefas de texto';
      userPrompt += `\n\nGere um prompt em português, detalhado e profissional. Inclua instruções claras e específicas.`;

      // Gerar o conteúdo
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt }
      ]);

      const response = await result.response;
      setGeneratedPrompt(response.text());
    } catch (error) {
      console.error('Erro:', error);
      setGeneratedPrompt("Erro ao gerar prompt. Verifique sua API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    alert("Copiado!");
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 10px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '15px' }}>
        <input
          type="password"
          placeholder="API Key do Google Gemini"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <textarea
          placeholder="O que você quer que o LLM faça?"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
        />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            padding: '10px 20px',
            fontSize: '15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.7 : 1
          }}
        >
          {isGenerating ? 'Gerando...' : 'Gerar'}
        </button>
      </div>

      {generatedPrompt && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ 
            padding: '12px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            backgroundColor: '#f9f9f9',
            marginBottom: '10px',
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            maxHeight: '250px',
            overflowY: 'auto'
          }}>
            {generatedPrompt}
          </div>
          <button
            onClick={handleCopy}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Copiar
          </button>
        </div>
      )}
    </div>
  );
}