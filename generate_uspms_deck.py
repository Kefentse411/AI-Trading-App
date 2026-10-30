from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

# ---------------- COLORS & STYLE ----------------
BG          = RGBColor(0x07, 0x0B, 0x12)
CARD_BG     = RGBColor(0x0E, 0x14, 0x20)
CARD_BORDER = RGBColor(0x22, 0x2C, 0x3D)
LINE_GRAY   = RGBColor(0x2A, 0x33, 0x44)
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
GRAY        = RGBColor(0x9A, 0xA3, 0xB2)
LIGHT_GRAY  = RGBColor(0xC7, 0xCD, 0xD6)
BLUE        = RGBColor(0x3E, 0x7B, 0xFA)
RED         = RGBColor(0xE0, 0x3E, 0x3E)
FONT        = "Arial"          # swap for "Montserrat" / "Poppins" if installed

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]

def IN(v): return Inches(v)

def new_slide():
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = BG
    return s

def add_rect(slide, x, y, w, h, fill_color, line_color=None, line_width=0.75):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, IN(x), IN(y), IN(w), IN(h))
    shp.fill.solid(); shp.fill.fore_color.rgb = fill_color
    if line_color:
        shp.line.color.rgb = line_color
        shp.line.width = Pt(line_width)
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp

def add_text(slide, x, y, w, h, text, size, color, bold=False,
             align=PP_ALIGN.LEFT, font_name=FONT, line_spacing=1.05):
    tb = slide.shapes.add_textbox(IN(x), IN(y), IN(w), IN(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size); r.font.bold = bold
        r.font.name = font_name; r.font.color.rgb = color
    return tb

def add_transition_fade(slide):
    sld = slide._element
    transition = sld.makeelement(qn('p:transition'), {})
    transition.append(sld.makeelement(qn('p:fade'), {}))
    sld.append(transition)

NAV_ITEMS = ["PROBLEM", "SOLUTION", "SYSTEM", "IMPACT"]
NAV_X = {"PROBLEM": 6.15, "SOLUTION": 7.75, "SYSTEM": 9.35, "IMPACT": 10.75}

def add_nav(slide, active=None, page=None):
    logo = slide.shapes.add_shape(MSO_SHAPE.OVAL, IN(0.55), IN(0.42), IN(0.26), IN(0.26))
    logo.fill.background(); logo.line.color.rgb = BLUE; logo.line.width = Pt(1.5)
    logo.shadow.inherit = False
    dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, IN(0.62), IN(0.49), IN(0.12), IN(0.12))
    dot.fill.solid(); dot.fill.fore_color.rgb = RED; dot.line.fill.background()
    dot.shadow.inherit = False
    add_text(slide, 0.92, 0.42, 3.6, 0.3, "EDGE TECH   ·   USPMS", 13, WHITE, bold=True)
    if active:
        for item in NAV_ITEMS:
            is_active = (item == active)
            add_text(slide, NAV_X[item], 0.46, 1.3, 0.3, item, 11,
                      WHITE if is_active else GRAY, bold=is_active)
            if is_active:
                add_rect(slide, NAV_X[item], 0.80, 0.78, 0.02, RED)
        ratio = page / 7 if page else 0
        add_rect(slide, 12.1, 0.30, 0.85, 0.035, LINE_GRAY)
        add_rect(slide, 12.1, 0.30, 0.85 * ratio, 0.035, BLUE)
    if page:
        add_text(slide, 11.9, 6.98, 1.1, 0.3, f"{page:02d} / 07", 11, GRAY, align=PP_ALIGN.RIGHT)

def add_section_header(slide, number, label, heading, subtext, heading_size=32, start_y=1.5):
    add_text(slide, 0.65, start_y, 6.5, 0.35, f"{number} — {label}", 13, WHITE, bold=True)
    y_line = start_y + 0.4
    add_rect(slide, 0.65, y_line, 5.5, 0.012, LINE_GRAY)
    add_rect(slide, 0.65, y_line, 1.15, 0.02, RED)
    y_heading = y_line + 0.25
    lines = heading if isinstance(heading, list) else [heading]
    heading_h = 0.6 * len(lines)
    add_text(slide, 0.62, y_heading, 11.8, heading_h, "\n".join(lines),
              heading_size, WHITE, bold=True, line_spacing=1.0)
    y_sub = y_heading + heading_h + 0.05
    add_text(slide, 0.65, y_sub, 11.0, 0.5, subtext, 13, GRAY)
    return y_sub + 0.45

