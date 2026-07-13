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
    DOCS_DIR / "2026-07-13_PC_PropertyPartners.pdf",
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
    story = [
        Spacer(1, 0.5 * inch),
        Image(str(logo_image_path), width=logo_width, height=logo_height),
        Spacer(1, 0.42 * inch),
        Paragraph("Propuesta comercial formal", styles["CoverTitle"]),
        Spacer(1, 0.02 * inch),
        Paragraph("Property Partners Vitacura", styles["CoverSub"]),
        Spacer(1, 0.12 * inch),
        Paragraph(
            "N3uralia presenta una propuesta formal para el desarrollo de una plataforma comercial enfocada en ventas de casas en Vitacura, con informacion de mercado, automatizacion de reportes y soporte para la gestion comercial.",
            styles["CoverSub"],
        ),
        Spacer(1, 0.28 * inch),
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
            Paragraph("Insights ejecutivos por barrio", styles["BodyCommercial"]),
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
        "N3uralia - Property Partners Vitacura",
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
            "Resumen ejecutivo",
            [
                "Esta propuesta formal presenta una plataforma comercial pensada para apoyar la venta de casas en Vitacura con respaldo de datos, lectura territorial y una narrativa ejecutiva clara.",
                "El alcance queda concentrado exclusivamente en ventas de casas. El modulo de arriendo se mantiene fuera de este documento para conservar foco comercial y consistencia en la propuesta.",
                "La solucion integra captura de datos, validacion, analisis, valorizacion y reportes automaticos para convertir informacion dispersa en material util para reuniones, seguimiento y presentaciones comerciales.",
            ],
            [],
            styles,
        )
    )
    story.append(Spacer(1, 0.2 * inch))
    story.append(
        Paragraph(
            "Objetivo comercial: entregar a Property Partners Vitacura una herramienta de presentacion clara, ordenada y profesional, orientada a clientes y equipos comerciales que necesitan una lectura consistente del mercado.",
            styles["BodyCommercial"],
        )
    )
    story.append(PageBreak())
    story.extend(
        text_page_story(
            "Fuentes y alcance de datos",
            [
                "La plataforma se apoya en fuentes de mercado y procesos de scraping para sostener una lectura actualizada del segmento. Esto permite comparar casas, barrios y referencias comerciales sin depender de una sola fuente.",
                "El documento expone la procedencia de la informacion de manera simple para que el cliente entienda de donde sale la data y como se valida antes de presentarse.",
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
    story.extend(
        text_page_story(
            "Operacion y automatizacion",
            [
                "El trabajo automatizado cubre captura, validacion, analisis y generacion de reportes. De este modo la informacion puede mantenerse actualizada sin depender de procesos manuales repetitivos.",
                "Los agentes trabajan en segundo plano para ordenar la data, detectar inconsistencias y transformar el resultado en una salida util para uso comercial.",
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
    story.extend(
        text_page_story(
            "Inversion y condiciones comerciales",
            [
                "La propuesta se presenta con una inversion cerrada y facil de explicar, alineada con el alcance comercial y el tipo de entrega esperado para Property Partners Vitacura.",
                "El objetivo es dejar clara la estructura economica del proyecto desde el inicio, con un valor unico, un plazo definido y una forma de pago simple de administrar.",
            ],
            [
                "Valor del proyecto: CLP $5.000.000.",
                "Plazo de ejecucion: 2 meses.",
                "Forma de pago: 50% al inicio y 50% contra entrega.",
                "Soporte mensual opcional disponible por CLP $500.000 + IVA / mes para ajustes, mantenimiento y mejoras menores.",
            ],
            styles,
        )
    )
    story.append(PageBreak())

    story.extend(
        text_page_story(
            "Cierre comercial",
            [
                "Esta propuesta presenta a Property Partners Vitacura como una herramienta comercial clara, ordenada y lista para apoyar la venta de casas en Vitacura.",
                "El documento sintetiza la propuesta de valor sin entrar en detalle tecnico, para que pueda ser compartido con prospectos, socios o equipos comerciales de forma directa y profesional.",
            ],
            [
                "Enfoque exclusivo en ventas de casas en Vitacura.",
                "Lectura clara por barrio, oportunidad y posicionamiento.",
                "Base preparada para evolucionar con nuevas fuentes y reportes.",
            ],
            styles,
        )
    )
    story.append(
        Paragraph(
            "Agradecemos la oportunidad de presentar esta propuesta. N3uralia queda disponible para coordinar la validacion, el kickoff y el inicio del trabajo una vez aprobado el alcance.",
            styles["BodyCommercial"],
        )
    )
    story.append(Spacer(1, 0.12 * inch))
    story.append(Paragraph("Datos de contacto", styles["RoadmapTitle"]))
    story.append(Paragraph("Juan Vial Comber", styles["BodyCommercial"]))
    story.append(Paragraph("CEO de N3uralia", styles["BodyCommercial"]))
    story.append(Paragraph("juan@n3uralia.com", styles["BodyCommercial"]))
    story.append(Paragraph("WhatsApp: +56 9 9382 6127", styles["BodyCommercial"]))

    return story


def draw_cover(canvas_obj, doc):
    draw_cover_background(canvas_obj, doc)


def build_pdf() -> None:
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

        story = build_story([], styles, render_logo_path)

        tmp_pdf = temp_dir / "propuesta-comercial-vitacura.pdf"
        doc = SimpleDocTemplate(
            str(tmp_pdf),
            pagesize=A4,
            leftMargin=0.62 * inch,
            rightMargin=0.62 * inch,
            topMargin=0.86 * inch,
            bottomMargin=0.75 * inch,
            title="Property Partners Vitacura",
            author="Property Partners Vitacura",
        )
        doc.build(story, onFirstPage=draw_cover, onLaterPages=draw_content_chrome)

        for output in OUTPUTS:
            ensure_parent(output)
            shutil.copyfile(tmp_pdf, output)

    print("PDF generado y sincronizado en public/ y docs/")


if __name__ == "__main__":
    build_pdf()
