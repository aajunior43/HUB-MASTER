#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask Web Server Wrapper for Bank Statement Organizer
Exposes the organizer functionality as REST API endpoints
Enhanced with security, validation, and async processing
"""

from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
from functools import wraps
import os
import sys
import json
import tempfile
import logging
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Tuple
from logging.handlers import RotatingFileHandler

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Add utils directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))
from relatorio_manager import relatorio_manager

# Import config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'config'))
import config

app = Flask(__name__)

# Configurações de segurança
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'ofx'}

# CORS com restrições
CORS(app, resources={
    r"/api/*": {
        "origins": os.environ.get('ALLOWED_ORIGINS', '*').split(','),
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization", "X-API-Key"]
    }
})

# ===========================================
# LOGGING CONFIGURATION
# ===========================================
def setup_logging():
    """Configura logging estruturado para API"""
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)

    handler = RotatingFileHandler(
        log_dir / 'api.log',
        maxBytes=10*1024*1024,
        backupCount=10,
        encoding='utf-8'
    )

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)

    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

setup_logging()

# ===========================================
# RATE LIMITING
# ===========================================
class RateLimiter:
    """Simple in-memory rate limiter"""
    def __init__(self):
        self.requests = {}  # {ip: [(timestamp, count)]}
        self.window = 60  # 1 minuto
        self.max_requests = 60  # 60 requests por minuto

    def is_allowed(self, identifier: str) -> Tuple[bool, Optional[str]]:
        """Verifica se request é permitido"""
        now = time.time()

        # Limpa requests antigos
        if identifier in self.requests:
            self.requests[identifier] = [
                (ts, count) for ts, count in self.requests[identifier]
                if now - ts < self.window
            ]

        # Conta requests no window
        request_count = sum(count for _, count in self.requests.get(identifier, []))

        if request_count >= self.max_requests:
            retry_after = int(self.window - (now - self.requests[identifier][0][0]))
            return False, f"Rate limit exceeded. Retry after {retry_after} seconds"

        # Adiciona request atual
        if identifier not in self.requests:
            self.requests[identifier] = []
        self.requests[identifier].append((now, 1))

        return True, None

rate_limiter = RateLimiter()

# ===========================================
# AUTHENTICATION
# ===========================================
# API Keys (em produção, use banco de dados)
API_KEYS = {
    os.environ.get('API_KEY', 'dev_key_12345'): {
        'name': 'Default Key',
        'permissions': ['read', 'write', 'admin']
    }
}

def require_api_key(f):
    """Decorator para exigir API key"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')

        if not api_key:
            app.logger.warning(f"Request sem API key de {request.remote_addr}")
            return jsonify({
                "success": False,
                "error": "API key required",
                "message": "Please provide X-API-Key header"
            }), 401

        if api_key not in API_KEYS:
            app.logger.warning(f"API key inválida de {request.remote_addr}")
            return jsonify({
                "success": False,
                "error": "Invalid API key"
            }), 403

        # Armazena info do usuário no contexto
        g.api_key_info = API_KEYS[api_key]

        return f(*args, **kwargs)

    return decorated_function

def rate_limit(f):
    """Decorator para rate limiting"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        identifier = request.remote_addr

        allowed, message = rate_limiter.is_allowed(identifier)

        if not allowed:
            app.logger.warning(f"Rate limit excedido para {identifier}")
            return jsonify({
                "success": False,
                "error": "Rate limit exceeded",
                "message": message
            }), 429

        return f(*args, **kwargs)

    return decorated_function

# ===========================================
# REQUEST ID TRACKING
# ===========================================
@app.before_request
def before_request():
    """Adiciona request ID para tracking"""
    g.request_id = secrets.token_hex(8)
    g.start_time = time.time()

@app.after_request
def after_request(response):
    """Log de request e adiciona headers"""
    if hasattr(g, 'request_id'):
        response.headers['X-Request-ID'] = g.request_id

        # Log da request
        duration = time.time() - g.start_time
        app.logger.info(
            f"{request.method} {request.path} - "
            f"Status: {response.status_code} - "
            f"Duration: {duration:.3f}s",
            extra={'request_id': g.request_id}
        )

    return response

# ===========================================
# INPUT VALIDATION
# ===========================================
def validate_directory(path: str) -> Tuple[bool, Optional[str]]:
    """Valida path de diretório"""
    if not path:
        return False, "Directory path is required"

    # Verifica path traversal
    if '..' in path or path.startswith('/'):
        return False, "Invalid directory path"

    # Normaliza path
    normalized = os.path.normpath(path)

    return True, normalized

def allowed_file(filename: str) -> bool:
    """Verifica se extensão de arquivo é permitida"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# ===========================================