def add_bar_card(slide, x, y, w, h, bar_color, title, desc, title_size=14, desc_size=11):
    add_rect(slide, x, y, w, h, CARD_BG, line_color=CARD_BORDER)
    add_rect(slide, x, y, 0.04, h, bar_color)
    add_text(slide, x + 0.28, y + 0.18, w - 0.5, 0.35, title, title_size, WHITE, bold=True)
    add_text(slide, x + 0.28, y + 0.55, w - 0.5, h - 0.7, desc, desc_size, GRAY)

def add_numbered_card(slide, x, y, w, h, accent_color, number, title, desc):
    add_rect(slide, x, y, w, h, CARD_BG, line_color=CARD_BORDER)
    box = 0.4
    add_rect(slide, x + 0.25, y + 0.22, box, box, CARD_BG, line_color=accent_color, line_width=1.5)
    add_text(slide, x + 0.25, y + 0.27, box, 0.3, number, 11, accent_color, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, x + 0.8, y + 0.24, w - 1.0, 0.4, title, 15, WHITE, bold=True)
    add_text(slide, x + 0.25, y + 0.8, w - 0.5, h - 0.95, desc, 11, GRAY)

def add_band(slide, x, y, w, h, bar_color, label, items):
    add_rect(slide, x, y, w, h, RGBColor(0x0A, 0x0F, 0x18), line_color=CARD_BORDER)
    add_rect(slide, x, y, 0.04, h, bar_color)
    add_text(slide, x + 0.25, y + h / 2 - 0.15, 1.7, 0.3, label, 12, WHITE, bold=True)
    n = len(items)
    box_x = x + 2.1
    gap = 0.12
    total_w = w - 2.1 - 0.25
    box_w = (total_w - gap * (n - 1)) / n
    for i, item in enumerate(items):
        bx = box_x + i * (box_w + gap)
        add_rect(slide, bx, y + 0.13, box_w, h - 0.26, RGBColor(0x10, 0x16, 0x22), line_color=CARD_BORDER, line_width=0.5)
        add_text(slide, bx + 0.12, y + h / 2 - 0.16, box_w - 0.24, 0.35, item, 10.5, LIGHT_GRAY)

# ============= SLIDE 1 — COVER =============
s = new_slide()
logo = s.shapes.add_shape(MSO_SHAPE.OVAL, IN(0.55), IN(0.42), IN(0.26), IN(0.26))
logo.fill.background(); logo.line.color.rgb = BLUE; logo.line.width = Pt(1.5); logo.shadow.inherit = False
dot = s.shapes.add_shape(MSO_SHAPE.OVAL, IN(0.62), IN(0.49), IN(0.12), IN(0.12))
dot.fill.solid(); dot.fill.fore_color.rgb = RED; dot.line.fill.background(); dot.shadow.inherit = False
add_text(s, 0.92, 0.42, 3, 0.3, "EDGE TECH", 13, WHITE, bold=True)
add_text(s, 8.5, 0.45, 4.3, 0.3, "CSIS3724   ·   SOFTWARE ENGINEERING", 10.5, GRAY, align=PP_ALIGN.RIGHT, bold=True)

add_text(s, 0.65, 1.55, 5, 0.3, "PROJECT PROPOSAL   ·   2026", 12, WHITE, bold=True)
add_rect(s, 0.65, 1.92, 5.0, 0.012, LINE_GRAY)
add_rect(s, 0.65, 1.92, 1.15, 0.02, RED)

add_text(s, 0.6, 2.3, 7.2, 2.4,
    "University Smart\nParking & Permit\nManagement System", 40, WHITE, bold=True, line_spacing=1.0)

add_text(s, 0.65, 5.0, 3, 0.4, "USPMS", 20, BLUE, bold=True)
add_text(s, 0.65, 5.5, 6.3, 0.8,
    "A schedule-driven platform that turns fixed campus parking capacity into a bookable,\nenforceable resource.", 13, GRAY)

