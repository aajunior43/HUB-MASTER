from __future__ import annotations

from ocr.colunas import extrair_pagina_por_colunas


class _FakePage:
    def __init__(self, palavras):
        self._palavras = palavras

    def extract_words(self, **_kwargs):
        return self._palavras


def _linha(texto, x0, top, altura=10.0, largura_palavra=30.0, espaco=4.0):
    palavras = []
    x = x0
    for token in texto.split():
        palavras.append(
            {"text": token, "x0": x, "x1": x + largura_palavra, "top": top, "bottom": top + altura}
        )
        x += largura_palavra + espaco
    return palavras


def _coluna(linhas, x0, top0, passo=12.0):
    palavras = []
    for i, texto in enumerate(linhas):
        palavras.extend(_linha(texto, x0, top0 + i * passo))
    return palavras


def _pagina_duas_colunas():
    esquerda = _coluna(
        [f"alpha{i} beta{i} gama{i}" for i in range(8)],
        x0=20,
        top0=120,
    )
    direita = _coluna(
        [f"omega{i} sigma{i} delta{i}" for i in range(8)],
        x0=200,
        top0=120,
    )
    titulo = _linha("TITULO LARGO DA MATERIA SOBRE A CAMARA", x0=20, top=60, altura=20.0, largura_palavra=60.0)
    return _FakePage(titulo + esquerda + direita)


def test_colunas_nao_se_misturam():
    resultado = extrair_pagina_por_colunas(_pagina_duas_colunas(), 1)
    assert resultado is not None
    texto, blocos = resultado
    for bloco in blocos:
        tem_esquerda = "alpha" in bloco.texto
        tem_direita = "omega" in bloco.texto
        assert not (tem_esquerda and tem_direita)
    assert "alpha0 beta0 gama0\nalpha1 beta1 gama1" in texto
    assert "omega0 sigma0 delta0\nomega1 sigma1 delta1" in texto


def test_titulo_largo_fica_em_bloco_proprio_antes_das_colunas():
    _texto, blocos = extrair_pagina_por_colunas(_pagina_duas_colunas(), 3)
    assert "TITULO" in blocos[0].texto
    assert "alpha" not in blocos[0].texto
    assert all(b.pagina == 3 for b in blocos)


def test_blocos_de_colunas_diferentes_tem_indices_diferentes():
    _texto, blocos = extrair_pagina_por_colunas(_pagina_duas_colunas(), 1)
    esquerda = next(b for b in blocos if "alpha" in b.texto)
    direita = next(b for b in blocos if "omega" in b.texto)
    assert esquerda.bloco // 1000 != direita.bloco // 1000
    assert esquerda.bbox[0] < direita.bbox[0]


def test_junta_palavra_hifenizada_no_fim_da_linha():
    palavras = _coluna(["Camara Municipal de Ina-", "ja aprovou o projeto"], x0=20, top0=100)
    palavras += _coluna([f"linha{i} de texto comum aqui" for i in range(6)], x0=20, top0=130)
    texto, _blocos = extrair_pagina_por_colunas(_FakePage(palavras), 1)
    assert "Camara Municipal de Inaja aprovou o projeto" in texto


def test_pagina_com_poucas_palavras_usa_fallback():
    assert extrair_pagina_por_colunas(_FakePage(_linha("so tres palavras", 20, 20)), 1) is None


def test_falha_na_leitura_usa_fallback():
    class _Quebrada:
        def extract_words(self, **_kwargs):
            raise RuntimeError("pdf corrompido")

    assert extrair_pagina_por_colunas(_Quebrada(), 1) is None
