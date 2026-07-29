"""Correction des réponses formation."""

from __future__ import annotations

import unicodedata

from ..models import QuestionType


def _normalize(text: str) -> str:
    text = (text or '').strip().lower()
    text = unicodedata.normalize('NFKD', text)
    return ''.join(ch for ch in text if not unicodedata.combining(ch))


def check_answer(question, reponse) -> bool:
    expected = question.reponse_attendue

    if question.type == QuestionType.QCM:
        if isinstance(expected, dict):
            expected_id = expected.get('id')
            expected_texte = expected.get('texte')
        else:
            expected_id = expected
            expected_texte = None

        if isinstance(reponse, dict):
            rid = reponse.get('id')
            rtexte = reponse.get('texte')
        else:
            rid = reponse
            rtexte = None

        if expected_id is not None and rid is not None and str(rid) == str(expected_id):
            return True
        if expected_texte is not None and rtexte is not None:
            return _normalize(str(expected_texte)) == _normalize(str(rtexte))
        if expected_texte is not None:
            return _normalize(str(expected_texte)) == _normalize(str(reponse))
        return _normalize(str(expected_id)) == _normalize(str(reponse))

    # TEXTE_TROUS / REPONSE_DIRECTE
    accepted = expected
    if isinstance(expected, dict):
        accepted = expected.get('acceptes') or expected.get('valeur') or expected
    if not isinstance(accepted, list):
        accepted = [accepted]

    candidate = _normalize(str(reponse))
    return any(_normalize(str(item)) == candidate for item in accepted)