cx, cy, cw, ch = 8.05, 1.7, 4.65, 5.35
add_rect(s, cx, cy, cw, ch, CARD_BG, line_color=CARD_BORDER)
add_text(s, cx + 0.3, cy + 0.3, 3.5, 0.35, "TEAM — EDGE TECH", 13, WHITE, bold=True)
add_rect(s, cx + 0.3, cy + 0.72, cw - 0.6, 0.02, RED)
add_text(s, cx + 0.3, cy + 0.9, 2.6, 0.3, "STUDENT NAME", 9.5, GRAY, bold=True)
add_text(s, cx + cw - 2.0, cy + 0.9, 1.7, 0.3, "STUDENT NO.", 9.5, GRAY, bold=True, align=PP_ALIGN.RIGHT)
add_rect(s, cx + 0.3, cy + 1.25, cw - 0.6, 0.01, LINE_GRAY)

students = [
    ("Kefentse Charlie", "2025752144"), ("Mogau Morifi", "2023624147"),
    ("Siyabonga Mahlalela", "2022036475"), ("Tumelo Hlongwane", "2026051801"),
    ("Sbusiso Feni", "2023352418"),
]
ry = cy + 1.4
for name, num in students:
    add_text(s, cx + 0.3, ry, 2.6, 0.35, name, 14, WHITE, bold=True)
    add_text(s, cx + cw - 2.0, ry, 1.7, 0.35, num, 14, BLUE, align=PP_ALIGN.RIGHT)
    ry += 0.42
    add_rect(s, cx + 0.3, ry - 0.05, cw - 0.6, 0.01, LINE_GRAY)
add_text(s, cx + 0.3, cy + ch - 0.45, 3.5, 0.3, "University of the Free State", 10.5, GRAY)
add_transition_fade(s)

# ============= SLIDE 2 — PROBLEM (01) =============
s = new_slide()
add_nav(s, "PROBLEM", 1)
add_rect(s, 0, 1.5, 5.2, 0.04, BLUE)
add_rect(s, 0, 1.54, 5.2, 5.85, RGBColor(0x1B, 0x2A, 0x3D))
add_text(s, 0.3, 4.2, 4.6, 0.6, "[ Campus parking lot photo ]", 12, LIGHT_GRAY, align=PP_ALIGN.CENTER)

add_text(s, 6.0, 1.97, 4, 0.3, "01 — THE PROBLEM", 13, WHITE, bold=True)
add_rect(s, 6.0, 2.35, 1.15, 0.02, RED)
add_text(s, 5.95, 2.6, 6.8, 2.1, "Parking is a time\nproblem, not only a\nspace problem.", 34, WHITE, bold=True, line_spacing=1.0)
add_text(s, 6.0, 4.85, 6.9, 1.1,
    "Enrolment and car ownership grow every semester while the physical capacity of campus "
    "lots stays fixed — producing congestion, lateness and unauthorised parking that no amount "
    "of paper permits can resolve.", 13, GRAY)

problems = [
    ("01", "Manual permits", "Paper checks and queues at entry points"),
    ("02", "Peak-hour collapse", "Lecture blocks overload lots that idle later"),
    ("03", "Dead capacity", "All-day parking for a two-hour lecture"),
]
py = 6.05
for num, title, desc in problems:
    add_text(s, 6.0, py, 0.5, 0.35, num, 13, RED, bold=True)
    add_text(s, 6.6, py, 3.0, 0.35, title, 14, WHITE, bold=True)
    add_text(s, 9.4, py, 3.5, 0.35, desc, 12, GRAY)
    add_rect(s, 6.0, py + 0.4, 7.0, 0.01, LINE_GRAY)
    py += 0.55
add_transition_fade(s)

# ============= SLIDE 3 — SYSTEM OVERVIEW (02) =============
s = new_slide()
add_nav(s, "SOLUTION", 2)
add_section_header(s, "02", "SYSTEM OVERVIEW",
    ["One centralized platform for", "the whole campus."],
    "USPMS replaces paper permits and guesswork with a single digital system for applications,\n"
    "bookings, access control and enforcement.", heading_size=32)

cw2 = 3.55
add_bar_card(s, 0.65, 4.85, cw2, 1.9, BLUE, "ADMINISTRATORS",
    "Define zones and restrictions · review, accept or reject permit applications · manage "
    "user accounts · oversee enforcement")
add_bar_card(s, 0.65 + cw2 + 0.25, 4.85, cw2, 1.9, RED, "REGULAR USERS",
    "Staff, commuter and residential students, and guests — apply for permits, book spaces "
    "and receive live status updates")