# GLOBAL ORGANIZER
# ===========================================
organizer_cache = {}

def get_organizer(source_dir: str = None, dest_dir: str = None):
    """Get or create organizer instance with caching"""
    try:
        from organizador_local_avancado import OrganizadorLocalAvancado

        source = source_dir or config.DIRETORIO_BASE_PADRAO
        dest = dest_dir or config.DIRETORIO_DESTINO_PADRAO

        cache_key = f"{source}:{dest}"

        if cache_key not in organizer_cache:
            organizer_cache[cache_key] = OrganizadorLocalAvancado(source, dest)

        return organizer_cache[cache_key]

    except Exception as e:
        app.logger.error(f"Erro ao criar organizador: {str(e)}", exc_info=True)
        raise

# ===========================================
# API ENDPOINTS
# ===========================================

@app.route('/', methods=['GET'])
@app.route('/api', methods=['GET'])
def home():
    """Home endpoint com documentação"""
    return jsonify({
        "service": "RENOMER API - Bank Statement Organizer",
        "version": "2.0.0",
        "status": "running",
        "documentation": "/api/docs",
        "endpoints": {
            "health": "GET /api/health",
            "organize": "POST /api/organize",
            "upload": "POST /api/upload",
            "analyze": "POST /api/analyze",
            "config": "GET/PUT /api/config",
            "report": "POST /api/report",
            "jobs": "GET /api/jobs/<job_id>"
        },
        "authentication": "Required: X-API-Key header",
        "rate_limit": "60 requests per minute"
    })

@app.route('/api/health', methods=['GET'])
@rate_limit
def health():
    """Health check endpoint"""
    import psutil

    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "RENOMER API",
        "version": "2.0.0",
        "uptime": time.time() - app.config.get('START_TIME', time.time()),
        "system": {
            "cpu_percent": psutil.cpu_percent() if 'psutil' in sys.modules else None,
            "memory_percent": psutil.virtual_memory().percent if 'psutil' in sys.modules else None
        }
    })

@app.route('/api/organize', methods=['POST'])
@require_api_key
@rate_limit
def organize_files():
    """Organize bank statement files with enhanced security"""
    try:
        data = request.get_json() or {}

        # Validação de inputs
        source_dir = data.get('source_directory', config.DIRETORIO_BASE_PADRAO)
        dest_dir = data.get('destination_directory', config.DIRETORIO_DESTINO_PADRAO)
        test_mode = data.get('test_mode', True)

        # Valida diretórios
        valid_source, msg = validate_directory(source_dir)
        if not valid_source:
            return jsonify({
                "success": False,
                "error": f"Invalid source directory: {msg}"
            }), 400

        valid_dest, msg = validate_directory(dest_dir)
        if not valid_dest:
            return jsonify({
                "success": False,
                "error": f"Invalid destination directory: {msg}"
            }), 400

        # Log da operação
        app.logger.info(
            f"Iniciando organização - Source: {source_dir}, Dest: {dest_dir}, Test: {test_mode}",
            extra={'request_id': g.request_id}
        )

        # Cria organizador
        org = get_organizer(source_dir, dest_dir)

        # Executa organização
        resultado = org.organizar_arquivos(modo_teste=test_mode)

        app.logger.info(
            f"Organização concluída - Sucessos: {resultado.get('processados_com_sucesso', 0)}, "
            f"Erros: {resultado.get('erros', 0)}",
            extra={'request_id': g.request_id}
        )

        return jsonify({
            "success": True,
            "request_id": g.request_id,
            "total_arquivos": resultado.get('total_arquivos', 0),
            "processados_com_sucesso": resultado.get('processados_com_sucesso', 0),
            "erros": resultado.get('erros', 0),
            "detalhes": resultado.get('detalhes', []),
            "test_mode": test_mode,
            "timestamp": datetime.now().isoformat()
        })

    except ValueError as e:
        app.logger.error(f"Erro de validação: {str(e)}", extra={'request_id': g.request_id})
        return jsonify({
            "success": False,
            "error": str(e),
            "request_id": g.request_id
        }), 400
    except Exception as e:
        app.logger.error(f"Erro interno: {str(e)}", exc_info=True, extra={'request_id': g.request_id})
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(e) if app.debug else "An error occurred",
            "request_id": g.request_id
        }), 500

