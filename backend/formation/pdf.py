"""Génération PDF brevet — modèle type Google/Coursera adapté ScoutUp."""

from __future__ import annotations

import math
from io import BytesIO
from pathlib import Path

from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ASSETS = Path(__file__).resolve().parent / 'assets'

# Flèche / bandeau selon l'étape (code Stage)
RIBBON_BY_STAGE = {
    'NOVICIAT': {'fill': '#9CA3AF', 'star': None, 'text': '#1F2937'},  # gris
    'APPRENTISSAGE': {'fill': '#8B5A2B', 'star': None, 'text': '#FFFFFF'},  # marron
    'COMPAGNONNAGE': {'fill': '#D1D5DB', 'star': '#FFFFFF', 'text': '#1F2937'},
    'DEPART_ROUTIER': {'fill': '#D1D5DB', 'star': '#4B5563', 'text': '#1F2937'},
}

MONTHS_FR = {
    1: 'janv.',
    2: 'févr.',
    3: 'mars',
    4: 'avr.',
    5: 'mai',
    6: 'juin',
    7: 'juil.',
    8: 'août',
    9: 'sept.',
    10: 'oct.',
    11: 'nov.',
    12: 'déc.',
}


def _img(name: str) -> Path | None:
    path = ASSETS / name
    return path if path.exists() else None


def _draw_image(c: canvas.Canvas, path: Path | None, cx, cy, max_w, max_h):
    """Dessine une image centrée sur (cx, cy)."""
    if not path:
        return
    try:
        img = ImageReader(str(path))
        iw, ih = img.getSize()
        scale = min(max_w / iw, max_h / ih)
        w, h = iw * scale, ih * scale
        c.drawImage(
            img,
            cx - w / 2,
            cy - h / 2,
            width=w,
            height=h,
            mask='auto',
            preserveAspectRatio=True,
        )
    except Exception:
        pass


def _draw_star(c: canvas.Canvas, cx, cy, outer_r, color_hex: str, inner_ratio=0.45):
    path = c.beginPath()
    inner_r = outer_r * inner_ratio
    for i in range(10):
        ang = math.pi / 2 + i * math.pi / 5
        r = outer_r if i % 2 == 0 else inner_r
        x = cx + r * math.cos(ang)
        y = cy + r * math.sin(ang)
        if i == 0:
            path.moveTo(x, y)
        else:
            path.lineTo(x, y)
    path.close()
    c.setFillColor(HexColor(color_hex))
    # Contour pour lisibilité (étoile blanche sur gris clair)
    c.setStrokeColor(HexColor('#6B7280'))
    c.setLineWidth(0.8)
    c.drawPath(path, fill=1, stroke=1)


def _draw_ribbon(c: canvas.Canvas, width, height, stage_code: str) -> float:
    style = RIBBON_BY_STAGE.get(stage_code) or RIBBON_BY_STAGE['NOVICIAT']
    fill = HexColor(style['fill'])
    text_color = HexColor(style.get('text', '#1F2937'))
    ribbon_w = width * 0.22
    x0 = width - ribbon_w - 28
    top = height - 28
    tip_y = 95
    mid_x = x0 + ribbon_w / 2

    path = c.beginPath()
    path.moveTo(x0, top)
    path.lineTo(x0 + ribbon_w, top)
    path.lineTo(x0 + ribbon_w, tip_y + 55)
    path.lineTo(mid_x, tip_y)
    path.lineTo(x0, tip_y + 55)
    path.close()
    c.setFillColor(fill)
    c.setStrokeColor(HexColor('#6B7280'))
    c.setLineWidth(0.6)
    c.drawPath(path, fill=1, stroke=1)

    c.setFillColor(text_color)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(mid_x, top - 40, 'BREVET')
    c.drawCentredString(mid_x, top - 54, 'ROUTE')

    seal_cy = height * 0.42
    seal_r = min(ribbon_w * 0.38, 52)
    c.setFillColor(white)
    c.circle(mid_x, seal_cy, seal_r + 6, fill=1, stroke=0)
    c.setStrokeColor(HexColor('#374151'))
    c.setLineWidth(1.2)
    c.circle(mid_x, seal_cy, seal_r + 4, fill=0, stroke=1)
    c.setLineWidth(0.6)
    c.circle(mid_x, seal_cy, seal_r, fill=0, stroke=1)

    c.setFillColor(HexColor('#374151'))
    for i in range(36):
        ang = i * (2 * math.pi / 36)
        px = mid_x + (seal_r + 2) * math.cos(ang)
        py = seal_cy + (seal_r + 2) * math.sin(ang)
        c.circle(px, py, 0.8, fill=1, stroke=0)

    c.setFont('Helvetica', 5.5)
    c.drawCentredString(mid_x, seal_cy + seal_r - 12, 'SCOUTUP')
    c.drawCentredString(mid_x, seal_cy - seal_r + 8, 'BREVET ROUTE')

    logo = _img('logo-scoutup.png')
    if logo:
        _draw_image(c, logo, mid_x, seal_cy + 2, seal_r * 1.15, seal_r * 1.15)
    else:
        c.setFont('Helvetica-Bold', 9)
        c.drawCentredString(mid_x, seal_cy - 3, 'ScoutUp')

    if style.get('star'):
        _draw_star(c, mid_x, tip_y + 78, 16, style['star'])

    return x0