rx, ry2, rw, rh = 8.05, 1.7, 4.65, 5.35
add_rect(s, rx, ry2, rw, rh, CARD_BG, line_color=CARD_BORDER)
add_text(s, rx + 0.3, ry2 + 0.25, 3.8, 0.3, "THE HYBRID PARKING MODEL", 12.5, RED, bold=True)
add_rect(s, rx + 0.3, ry2 + 0.62, rw - 0.6, 0.02, RED)

items = [
    (BLUE, "Permanent allocation", "Staff and premium users hold dedicated bays as per university policy."),
    (BLUE, "Schedule-based booking", "Students and guests reserve a space for a specific time window."),
    (BLUE, "Live interactive map", "Real-time availability per zone, including how long each bay stays free."),
    (RED, "Automated enforcement", "Violations are logged against the profile and a fine is generated digitally."),
    (BLUE, "Notifications & alerts", "Permit expiry, booking reminders and overtime warnings keep users compliant."),
]
iy = ry2 + 0.85
for color, title, desc in items:
    add_rect(s, rx + 0.3, iy, 0.03, 0.32, color)
    add_text(s, rx + 0.5, iy - 0.03, rw - 0.9, 0.3, title, 13, WHITE, bold=True)
    add_text(s, rx + 0.5, iy + 0.27, rw - 0.9, 0.5, desc, 10.5, GRAY)
    iy += 0.85
add_transition_fade(s)

# ============= SLIDE 4 — HOW IT WORKS (03) =============
s = new_slide()
add_nav(s, "SOLUTION", 3)
add_section_header(s, "03", "HOW IT WORKS",
    "Schedule-driven allocation, end to end.",
    "Weekly timetables become a demand forecast, and every bay becomes a bookable resource per time window.",
    heading_size=32)

steps = [
    ("01", "Import schedule", "Students and guests enter or import weekly days, times and campus location.", BLUE),
    ("02", "Forecast demand", "The system estimates drivers per time block, e.g. Mon 08:00–10:00.", BLUE),
    ("03", "Book a window", "One bay serves several users a day — book Spot A from 09:00–11:30.", BLUE),
    ("04", "Check in", "Arrival confirmed by QR scan, plate recognition or gate entry.", BLUE),
    ("05", "Auto-release", "No-shows expire after a grace period and pass to the waitlist.", RED),
]
cw3, gap3, x0, y0, h0 = 2.15, 0.18, 0.65, 4.1, 2.15
for i, (num, title, desc, color) in enumerate(steps):
    x = x0 + i * (cw3 + gap3)
    add_rect(s, x, y0, cw3, 0.035, color)
    add_text(s, x, y0 + 0.2, cw3, 0.45, num, 22, color, bold=True)
    add_text(s, x, y0 + 0.75, cw3, 0.5, title, 14.5, WHITE, bold=True)
    add_text(s, x, y0 + 1.25, cw3, 0.9, desc, 10.5, GRAY)
    if i < len(steps) - 1:
        add_text(s, x + cw3 + 0.01, y0 + 0.9, 0.16, 0.3, "›", 16, GRAY, align=PP_ALIGN.CENTER)

cy2 = y0 + h0 + 0.2
add_rect(s, 0.65, cy2, 11.9, 0.9, RGBColor(0x0C, 0x12, 0x1C), line_color=CARD_BORDER)
add_rect(s, 0.65, cy2, 0.03, 0.9, RED)
add_text(s, 0.9, cy2 + 0.12, 3, 0.3, "CAPACITY RULE", 12, RED, bold=True)
add_text(s, 0.9, cy2 + 0.42, 11.4, 0.4,
    "For any time slot, bookings ≤ available spaces — at capacity USPMS offers another slot, "
    "another zone, or a place on the waitlist.", 11.5, GRAY)
add_transition_fade(s)

# ============= SLIDE 5 — KEY FEATURES (04) =============
s = new_slide()
add_nav(s, "SYSTEM", 4)
add_section_header(s, "04", "KEY FEATURES",
    "Core functionality of the system.",
    "A mobile-first client backed by permit, access and enforcement services.", heading_size=32)

