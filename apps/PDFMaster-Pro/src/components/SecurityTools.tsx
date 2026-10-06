'use client';

import { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Shield, 
  Key, 
  FileText, 
  Stamp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface SecurityToolsProps {
  pdfFile: File | null;
}

export default function SecurityTools({ pdfFile }: SecurityToolsProps) {
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [permissions, setPermissions] = useState({
    print: true,
    copy: true,
    edit: true,
    annotate: true
  });

  const handlePasswordProtection = () => {
    if (password !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    
    if (password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    setIsProtected(true);
    console.log('Aplicando proteção por senha:', password);
    // Here you would implement actual password protection
  };

  const handleRemoveProtection = () => {
    setIsProtected(false);
    setPassword('');
    setConfirmPassword('');
    console.log('Removendo proteção por senha');
  };

  const handleWatermark = () => {
    if (!watermarkText.trim()) {
      alert('Digite o texto da marca d\'água!');
      return;
    }
    
    console.log('Aplicando marca d\'água:', watermarkText);
    // Here you would implement watermark functionality
  };

  const handleRedaction = () => {
    console.log('Iniciando modo de redação');
    // Here you would implement redaction functionality
  };

  const handlePermissions = () => {
    console.log('Aplicando permissões:', permissions);
    // Here you would implement permissions functionality
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Shield className="h-6 w-6 text-blue-600 mr-2" />
        Segurança e Proteção
      </h2>

      {/* Password Protection */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <Lock className="h-5 w-5 text-gray-600 mr-2" />
          Proteção por Senha
        </h3>

        {!isProtected ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite uma senha segura"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirme a senha"
              />
            </div>

            <button
              onClick={handlePasswordProtection}
              disabled={!pdfFile || !password || !confirmPassword}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Aplicar Proteção por Senha
            </button>
          </div>
        ) : (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-green-700 font-medium mb-4">PDF protegido por senha</p>
            <button
              onClick={handleRemoveProtection}
              className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Remover Proteção
            </button>
          </div>
        )}
      </div>

      {/* Permissions */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <Key className="h-5 w-5 text-gray-600 mr-2" />
          Controle de Permissões
        </h3>

        <div className="space-y-3">
          {Object.entries(permissions).map(([key, value]) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setPermissions(prev => ({
                  ...prev,
                  [key]: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700 capitalize">
                {key === 'print' && 'Permitir impressão'}
                {key === 'copy' && 'Permitir cópia de texto'}
                {key === 'edit' && 'Permitir edição'}
                {key === 'annotate' && 'Permitir anotações'}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={handlePermissions}
          disabled={!pdfFile}
          className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Aplicar Permissões
        </button>
      </div>

      {/* Watermark */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <Stamp className="h-5 w-5 text-gray-600 mr-2" />
          Marca d'Água
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texto da Marca d'Água
            </label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: CONFIDENCIAL, RASCUNHO, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opacidade
              </label>
              <input
                type="range"
                min="10"
                max="100"
                defaultValue="30"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamanho
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option>Pequeno</option>
                <option>Médio</option>
                <option>Grande</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleWatermark}
            disabled={!pdfFile || !watermarkText.trim()}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Aplicar Marca d'Água
          </button>
        </div>
      </div>

      {/* Redaction */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <FileText className="h-5 w-5 text-gray-600 mr-2" />
          Redação de Informações Sensíveis
        </h3>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> A redação remove permanentemente informações do documento. 
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Use esta ferramenta para ocultar permanentemente informações confidenciais como 
          números de documentos, endereços, ou dados pessoais.
        </p>

        <button
          onClick={handleRedaction}
          disabled={!pdfFile}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Iniciar Modo de Redação
        </button>
      </div>

      {/* Security Status */}
      {pdfFile && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Status de Segurança</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              {isProtected ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
              )}
              <span className={isProtected ? 'text-green-700' : 'text-yellow-700'}>
                {isProtected ? 'Protegido por senha' : 'Sem proteção por senha'}
              </span>
            </div>
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-gray-700">Processamento 100% local e seguro</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}