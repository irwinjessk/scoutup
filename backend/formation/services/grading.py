"""Correction des réponses formation."""

from __future__ import annotations

import re
import unicodedata

from ..models import QuestionType

BLANK_RE = re.compile(r'_{3,}')


def _normalize(text: str) -> str:
    text = (text or '').strip().lower()
    text = unicodedata.normalize('NFKD', text)
    return ''.join(ch for ch in text if not unicodedata.combining(ch))


def count_blanks(enonce: str) -> int:
    return len(BLANK_RE.findall(enonce or ''))


def _blank_answer_sets(expected, nb_blanks: int) -> list[list[str]]:
    """Normalise reponse_attendue en liste de jeux de réponses (un par variante)."""
    if isinstance(expected, dict):
        expected = expected.get('acceptes') or expected.get('blanks') or expected.get('valeur')

    if nb_blanks <= 1:
        if isinstance(expected, list) and expected and isinstance(expected[0], list):
            return [[str(x) for x in row] for row in expected]
        items = expected if isinstance(expected, list) else [expected]
        return [[str(x)] for x in items]

    # Plusieurs trous
    if isinstance(expected, list) and expected and isinstance(expected[0], list):
        return [[str(x) for x in row] for row in expected]
    if isinstance(expected, list):
        return [[str(x) for x in expected]]
    return [[str(expected)]]


def _candidate_blanks(reponse, nb_blanks: int) -> list[str]:
    if isinstance(reponse, list):
        return [str(x) for x in reponse]
    if isinstance(reponse, dict):
        if isinstance(reponse.get('blanks'), list):
            return [str(x) for x in reponse['blanks']]
        if reponse.get('texte') is not None:
            return [str(reponse['texte'])]
    text = str(reponse)
    if nb_blanks > 1 and ';' in text:
        return [p.strip() for p in text.split(';')]
    return [text]


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

    if question.type == QuestionType.TEXTE_TROUS:
        nb = count_blanks(question.enonce) or 1
        if isinstance(question.options, dict) and question.options.get('nb_blanks'):
            try:
                nb = max(1, int(question.options['nb_blanks']))
            except (TypeError, ValueError):
                pass
        candidates = [_normalize(x) for x in _candidate_blanks(reponse, nb)]
        if len(candidates) != nb:
            # Un seul champ collé pour N trous : refuse sauf si nb==1
            if nb == 1 and len(candidates) == 1:
                pass
            else:
                return False
        for answer_set in _blank_answer_sets(expected, nb):
            norm_set = [_normalize(x) for x in answer_set]
            if len(norm_set) != nb:
                continue
            if candidates == norm_set:
                return True
        return False

    # REPONSE_DIRECTE
    accepted = expected
    if isinstance(expected, dict):
        accepted = expected.get('acceptes') or expected.get('valeur') or expected
    if not isinstance(accepted, list):
        accepted = [accepted]

    candidate = _normalize(str(reponse))
    return any(_normalize(str(item)) == candidate for item in accepted)