features = [
    ("01", "Scheduling app", "Monthly, weekly and annual activity schedules that update against live database availability.", BLUE),
    ("02", "Permit management", "Application, verification and administration of permits with Protection Services.", RED),
    ("03", "QR gate access", "Scan at boom gates to verify availability and zone permission — fewer attendants needed.", BLUE),
    ("04", "Notifications", "SMTP activity summaries, lot-fullness and event congestion alerts, policy guidance.", RED),
    ("05", "Location history", "Opt-in visit patterns recommend bays closest to a user's frequent campus areas.", BLUE),
    ("06", "Violation logging", "Invalid or restricted parking is logged automatically and a fine is raised on the profile.", RED),
]
cols, card_w, card_h, gx, gy, sx, sy = 3, 3.75, 1.55, 0.2, 0.2, 0.65, 3.75
for idx, (num, title, desc, color) in enumerate(features):
    r, c = divmod(idx, cols)
    x = sx + c * (card_w + gx)
    y = sy + r * (card_h + gy)
    add_numbered_card(s, x, y, card_w, card_h, color, num, title, desc)
add_transition_fade(s)

# ============= SLIDE 6 — ARCHITECTURE (05) =============
s = new_slide()
add_nav(s, "SYSTEM", 5)
add_section_header(s, "05", "ARCHITECTURE",
    "Cloud-native, no local servers.",
    "Existing university infrastructure and IT support operate the system; the DBMS updates on every lot entry and exit.",
    heading_size=32)

bands = [
    (BLUE, "CLIENT", ["Mobile application", "Web dashboards", "Live availability map"]),
    (BLUE, "CLOUD SERVICES", ["Booking & capacity engine", "Permit & verification service", "Enforcement / fines", "Notifications (SMTP)"]),
    (BLUE, "DATA LAYER", ["Cloud DBMS — entry/exit updates", "Permits, profiles, bookings", "Analytics & reporting store"]),
    (RED, "EDGE INPUTS", ["QR boom-gate control", "CCTV + AI vehicle counting", "GPS / OSM / Sentinel imagery"]),
]
yb, bh = 3.65, 0.72
for i, (color, label, items) in enumerate(bands):
    add_band(s, 0.65, yb, 11.9, bh, color, label, items)
    if i < len(bands) - 1:
        add_text(s, 6.5, yb + bh, 0.5, 0.15, "▾", 10, GRAY, align=PP_ALIGN.CENTER)
    yb += bh + 0.12

add_rect(s, 0.65, yb + 0.05, 11.9, 0.55, RGBColor(0x0C, 0x12, 0x1C), line_color=CARD_BORDER)
add_rect(s, 0.65, yb + 0.05, 0.03, 0.55, WHITE)
add_text(s, 0.9, yb + 0.2, 11.3, 0.35,
    "Scalable by design — the university hosts nothing locally, and capacity grows with enrolment each semester.",
    11.5, GRAY)
add_transition_fade(s)

# ============= SLIDE 7 — STAKEHOLDERS (06) =============
s = new_slide()
add_nav(s, "SYSTEM", 6)
add_section_header(s, "06", "STAKEHOLDERS",
    "Who the system serves.",
    "Nine stakeholder groups, each with a defined role and level of access inside USPMS.", heading_size=32)

stakeholders = [
    (WHITE, "Parking users", "Find, book and manage a parking space"),
    (BLUE, "Administrators", "Manage zones, permits and the platform"),
    (RED, "Parking attendants", "Assist drivers and monitor parking areas"),
    (WHITE, "Parking owners", "The organisation owning the facility"),
    (BLUE, "Security personnel", "Watch for theft and unauthorised behaviour"),
    (RED, "System developers", "Build, maintain and fix the platform"),
    (WHITE, "Payment provider", "Process electronic parking payments"),
    (BLUE, "Local government", "Regulates parking rules and permits"),
    (RED, "Maintenance staff", "Service gates, signage and equipment"),
]
cols2, cw4, ch4, gx2, gy2, sx2, sy2 = 3, 3.75, 1.15, 0.2, 0.15, 0.65, 3.75
for idx, (color, title, desc) in enumerate(stakeholders):
    r, c = divmod(idx, cols2)
    x = sx2 + c * (cw4 + gx2)
    y = sy2 + r * (ch4 + gy2)
    add_bar_card(s, x, y, cw4, ch4, color, title, desc, title_size=14, desc_size=11)
add_transition_fade(s)

prs.save("USPMS_Presentation.pptx")
print("Done! File saved as USPMS_Presentation.pptx")