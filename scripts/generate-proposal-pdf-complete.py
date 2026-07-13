from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from PIL import Image as PILImage
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
DOCS_DIR = ROOT / "docs"
SOURCE_PDF = DOCS_DIR / "propuesta-comercial-vitacura-juan-2026-07-13-v2.pdf"
LOGO_PATH = PUBLIC_DIR / "n3uralia-logo.webp"

OUTPUTS = [
    PUBLIC_DIR / "propuesta-profesional-completa.pdf",
    PUBLIC_DIR / "propuesta-comercial-n3uralia.pdf",
    DOCS_DIR / "propuesta-comercial-vitacura-juan-2026-07-13-v4.pdf",
]

IMAGE_OUTPUTS = [
    "dashboard",
    "market_map",
    "market_detail",
    "velocity",
    "control",
    "valorizador",
    "properties",
    "sources",
    "funnel",
]

RENDER_LOGO_PATH: Path | None = None


def rgb(hex_color: str):
    return colors.HexColor(hex_color)


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def extract_images(source_pdf: Path, temp_dir: Path) -> list[Path]:
    reader = PdfReader(str(source_pdf))
    extracted: list[Path] = []

    for index, page in enumerate(reader.pages, start=1):
        images = getattr(page, "images", [])
        if not images:
            continue

        image_file = max(images, key=lambda img: img.image.width * img.image.height)
        pil_image = image_file.image
        out_path = temp_dir / f"page-{index}.png"
        pil_image.save(out_path)
        extracted.append(out_path)

    if len(extracted) < len(IMAGE_OUTPUTS):
        raise RuntimeError(
            f"Expected at least {len(IMAGE_OUTPUTS)} images, got {len(extracted)} from {source_pdf}"
        )

    return extracted


def scale_image(path: Path, max_width: float, max_height: float):
    with PILImage.open(path) as img:
        width, height = img.size

    scale = min(max_width / width, max_height / height, 1.0)
    return width * scale, height * scale


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=30,
            leading=34,
            alignment=TA_CENTER,
            textColor=colors.white,
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSub",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=15,
            leading=22,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#d9ece7"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=23,
            leading=27,
            alignment=TA_LEFT,
            textColor=rgb("#173f39"),
            spaceAfter=10,
            spaceBefore=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyCommercial",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=12.3,
            leading=18,
            alignment=TA_LEFT,
            textColor=rgb("#2c433f"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletCommercial",
            parent=styles["BodyCommercial"],
            leftIndent=14,
            firstLineIndent=0,
            spaceBefore=0,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CaptionCommercial",
            parent=styles["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=9.2,
            leading=12,
            alignment=TA_CENTER,
            textColor=rgb("#6d817a"),
            spaceBefore=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SmallLabel",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.3,
            leading=11,
            alignment=TA_LEFT,
            textColor=rgb("#1d5d54"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MetricValue",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=22,
            alignment=TA_CENTER,
            textColor=rgb("#1b5a4f"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MetricLabel",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.4,
            leading=12,
            alignment=TA_CENTER,
            textColor=rgb("#4f6460"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="RoadmapTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13.5,
            leading=15,
            alignment=TA_LEFT,
            textColor=rgb("#173f39"),
            spaceAfter=4,
        )
    )
    return styles


def build_cover_story(styles, logo_image_path: Path):
    logo_width, logo_height = scale_image(logo_image_path, 2.8 * inch, 0.9 * inch)
    chip_data = [
        [
            Paragraph("Ventas de casas", styles["SmallLabel"]),
            Paragraph("Vitacura", styles["SmallLabel"]),
            Paragraph("Datos reales", styles["SmallLabel"]),
            Paragraph("Reportes automaticos", styles["SmallLabel"]),
            Paragraph("Valorizador IA", styles["SmallLabel"]),
        ]
    ]

    chips = Table(chip_data, colWidths=[1.18 * inch] * 5, rowHeights=[0.36 * inch])
    chips.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1f5d54")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#eaf4f1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#eaf4f1")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )

    story = [
        Spacer(1, 0.5 * inch),
        Image(str(logo_image_path), width=logo_width, height=logo_height),
        Spacer(1, 0.42 * inch),
        Paragraph("Propuesta comercial para ventas de casas en Vitacura", styles["CoverTitle"]),
        Spacer(1, 0.12 * inch),
        Paragraph(
            "N3uralia entrega una plataforma de inteligencia de mercado enfocada en ventas de casas, con analisis real de barrios, valorizacion, reportes ejecutivos y monitoreo continuo de oportunidades comerciales.",
            styles["CoverSub"],
        ),
        Spacer(1, 0.18 * inch),
        chips,
        Spacer(1, 0.3 * inch),
        Paragraph("Vitacura, Santiago - Julio 2026", styles["CoverSub"]),
    ]
    return story


def intro_block(paragraphs, bullets, styles):
    items = [Paragraph(text, styles["BodyCommercial"]) for text in paragraphs]
    if bullets:
        items.append(Spacer(1, 0.04 * inch))
        items.extend(Paragraph(f"- {bullet}", styles["BulletCommercial"]) for bullet in bullets)
    intro = Table([[items]], colWidths=[7.0 * inch])
    intro.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4faf7")),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d4e4de")),
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    return intro