@app.route('/api/upload', methods=['POST'])
@require_api_key
@rate_limit
def upload_file():
    """Upload bank statement files for processing"""
    try:
        if 'files' not in request.files:
            return jsonify({
                "success": False,
                "error": "No files provided"
            }), 400

        files = request.files.getlist('files')
        uploaded_files = []
        errors = []

        upload_dir = Path(app.config['UPLOAD_FOLDER']) / 'renomer_uploads' / g.request_id
        upload_dir.mkdir(parents=True, exist_ok=True)

        for file in files:
            if file.filename == '':
                errors.append({"filename": "empty", "error": "Empty filename"})
                continue

            if not allowed_file(file.filename):
                errors.append({
                    "filename": file.filename,
                    "error": "File type not allowed. Only PDF and OFX files accepted"
                })
                continue

            # Secure filename
            filename = secure_filename(file.filename)
            filepath = upload_dir / filename

            try:
                file.save(str(filepath))

                # Verifica tamanho
                size = filepath.stat().st_size
                if size > app.config['MAX_CONTENT_LENGTH']:
                    filepath.unlink()
                    errors.append({
                        "filename": filename,
                        "error": "File too large"
                    })
                    continue

                uploaded_files.append({
                    "filename": filename,
                    "size": size,
                    "path": str(filepath)
                })

                app.logger.info(
                    f"Arquivo uploaded: {filename} ({size} bytes)",
                    extra={'request_id': g.request_id}
                )

            except Exception as e:
                errors.append({
                    "filename": filename,
                    "error": str(e)
                })

        return jsonify({
            "success": True,
            "request_id": g.request_id,
            "uploaded": len(uploaded_files),
            "errors": len(errors),
            "files": uploaded_files,
            "error_details": errors if errors else None,
            "upload_directory": str(upload_dir)
        })

    except Exception as e:
        app.logger.error(f"Erro no upload: {str(e)}", exc_info=True, extra={'request_id': g.request_id})
        return jsonify({
            "success": False,
            "error": "Upload failed",
            "message": str(e),
            "request_id": g.request_id
        }), 500