def build_brevet_pdf(
    *,
    prenoms: str,
    nom: str,
    stage_titre: str,
    stage_code: str,
    couleur: str = '',  # conservé pour compat
    communaute: str = '',
    cg_nom: str = '',
    delivered_at=None,
) -> bytes:
    buffer = BytesIO()
    page = landscape(A4)
    width, height = page
    c = canvas.Canvas(buffer, pagesize=page)

    c.setFillColor(white)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    c.setStrokeColor(HexColor('#E8DCC8'))
    c.setLineWidth(0.4)
    for i in range(8):
        r = 40 + i * 28
        c.circle(width * 0.32, height * 0.55, r, fill=0, stroke=1)
        c.circle(width * 0.78, height * 0.35, r * 0.7, fill=0, stroke=1)

    c.setStrokeColor(HexColor('#1F2937'))
    c.setLineWidth(1.4)
    c.rect(18, 18, width - 36, height - 36, fill=0, stroke=1)
    c.setLineWidth(0.5)
    c.rect(24, 24, width - 48, height - 48, fill=0, stroke=1)

    ribbon_x = _draw_ribbon(c, width, height, (stage_code or '').upper())

    mama = _img('logo-mama.png')
    badge = _img('logo-badge.png')
    logo_cy = height - 88
    if mama:
        _draw_image(c, mama, 78, logo_cy, 72, 72)
    if badge:
        _draw_image(c, badge, 165, logo_cy, 72, 72)
    if not mama and not badge:
        c.setFillColor(HexColor('#0073e6'))
        c.setFont('Helvetica-Bold', 16)
        c.drawString(48, height - 70, 'ScoutUp · Groupe MAMA')

    if delivered_at is not None and hasattr(delivered_at, 'day'):
        date_str = f'{delivered_at.day} {MONTHS_FR.get(delivered_at.month, "")} {delivered_at.year}'
    else:
        from django.utils import timezone

        now = timezone.now()
        date_str = f'{now.day} {MONTHS_FR.get(now.month, "")} {now.year}'

    c.setFillColor(HexColor('#4B5563'))
    c.setFont('Helvetica', 11)
    c.drawString(48, height - 145, date_str)

    full_name = f'{(prenoms or "").strip()} {(nom or "").strip()}'.strip() or 'Routier'
    c.setFillColor(black)
    c.setFont('Times-Bold', 28)
    max_name_w = ribbon_x - 70
    name = full_name
    while c.stringWidth(name, 'Times-Bold', 28) > max_name_w and len(name) > 3:
        name = name[:-4] + '…'
    c.drawString(48, height - 195, name)

    c.setFont('Helvetica', 12)
    c.setFillColor(HexColor('#374151'))
    c.drawString(48, height - 220, 'a validé avec succès')

    c.setFillColor(black)
    c.setFont('Times-Bold', 18)
    c.drawString(48, height - 250, stage_titre or 'Formation Route')

    c.setFont('Helvetica', 10)
    c.setFillColor(HexColor('#4B5563'))
    desc = (
        "l'étape de formation libre ScoutUp — Branche Route"
        + (f' · {communaute}' if communaute else '')
        + '.'
    )
    words = desc.split()
    lines, cur = [], ''
    for w in words:
        trial = f'{cur} {w}'.strip()
        if c.stringWidth(trial, 'Helvetica', 10) < max_name_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    y = height - 275
    for line in lines[:3]:
        c.drawString(48, y, line)
        y -= 14

    c.setFont('Helvetica-Oblique', 10)
    c.setFillColor(HexColor('#6B7280'))
    c.drawString(48, y - 8, 'Grandir · Apprendre · Servir')

    sig = _img('signature-cg.png')
    sig_y = 70
    if sig:
        _draw_image(c, sig, 120, sig_y + 48, 140, 50)
    c.setStrokeColor(HexColor('#9CA3AF'))
    c.setLineWidth(0.7)
    c.line(48, sig_y + 28, 220, sig_y + 28)

    c.setFillColor(HexColor('#111827'))
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, sig_y + 12, cg_nom or 'Chef de groupe')
    c.setFont('Helvetica', 8)
    c.setFillColor(HexColor('#6B7280'))
    c.drawString(48, sig_y, 'Chef de groupe')

    c.setFont('Helvetica', 7)
    c.setFillColor(HexColor('#6B7280'))
    c.drawRightString(width - 40, 48, 'ScoutUp — Branche Route')
    c.drawRightString(width - 40, 36, 'Identité et progression confirmées par la communauté.')

    c.showPage()
    c.save()
    return buffer.getvalue()