def metric_grid(rows, styles):
    table_data = []
    for left_val, left_label, right_val, right_label in rows:
        table_data.append(
            [
                Paragraph(left_val, styles["MetricValue"]),
                Paragraph(left_label, styles["MetricLabel"]),
                Paragraph(right_val, styles["MetricValue"]),
                Paragraph(right_label, styles["MetricLabel"]),
            ]
        )

    table = Table(table_data, colWidths=[0.9 * inch, 1.95 * inch, 0.9 * inch, 1.95 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d7e6e0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d7e6e0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def image_page_story(title, paragraphs, bullets, image_path: Path, caption: str, styles):
    max_width = 6.95 * inch
    max_height = 4.9 * inch
    width, height = scale_image(image_path, max_width, max_height)

    story = [
        Paragraph(title, styles["SectionTitle"]),
        intro_block(paragraphs, bullets, styles),
        Spacer(1, 0.18 * inch),
        Image(str(image_path), width=width, height=height),
        Paragraph(caption, styles["CaptionCommercial"]),
        PageBreak(),
    ]
    return story


def text_page_story(title, paragraphs, bullets, styles):
    story = [
        Paragraph(title, styles["SectionTitle"]),
    ]
    for text in paragraphs:
        story.append(Paragraph(text, styles["BodyCommercial"]))
    if bullets:
        story.append(Spacer(1, 0.06 * inch))
        for bullet in bullets:
            story.append(Paragraph(f"- {bullet}", styles["BulletCommercial"]))
    return story


def source_table_page(styles):
    data = [
        [
            Paragraph("Fuente", styles["RoadmapTitle"]),
            Paragraph("Cobertura", styles["RoadmapTitle"]),
            Paragraph("Rol", styles["RoadmapTitle"]),
        ],
        [
            Paragraph("Portal Inmobiliario", styles["BodyCommercial"]),
            Paragraph("Casas y propiedades activas en Vitacura", styles["BodyCommercial"]),
            Paragraph("Inventario base", styles["BodyCommercial"]),
        ],
        [
            Paragraph("TOCTOC Search", styles["BodyCommercial"]),
            Paragraph("Exploracion general del mercado local", styles["BodyCommercial"]),
            Paragraph("Cobertura extra", styles["BodyCommercial"]),
        ],
        [
            Paragraph("TOCTOC Casas", styles["BodyCommercial"]),
            Paragraph("Filtro orientado a casas", styles["BodyCommercial"]),
            Paragraph("Foco casas", styles["BodyCommercial"]),
        ],
        [
            Paragraph("TOCTOC Barrios Vitacura", styles["BodyCommercial"]),
            Paragraph("Lectura por barrio y sector", styles["BodyCommercial"]),
            Paragraph("Segmentacion", styles["BodyCommercial"]),
        ],
        [
            Paragraph("icasas.cl", styles["BodyCommercial"]),
            Paragraph("Busqueda complementaria de mercado", styles["BodyCommercial"]),
            Paragraph("Validacion cruzada", styles["BodyCommercial"]),
        ],
        [
            Paragraph("icasas.cl Casas", styles["BodyCommercial"]),
            Paragraph("Casas filtradas por zona", styles["BodyCommercial"]),
            Paragraph("Foco casas", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Yapo", styles["BodyCommercial"]),
            Paragraph("Señales de oferta y referencia de mercado", styles["BodyCommercial"]),
            Paragraph("Referencia externa", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Chilepropiedades", styles["BodyCommercial"]),
            Paragraph("Cobertura adicional del mercado", styles["BodyCommercial"]),
            Paragraph("Cobertura extra", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Chilepropiedades Casas", styles["BodyCommercial"]),
            Paragraph("Filtro directo sobre casas", styles["BodyCommercial"]),
            Paragraph("Foco casas", styles["BodyCommercial"]),
        ],
    ]

    table = Table(data, colWidths=[1.7 * inch, 2.5 * inch, 2.75 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#143f38")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d7e6e0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d7e6e0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def agent_table_page(styles):
    data = [
        [
            Paragraph("Agente", styles["RoadmapTitle"]),
            Paragraph("Funcion", styles["RoadmapTitle"]),
            Paragraph("Resultado para negocio", styles["RoadmapTitle"]),
        ],
        [
            Paragraph("Agente de scraping", styles["BodyCommercial"]),
            Paragraph("Orquesta la captura de propiedades y fuentes externas", styles["BodyCommercial"]),
            Paragraph("Mantiene el inventario actualizado y comparable", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Agente de validacion", styles["BodyCommercial"]),
            Paragraph("Revisa duplicados, precios, barrio y coherencia", styles["BodyCommercial"]),
            Paragraph("Reduce ruido y mejora la calidad del dato", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Agente de reportes", styles["BodyCommercial"]),
            Paragraph("Genera reportes semanales y resuelve distribucion", styles["BodyCommercial"]),
            Paragraph("Convierte datos en entregables listos para el cliente", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Agente de refresco", styles["BodyCommercial"]),
            Paragraph("Ejecuta cron jobs de actualizacion de fuentes", styles["BodyCommercial"]),
            Paragraph("Sostiene continuidad operativa sin trabajo manual", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Agente de monitoreo", styles["BodyCommercial"]),
            Paragraph("Observa salud de fuentes, runs y anomalías", styles["BodyCommercial"]),
            Paragraph("Permite reaccionar antes de que el pipeline se degrade", styles["BodyCommercial"]),
        ],
    ]

    table = Table(data, colWidths=[1.45 * inch, 2.75 * inch, 2.7 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#143f38")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d7e6e0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d7e6e0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def data_connections_page(styles):
    data = [
        [
            Paragraph("Conexion", styles["RoadmapTitle"]),
            Paragraph("Punto tecnico", styles["RoadmapTitle"]),
            Paragraph("Uso comercial", styles["RoadmapTitle"]),
        ],
        [
            Paragraph("Scraping principal", styles["BodyCommercial"]),
            Paragraph("/api/scrape/portal-inmobiliario", styles["BodyCommercial"]),
            Paragraph("Captura casas y comparables en Vitacura", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Benchmark Portal", styles["BodyCommercial"]),
            Paragraph("/api/benchmarks/portal-inmobiliario", styles["BodyCommercial"]),
            Paragraph("Actualiza referencia de precios y señales del mercado", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Benchmark externo", styles["BodyCommercial"]),
            Paragraph("/api/benchmarks/realtor", styles["BodyCommercial"]),
            Paragraph("Cruza evidencia externa para robustecer el pricing", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Refresco de fuentes", styles["BodyCommercial"]),
            Paragraph("/api/cron/refresh-sources", styles["BodyCommercial"]),
            Paragraph("Dispara recoleccion periodica sin trabajo manual", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Reporte semanal", styles["BodyCommercial"]),
            Paragraph("/api/reports/weekly", styles["BodyCommercial"]),
            Paragraph("Genera el reporte base para cada director", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Distribucion automatica", styles["BodyCommercial"]),
            Paragraph("/api/cron/deliver-weekly-reports", styles["BodyCommercial"]),
            Paragraph("Entrega reportes por canal definido por el cliente", styles["BodyCommercial"]),
        ],
        [
            Paragraph("Salud del pipeline", styles["BodyCommercial"]),
            Paragraph("/api/scrape/health", styles["BodyCommercial"]),
            Paragraph("Monitorea estado, errores y continuidad operativa", styles["BodyCommercial"]),
        ],
    ]

    table = Table(data, colWidths=[1.55 * inch, 2.65 * inch, 2.7 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#143f38")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d7e6e0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d7e6e0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def report_flow_page(styles):
    data = [
        [
            Paragraph("Paso", styles["RoadmapTitle"]),
            Paragraph("Que hace", styles["RoadmapTitle"]),
            Paragraph("Salida", styles["RoadmapTitle"]),
        ],
        [
            Paragraph("1. Captura", styles["BodyCommercial"]),
            Paragraph("Los agentes recorren las fuentes y levantan nuevas propiedades o cambios relevantes.", styles["BodyCommercial"]),
            Paragraph("Inventario actualizado y limpio", styles["BodyCommercial"]),
        ],
        [
            Paragraph("2. Validacion", styles["BodyCommercial"]),
            Paragraph("Se revisan duplicados, barrio, precio, tipo de propiedad y consistencia comercial.", styles["BodyCommercial"]),
            Paragraph("Base depurada para analisis", styles["BodyCommercial"]),
        ],
        [
            Paragraph("3. Analisis", styles["BodyCommercial"]),
            Paragraph("El motor comercial calcula tendencias, conversion, velocidad y posicionamiento.", styles["BodyCommercial"]),
            Paragraph("Insigths ejecutivos por barrio", styles["BodyCommercial"]),
        ],
        [
            Paragraph("4. Redaccion", styles["BodyCommercial"]),
            Paragraph("El agente de reportes transforma el analisis en narrativa comercial lista para compartir.", styles["BodyCommercial"]),
            Paragraph("Reporte semanal en formato cliente", styles["BodyCommercial"]),
        ],
        [
            Paragraph("5. Distribucion", styles["BodyCommercial"]),
            Paragraph("Los reportes salen por el canal definido y quedan preparados para seguimiento.", styles["BodyCommercial"]),
            Paragraph("Entrega automatica al equipo", styles["BodyCommercial"]),
        ],
    ]

    table = Table(data, colWidths=[1.2 * inch, 3.25 * inch, 2.45 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#143f38")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d7e6e0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d7e6e0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def draw_cover_background(canvas_obj, doc):
    width, height = A4
    canvas_obj.saveState()
    canvas_obj.setFillColor(rgb("#143f38"))
    canvas_obj.rect(0, 0, width, height, stroke=0, fill=1)

    canvas_obj.setFillColor(colors.HexColor("#1f6258"))
    canvas_obj.circle(width * 0.84, height * 0.82, 70, stroke=0, fill=1)
    canvas_obj.setFillColor(colors.HexColor("#245f55"))
    canvas_obj.circle(width * 0.18, height * 0.18, 95, stroke=0, fill=1)
    canvas_obj.setFillColor(colors.HexColor("#a58d5a"))
    canvas_obj.circle(width * 0.78, height * 0.2, 18, stroke=0, fill=1)
    canvas_obj.circle(width * 0.8, height * 0.2, 8, stroke=0, fill=1)
    canvas_obj.restoreState()


def draw_content_chrome(canvas_obj, doc):
    width, height = A4
    if RENDER_LOGO_PATH is None:
        raise RuntimeError("Render logo path not initialized")
    canvas_obj.saveState()
    canvas_obj.setFillColor(colors.white)
    canvas_obj.rect(0, 0, width, height, stroke=0, fill=1)

    canvas_obj.setStrokeColor(colors.HexColor("#d7e6e0"))
    canvas_obj.setLineWidth(0.7)
    canvas_obj.line(doc.leftMargin, height - 0.52 * inch, width - doc.rightMargin, height - 0.52 * inch)
    canvas_obj.line(doc.leftMargin, 0.55 * inch, width - doc.rightMargin, 0.55 * inch)

    canvas_obj.drawImage(
        str(RENDER_LOGO_PATH),
        doc.leftMargin,
        height - 0.44 * inch,
        width=0.72 * inch,
        height=0.25 * inch,
        preserveAspectRatio=True,
        mask="auto",
    )
    canvas_obj.setFont("Helvetica-Bold", 8.5)
    canvas_obj.setFillColor(rgb("#1d5d54"))
    canvas_obj.drawRightString(
        width - doc.rightMargin,
        height - 0.35 * inch,
        "N3uralia - Ventas de casas en Vitacura",
    )
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(colors.HexColor("#6e837c"))
    canvas_obj.drawRightString(width - doc.rightMargin, 0.33 * inch, f"Page {canvas_obj.getPageNumber()}")
    canvas_obj.restoreState()


def build_story(image_paths: list[Path], styles, logo_image_path: Path):
    story = []

    story.extend(build_cover_story(styles, logo_image_path))
    story.append(PageBreak())

    story.extend(
        text_page_story(
            "Resumen comercial",
            [
                "Esta propuesta presenta una plataforma comercial pensada para equipos que necesitan vender casas en Vitacura con respaldo de datos, lectura territorial y una narrativa ejecutiva clara para clientes, corredores y directores comerciales.",
                "El alcance queda concentrado en ventas de casas. El modulo de arriendo se mantiene fuera de esta propuesta para proteger el foco comercial y evitar dispersion operativa.",
                "La solucion combina inteligencia de mercado, valorizacion automatica, reporterias y visualizacion ejecutiva para convertir informacion dispersa en decisiones accionables.",
            ],
            [],
            styles,
        )
    )
    story.append(Spacer(1, 0.2 * inch))
    story.append(
        metric_grid(
            [
                ("11", "barrios de Vitacura analizados de forma continua", "75+", "propiedades cargadas como base comercial"),
                ("6", "fuentes integradas para enriquecer el mercado", "100%", "foco en ventas de casas y lectura por barrio"),
            ],
            styles,
        )
    )
    story.append(Spacer(1, 0.2 * inch))
    story.append(
        Paragraph(
            "Objetivo comercial: entregar a N3uralia una propuesta diferencial que permita presentar el producto como una solucion de valor para clientes de alto ticket, con discurso comercial, evidencia visual y una experiencia profesional lista para compartir.",
            styles["BodyCommercial"],
        )
    )
    story.append(PageBreak())
    story.extend(
        text_page_story(
            "Conexiones de datos",
            [
                "La plataforma se conecta directamente a los puntos que hacen operativa la inteligencia comercial. Esto deja claro donde entra la data y como se sostiene la actualizacion continua.",
                "La integracion no es manual: se apoya en rutas y procesos ya definidos para scraping, benchmarking, refresco y monitoreo.",
            ],
            [
                "Conexion directa al scraper principal de propiedades.",
                "Benchmarks separados para Portal y fuentes externas.",
                "Cron jobs para refresco y distribucion automatica.",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 0.12 * inch))
    story.append(data_connections_page(styles))
    story.append(PageBreak())

    page_specs = [
        (
            "Executive dashboard",
            [
                "El dashboard ejecutivo resume el estado del negocio con indicadores simples de leer y utiles para reuniones comerciales, seguimiento interno y presentaciones con clientes.",
                "La pagina esta pensada para mostrar volumen, conversion y ritmo comercial sin saturar la vista, manteniendo una jerarquia visual limpia y directa.",
            ],
            [
                "Visibilidad rapida de ventas, volumen y conversion.",
                "Formato ideal para comites comerciales y seguimiento semanal.",
                "Lectura ejecutiva enfocada en casas y oportunidades de cierre.",
            ],
            "Figura 1: dashboard ejecutivo para lectura rapida de resultados comerciales.",
        ),
        (
            "Market intelligence por barrio",
            [
                "La capa territorial ordena Vitacura por barrios y convierte el mapa en una herramienta comercial, no solo geoespacial. Esto facilita comparaciones, priorizacion y discurso de valor frente al cliente.",
                "Cada zona ayuda a entender donde hay mas presion de mercado, mejor posicionamiento y mayor potencial de cierre en casas.",
            ],
            [
                "Mapa de barrios con lectura comercial inmediata.",
                "Soporte para comparar zonas y ajustar estrategia.",
                "Base solida para conversaciones de pricing y posicionamiento.",
            ],
            "Figura 2: mapa de Vitacura con lectura por barrios y criterios comerciales.",
        ),
        (
            "Benchmark de mercado",
            [
                "La tabla de comparacion permite pasar de una percepcion general a una lectura concreta del mercado. Esto ayuda a justificar precios, detectar brechas y explicar porque una casa esta bien o mal posicionada.",
                "El texto previo a la imagen se amplifico para que la pagina funcione como una pieza comercial y no como un recorte comprimido.",
            ],
            [
                "Precio por metro cuadrado y velocidad de salida.",
                "Comparacion entre barrios con criterio homogeno.",
                "Apoyo directo a evaluaciones comerciales y propuestas.",
            ],
            "Figura 3: benchmarks por barrio para sostener argumentacion comercial.",
        ),
        (
            "Velocidad y absorcion",
            [
                "Este bloque muestra dinamica de mercado y ayuda a distinguir los barrios con mayor rotacion de aquellos donde el inventario tarda mas en moverse.",
                "La lectura es util para ajustar expectativas de venta, definir urgencia y decidir que propiedades conviene priorizar.",
            ],
            [
                "Indicadores de ritmo real del mercado.",
                "Soporte para priorizacion de leads y visitas.",
                "Base para conversaciones de urgencia y ventana de oportunidad.",
            ],
            "Figura 4: velocidad y absorcion como senales de salud comercial.",
        ),
        (
            "Control de gestion",
            [
                "El control de gestion permite bajar la estrategia a seguimiento operativo, con foco en cumplimiento, conversion y performance comercial por responsable.",
                "Esta pagina le da al cliente la sensacion de una solucion completa: no solo datos, sino disciplina de gestion y seguimiento continuo.",
            ],
            [
                "Monitoreo por director o ejecutivo comercial.",
                "Control de metas y desvio respecto a objetivo.",
                "Ideal para reportes mensuales y revision de pipeline.",
            ],
            "Figura 5: tablero de gestion para controlar el desempeno comercial.",
        ),
        (
            "Valorizador inteligente",
            [
                "La valorizacion automatica transforma datos comparables en un precio sugerido mas defendible. Esto reduce friccion en la definicion de oferta y hace mas consistente el discurso comercial.",
                "El objetivo es ayudar a vender casas en Vitacura con mayor precision, mejor narrativa y menor dependencia de estimaciones manuales.",
            ],
            [
                "Precio sugerido basado en multiples variables.",
                "Apoyo para tasacion comercial y presentacion al cliente.",
                "Alineado con el foco exclusivo en ventas de casas.",
            ],
            "Figura 6: valorizador para estimar precios con una base mas objetiva.",
        ),
        (
            "Property loader",
            [
                "La carga de propiedades organiza el inventario con estructura comercial y lo prepara para analisis, comparacion y seguimiento. Esto vuelve la propuesta mas tangible porque muestra datos reales trabajando dentro de la plataforma.",
                "La pagina sirve como prueba de traccion y de capacidad operativa del sistema.",
            ],
            [
                "Inventario real cargado y listo para consulta.",
                "Base util para filtros, analitica y reportes.",
                "Soporte para mostrar que la plataforma ya opera con data concreta.",
            ],
            "Figura 7: inventario cargado para respaldo comercial y analitico.",
        ),
        (
            "Fuentes de datos",
            [
                "El valor de la plataforma aumenta cuando el mercado se alimenta desde varias fuentes y no depende de una sola vista. La integracion de datos hace mas robusta la lectura y mejora la confianza en el resultado.",
                "Esta pagina deja visibles las fuentes de scraping reales para que el cliente entienda de donde sale la data y como se refuerza la cobertura comercial.",
            ],
            [
                "Fuentes activas de scraping y validacion cruzada.",
                "Base para historicidad y consolidacion de mercado.",
                "Mejor calidad de contexto para decisiones comerciales.",
            ],
            "Figura 8: pipeline de fuentes para sostener una vista de mercado mas completa.",
        ),
        (
            "Analytics de conversion",
            [
                "El seguimiento de conversion ayuda a mostrar avance, detectar caidas y sostener una cultura de resultados. Tambien sirve como puente entre analitica y accion comercial diaria.",
                "La pagina esta redactada para sonar a propuesta de negocio y no a documento tecnico.",
            ],
            [
                "Embudo comercial y tendencia de resultados.",
                "Lectura de conversion para equipos de venta.",
                "Apoyo para reportes automaticos y seguimiento semanal.",
            ],
            "Figura 9: conversion y seguimiento para comites comerciales.",
        ),
        (
            "Interfaz publica",
            [
                "La landing sintetiza el valor de la plataforma para una audiencia ejecutiva. Funciona como primera puerta de entrada y ordena el relato comercial con una promesa simple, directa y memorable.",
                "Con el logo visible y la jerarquia de texto ampliada, la pieza queda lista para ser presentada a prospectos o socios.",
            ],
            [
                "Primera impresion clara y profesional.",
                "Soporte para presentacion comercial y demo.",
                "Enfoque en valor, no en complejidad tecnica.",
            ],
            "Figura 10: landing de presentacion para comunicar la propuesta de valor.",
        ),
    ]

    for image_path, spec in zip(image_paths, page_specs):
        title, paragraphs, bullets, caption = spec
        story.extend(image_page_story(title, paragraphs, bullets, image_path, caption, styles))

    story.extend(
        text_page_story(
            "Fuentes de scraping visibles",
            [
                "El pipeline actual se apoya en un conjunto de fuentes externas que cubren casas, barrios y referencia de mercado en Vitacura. Esta seccion hace explicito que la plataforma no depende de una sola pagina.",
                "La combinacion de fuentes permite comparar, deduplicar y sostener la propuesta comercial con evidencia mas amplia.",
            ],
            [
                "Portal Inmobiliario como fuente principal de inventario.",
                "TOCTOC, icasas.cl, Yapo y Chilepropiedades como validacion cruzada.",
                "Enfoque exclusivo en ventas de casas para este documento.",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 0.12 * inch))
    story.append(source_table_page(styles))
    story.append(PageBreak())

    story.extend(
        text_page_story(
            "Agentes y automatizacion",
            [
                "El trabajo de los agentes automatizados ya esta presente en la operacion: scraping, validacion, reportes, refresco de fuentes y monitoreo de salud. Esta pagina lo vuelve visible para que el valor de la plataforma no quede oculto.",
                "En una propuesta comercial, los agentes ayudan a explicar que el sistema no solo muestra datos, sino que trabaja de forma continua para mantener la informacion util y vigente.",
            ],
            [
                "Agente de scraping para capturar nuevas propiedades.",
                "Agente de validacion para controlar duplicados y consistencia.",
                "Agente de reportes para generar entregables semanales.",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 0.12 * inch))
    story.append(agent_table_page(styles))
    story.append(PageBreak())

    story.extend(
        text_page_story(
            "Reportes automaticos",
            [
                "Los reportes no se arman a mano. Un flujo automatizado toma la data, la sintetiza y la transforma en una pieza ejecutiva que puede salir cada semana o cada ciclo definido por el cliente.",
                "El resultado es una entrega consistente, con la misma estructura, pero alimentada por datos reales y actualizados.",
            ],
            [
                "Reporte semanal para directores y equipo comercial.",
                "Narrativa resumida, indicadores y lectura por barrio.",
                "Salida automatica desde el motor de reportes.",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 0.12 * inch))
    story.append(report_flow_page(styles))
    story.append(PageBreak())

    story.extend(
        text_page_story(
            "Arquitectura y cierre",
            [
                "La propuesta se apoya en una arquitectura simple de explicar: datos, analitica, visualizacion y reportes. Esa simplicidad ayuda a vender la solucion a clientes que quieren resultados claros sin necesidad de entrar en detalles tecnicos complejos.",
                "La plataforma queda lista para seguir creciendo con nuevas fuentes y nuevos reportes, manteniendo el foco en Vitacura y en la venta de casas como eje central.",
            ],
            [
                "Entrada desde fuentes reales y actualizacion periodica.",
                "Analisis por barrio con foco en ventas de casas.",
                "Valorizacion y reportes para acelerar decisiones.",
                "Visualizacion ejecutiva para reuniones y seguimiento.",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 0.15 * inch))

    roadmap_data = [
        [
            Paragraph("1. Validacion comercial", styles["RoadmapTitle"]),
            Paragraph("Alinear mensajes, publico objetivo y alcance final de la propuesta.", styles["BodyCommercial"]),
        ],
        [
            Paragraph("2. Ajuste visual", styles["RoadmapTitle"]),
            Paragraph("Consolidar el logo, el tono y la version final de la propuesta comercial.", styles["BodyCommercial"]),
        ],
        [
            Paragraph("3. Entrega y seguimiento", styles["RoadmapTitle"]),
            Paragraph("Publicar la pieza final, compartirla y continuar con la siguiente fase del roadmap.", styles["BodyCommercial"]),
        ],
    ]

    roadmap = Table(roadmap_data, colWidths=[2.3 * inch, 4.55 * inch])
    roadmap.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d7e6e0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d7e6e0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(roadmap)
    story.append(Spacer(1, 0.18 * inch))
    story.append(
        Paragraph(
            "Conclusion: N3uralia queda posicionada como una propuesta seria, comercial y util para vender casas en Vitacura con mejores argumentos, mejor visualizacion y una historia de valor mas convincente para el cliente final.",
            styles["BodyCommercial"],
        )
    )

    return story


def draw_cover(canvas_obj, doc):
    draw_cover_background(canvas_obj, doc)


def build_pdf() -> None:
    ensure_parent(SOURCE_PDF)
    if not SOURCE_PDF.exists():
        raise FileNotFoundError(f"Source PDF not found: {SOURCE_PDF}")
    if not LOGO_PATH.exists():
        raise FileNotFoundError(f"Logo not found: {LOGO_PATH}")

    styles = make_styles()

    with tempfile.TemporaryDirectory() as temp_dir_str:
        temp_dir = Path(temp_dir_str)
        render_logo_path = temp_dir / "n3uralia-logo.png"
        with PILImage.open(LOGO_PATH) as logo_img:
            logo_img.save(render_logo_path)

        global RENDER_LOGO_PATH
        RENDER_LOGO_PATH = render_logo_path

        extracted = extract_images(SOURCE_PDF, temp_dir)
        image_paths = extracted[: len(IMAGE_OUTPUTS)]

        story = build_story(image_paths, styles, render_logo_path)

        tmp_pdf = temp_dir / "propuesta-comercial-vitacura.pdf"
        doc = SimpleDocTemplate(
            str(tmp_pdf),
            pagesize=A4,
            leftMargin=0.62 * inch,
            rightMargin=0.62 * inch,
            topMargin=0.86 * inch,
            bottomMargin=0.75 * inch,
            title="Propuesta Comercial N3uralia",
            author="N3uralia",
        )
        doc.build(story, onFirstPage=draw_cover, onLaterPages=draw_content_chrome)

        for output in OUTPUTS:
            ensure_parent(output)
            shutil.copyfile(tmp_pdf, output)

    print("PDF generado y sincronizado en public/ y docs/")


if __name__ == "__main__":
    build_pdf()