@app.route('/api/analyze', methods=['POST'])
@require_api_key
@rate_limit
def analyze_file():
    """Analyze a bank statement filename"""
    try:
        data = request.get_json() or {}

        filename = data.get('filename', '').strip()
        folder_context = data.get('folder_context', '')

        if not filename:
            return jsonify({
                "success": False,
                "error": "Filename is required"
            }), 400

        # Validação básica do filename
        if len(filename) > 255:
            return jsonify({
                "success": False,
                "error": "Filename too long"
            }), 400

        app.logger.info(f"Analisando arquivo: {filename}", extra={'request_id': g.request_id})

        # Usa organizador para detectar
        org = get_organizer()

        deteccao_data = org.detectar_data(filename, folder_context)
        deteccao_conta = org.detectar_conta(filename)

        return jsonify({
            "success": True,
            "request_id": g.request_id,
            "filename": filename,
            "data": {
                "mes": deteccao_data.get('mes'),
                "ano": deteccao_data.get('ano'),
                "encontrado": deteccao_data.get('encontrado', False)
            },
            "conta": {
                "numero": deteccao_conta.get('conta'),
                "metodo": deteccao_conta.get('metodo'),
                "encontrado": deteccao_conta.get('encontrado', False)
            },
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        app.logger.error(f"Erro na análise: {str(e)}", exc_info=True, extra={'request_id': g.request_id})
        return jsonify({
            "success": False,
            "error": "Analysis failed",
            "message": str(e),
            "request_id": g.request_id
        }), 500

@app.route('/api/config', methods=['GET'])
@require_api_key
def get_config():
    """Get current configuration (safe fields only)"""
    try:
        return jsonify({
            "success": True,
            "config": {
                "ano_padrao": config.ANO_PADRAO,
                "usar_gemini": getattr(config, 'USAR_GEMINI', False),
                "modo_teste_padrao": getattr(config, 'MODO_TESTE_PADRAO', True),
                "formato_nome_arquivo": config.FORMATO_NOME_ARQUIVO,
                "extensoes_suportadas": list(app.config['ALLOWED_EXTENSIONS'])
            }
        })
    except Exception as e:
        app.logger.error(f"Erro ao obter config: {str(e)}", extra={'request_id': g.request_id})
        return jsonify({
            "success": False,
            "error": str(e),
            "request_id": g.request_id
        }), 500

@app.route('/api/config', methods=['PUT'])
@require_api_key
def update_config():
    """Update configuration (restricted fields only)"""
    try:
        data = request.get_json() or {}

        # Apenas permite atualizar campos seguros
        allowed_fields = ['USAR_GEMINI', 'MODO_TESTE_PADRAO', 'ANO_PADRAO']

        updated = []
        for field in allowed_fields:
            if field in data:
                setattr(config, field, data[field])
                updated.append(field)

        app.logger.info(f"Configuração atualizada: {updated}", extra={'request_id': g.request_id})

        return jsonify({
            "success": True,
            "message": "Configuration updated successfully",
            "updated_fields": updated,
            "request_id": g.request_id
        })

    except Exception as e:
        app.logger.error(f"Erro ao atualizar config: {str(e)}", extra={'request_id': g.request_id})
        return jsonify({
            "success": False,
            "error": str(e),
            "request_id": g.request_id
        }), 500

# ===========================================
# ERROR HANDLERS
# ===========================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Not found",
        "message": "The requested endpoint does not exist",
        "available_endpoints": list(app.url_map.iter_rules())
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        "success": False,
        "error": "Method not allowed",
        "message": f"The method {request.method} is not allowed for this endpoint"
    }), 405

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"Erro 500: {str(error)}", exc_info=True)
    return jsonify({
        "success": False,
        "error": "Internal server error",
        "message": "An unexpected error occurred"
    }), 500

# ===========================================
# STARTUP
# ===========================================
if __name__ == '__main__':
    app.config['START_TIME'] = time.time()

    print("="*60)
    print("🚀 RENOMER API - Bank Statement Organizer")
    print("="*60)
    print(f"Version: 2.0.0")
    print(f"Base Directory: {config.DIRETORIO_BASE_PADRAO}")
    print(f"Destination Directory: {config.DIRETORIO_DESTINO_PADRAO}")
    print(f"Server: http://0.0.0.0:8000")
    print(f"API Documentation: http://localhost:8000/api")
    print(f"Health Check: http://localhost:8000/api/health")
    print("")
    print("🔒 Security Features:")
    print("  ✓ API Key Authentication")
    print("  ✓ Rate Limiting (60 req/min)")
    print("  ✓ Input Validation")
    print("  ✓ CORS Protection")
    print("  ✓ Request ID Tracking")
    print("")
    print("📋 Available Endpoints:")
    print("  GET  /api          - API Documentation")
    print("  GET  /api/health   - Health Check")
    print("  POST /api/organize - Organize Files")
    print("  POST /api/upload   - Upload Files")
    print("  POST /api/analyze  - Analyze Filename")
    print("  GET  /api/config   - Get Configuration")
    print("  PUT  /api/config   - Update Configuration")
    print("")
    print("🔑 API Key: Set X-API-Key header")
    print(f"   Default Key: {os.environ.get('API_KEY', 'dev_key_12345')}")
    print("="*60)

    # Produção: use gunicorn ou uwsgi
    # gunicorn -w 4 -b 0.0.0.0:8000 app:app
    app.run(host='0.0.0.0', port=8000, debug=os.environ.get('DEBUG', 'False').lower() == 'true')