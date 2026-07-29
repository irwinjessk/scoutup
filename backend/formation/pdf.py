"""Génération PDF brevet (ReportLab)."""

from __future__ import annotations

from io import BytesIO

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

COLOR_MAP = {
    'vert': '#1B7A3E',
    'bleu': '#0073e6',
    'or': '#C9A227',
    'rouge': '#ff3131',
}


def build_brevet_pdf(*, nom_affiche: str, stage_titre: str, couleur: str, communaute: str) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    accent = HexColor(COLOR_MAP.get((couleur or '').lower(), '#0073e6'))

    c.setFillColor(HexColor('#0d1117'))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    c.setStrokeColor(accent)
    c.setLineWidth(6)
    c.roundRect(36, 36, width - 72, height - 72, 18, fill=0, stroke=1)

    c.setFillColor(accent)
    c.setFont('Helvetica-Bold', 28)
    c.drawCentredString(width / 2, height - 140, 'SCOUTUP')

    c.setFillColor(white)
    c.setFont('Helvetica', 14)
    c.drawCentredString(width / 2, height - 170, 'Branche Route · Brevet numérique')

    c.setFont('Helvetica-Bold', 22)
    c.drawCentredString(width / 2, height / 2 + 40, stage_titre)

    c.setFont('Helvetica', 16)
    c.drawCentredString(width / 2, height / 2, 'Décerné à')

    c.setFont('Helvetica-Bold', 20)
    c.drawCentredString(width / 2, height / 2 - 36, nom_affiche)

    c.setFont('Helvetica', 12)
    c.drawCentredString(width / 2, 120, communaute)
    c.drawCentredString(width / 2, 100, 'Grandir · Apprendre · Servir')

    c.showPage()
    c.save()
    return buffer.getvalue()
