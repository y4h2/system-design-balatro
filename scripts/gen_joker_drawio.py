"""Generate 20 dark-themed draw.io architecture diagrams for joker cards."""
import os
import textwrap

OUTDIR = os.path.join(os.path.dirname(__file__), "../src/web/assets/jokers")

# Dark theme palette (matches game aesthetic)
BG = "#0F172A"
BLUE = "#60A5FA"; BLUE_FILL = "#1E3A5F"
GREEN = "#34D399"; GREEN_FILL = "#134E3A"
AMBER = "#FBBF24"; AMBER_FILL = "#4E3B10"
RED = "#F87171"; RED_FILL = "#5C1D1D"
PURPLE = "#A78BFA"; PURPLE_FILL = "#3B2D6B"
CYAN = "#22D3EE"; CYAN_FILL = "#0E3D4A"
PINK = "#F472B6"; PINK_FILL = "#5C1D3B"
TEXT = "#F1F5F9"
MUTED = "#94A3B8"
EDGE_COLOR = "#475569"

def esc(label):
    """Escape label for XML attribute: newlines → &lt;br&gt; for html mode."""
    return label.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "&lt;br&gt;")

def node(id, label, x, y, w, h, fill, stroke, shape="rounded=1", extra=""):
    style = f"{shape};fillColor={fill};strokeColor={stroke};fontColor={TEXT};fontSize=10;fontStyle=1;whiteSpace=wrap;html=1;{extra}"
    return f'    <mxCell id="{id}" value="{esc(label)}" style="{style}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def db(id, label, x, y, w=70, h=50, fill=GREEN_FILL, stroke=GREEN):
    style = f"shape=cylinder3;size=8;fillColor={fill};strokeColor={stroke};fontColor={TEXT};fontSize=9;fontStyle=1;whiteSpace=wrap;html=1;"
    return f'    <mxCell id="{id}" value="{esc(label)}" style="{style}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def edge(id, src, tgt, label="", color=EDGE_COLOR, dashed=0):
    dash = "dashed=1;dashPattern=4 4;" if dashed else ""
    lbl = f' value="{label}"' if label else ' value=""'
    style = f"edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor={color};fontColor={MUTED};fontSize=8;{dash}endArrow=block;endFill=1;"
    return f'    <mxCell id="{id}"{lbl} style="{style}" edge="1" parent="1" source="{src}" target="{tgt}"><mxGeometry relative="1" as="geometry"/></mxCell>'

def container(id, label, x, y, w, h, fill="#1E293B", stroke="#334155"):
    style = f"rounded=1;fillColor={fill};strokeColor={stroke};fontColor={MUTED};fontSize=9;fontStyle=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=4;container=1;collapsible=0;html=1;whiteSpace=wrap;"
    return f'    <mxCell id="{id}" value="{label}" style="{style}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def wrap(cells):
    return textwrap.dedent(f"""\
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="8" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" background="{BG}">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
    {chr(10).join(cells)}
      </root>
    </mxGraphModel>""")

# ── 20 diagrams ──

def jk_sla_maniac():
    """HA: dual-zone + heartbeat + auto-failover"""
    return wrap([
        container("2", "Zone A", 10, 10, 120, 190, "#1E293B"),
        container("3", "Zone B", 170, 10, 120, 190, "#1E293B"),
        node("4", "LB", 30, 40, 80, 30, BLUE_FILL, BLUE),
        node("5", "App-1", 30, 90, 80, 30, GREEN_FILL, GREEN),
        db("6", "DB-M", 40, 140, 60, 40),
        node("7", "LB", 190, 40, 80, 30, BLUE_FILL, BLUE),
        node("8", "App-2", 190, 90, 80, 30, GREEN_FILL, GREEN),
        db("9", "DB-S", 200, 140, 60, 40),
        edge("10", "4", "5"), edge("11", "5", "6"),
        edge("12", "7", "8"), edge("13", "8", "9"),
        edge("14", "6", "9", "sync", AMBER, dashed=1),
        edge("15", "4", "7", "heartbeat", RED, dashed=1),
    ])

def jk_data_hoarder():
    """Data lake: multi-source → big storage"""
    return wrap([
        node("2", "App DB", 10, 10, 60, 28, BLUE_FILL, BLUE),
        node("3", "Logs", 10, 50, 60, 28, PURPLE_FILL, PURPLE),
        node("4", "Events", 10, 90, 60, 28, CYAN_FILL, CYAN),
        node("5", "Files", 10, 130, 60, 28, PINK_FILL, PINK),
        node("6", "Ingest", 100, 55, 60, 50, AMBER_FILL, AMBER),
        db("7", "Data\nLake", 190, 40, 90, 80, GREEN_FILL, GREEN),
        node("8", "Query", 200, 150, 70, 30, BLUE_FILL, BLUE),
        edge("10", "2", "6"), edge("11", "3", "6"),
        edge("12", "4", "6"), edge("13", "5", "6"),
        edge("14", "6", "7"), edge("15", "7", "8"),
    ])

def jk_cloud_native():
    """K8s: nodes, pods, service"""
    return wrap([
        container("2", "K8s Cluster", 10, 10, 270, 180),
        node("3", "Ingress", 100, 30, 80, 28, AMBER_FILL, AMBER),
        node("4", "Svc", 100, 70, 80, 28, BLUE_FILL, BLUE),
        container("5", "Node 1", 20, 110, 120, 70, "#1a2744", "#334155"),
        container("6", "Node 2", 150, 110, 120, 70, "#1a2744", "#334155"),
        node("7", "Pod", 30, 130, 45, 24, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("8", "Pod", 85, 130, 45, 24, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("9", "Pod", 160, 130, 45, 24, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("10", "Pod", 215, 130, 45, 24, GREEN_FILL, GREEN, extra="fontSize=8;"),
        edge("11", "3", "4"), edge("12", "4", "7"), edge("13", "4", "9"),
    ])

def jk_pattern_amp():
    """Design pattern UML: observer"""
    return wrap([
        node("2", "«interface»\nObserver", 80, 10, 120, 40, PURPLE_FILL, PURPLE, extra="fontSize=9;"),
        node("3", "Subject", 80, 80, 120, 35, BLUE_FILL, BLUE),
        node("4", "ConcreteA", 10, 150, 90, 30, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("5", "ConcreteB", 120, 150, 90, 30, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("6", "State", 230, 80, 60, 35, AMBER_FILL, AMBER, extra="fontSize=8;"),
        edge("7", "3", "2", "notifies"),
        edge("8", "4", "2", "", PURPLE, dashed=1),
        edge("9", "5", "2", "", PURPLE, dashed=1),
        edge("10", "3", "6"),
    ])

def jk_combo_king():
    """Service mesh: sidecar proxies"""
    return wrap([
        node("2", "Gateway", 100, 10, 80, 30, AMBER_FILL, AMBER),
        node("3", "Svc-A", 20, 70, 60, 28, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("4", "Svc-B", 110, 70, 60, 28, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("5", "Svc-C", 200, 70, 60, 28, PURPLE_FILL, PURPLE, extra="fontSize=8;"),
        node("6", "Proxy", 20, 115, 60, 20, RED_FILL, RED, extra="fontSize=7;"),
        node("7", "Proxy", 110, 115, 60, 20, RED_FILL, RED, extra="fontSize=7;"),
        node("8", "Proxy", 200, 115, 60, 20, RED_FILL, RED, extra="fontSize=7;"),
        node("9", "Control Plane", 70, 160, 140, 28, CYAN_FILL, CYAN),
        edge("10", "2", "3"), edge("11", "2", "4"), edge("12", "2", "5"),
        edge("13", "3", "6"), edge("14", "4", "7"), edge("15", "5", "8"),
        edge("16", "6", "9", "", MUTED, dashed=1),
        edge("17", "7", "9", "", MUTED, dashed=1),
        edge("18", "8", "9", "", MUTED, dashed=1),
        edge("19", "6", "7", "", RED, dashed=1), edge("20", "7", "8", "", RED, dashed=1),
    ])

def jk_card_counter():
    """Monitoring: Prometheus + Grafana"""
    return wrap([
        node("2", "App-1", 10, 10, 55, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("3", "App-2", 75, 10, 55, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("4", "App-3", 140, 10, 55, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("5", "Exporter", 10, 55, 55, 22, GREEN_FILL, GREEN, extra="fontSize=7;"),
        node("6", "Exporter", 75, 55, 55, 22, GREEN_FILL, GREEN, extra="fontSize=7;"),
        node("7", "Exporter", 140, 55, 55, 22, GREEN_FILL, GREEN, extra="fontSize=7;"),
        db("8", "Prometheus", 50, 95, 100, 45, AMBER_FILL, AMBER),
        node("9", "Grafana", 50, 160, 100, 30, PURPLE_FILL, PURPLE),
        node("10", "AlertMgr", 180, 110, 70, 28, RED_FILL, RED, extra="fontSize=8;"),
        edge("11", "2", "5"), edge("12", "3", "6"), edge("13", "4", "7"),
        edge("14", "5", "8"), edge("15", "6", "8"), edge("16", "7", "8"),
        edge("17", "8", "9"), edge("18", "8", "10", "alert", RED),
    ])

def jk_reroll_master():
    """Blue-green deployment"""
    return wrap([
        node("2", "LB / Router", 80, 10, 120, 30, AMBER_FILL, AMBER),
        container("3", "Blue (Active)", 10, 65, 120, 120, "#132744", BLUE),
        container("4", "Green (Idle)", 150, 65, 120, 120, "#13372A", GREEN),
        node("5", "v1.2", 30, 90, 80, 28, BLUE_FILL, BLUE, extra="fontSize=9;"),
        node("6", "v1.2", 30, 130, 80, 28, BLUE_FILL, BLUE, extra="fontSize=9;"),
        node("7", "v1.3", 170, 90, 80, 28, GREEN_FILL, GREEN, extra="fontSize=9;"),
        node("8", "v1.3", 170, 130, 80, 28, GREEN_FILL, GREEN, extra="fontSize=9;"),
        edge("9", "2", "5", "100%", BLUE),
        edge("10", "2", "7", "0%", GREEN, dashed=1),
    ])

def jk_gold_mine():
    """ETL pipeline → gold"""
    return wrap([
        node("2", "Extract", 10, 10, 70, 35, BLUE_FILL, BLUE),
        node("3", "Transform", 100, 10, 80, 35, PURPLE_FILL, PURPLE),
        node("4", "Load", 200, 10, 70, 35, GREEN_FILL, GREEN),
        db("5", "Raw", 20, 70, 50, 35, CYAN_FILL, CYAN),
        db("6", "Clean", 115, 70, 50, 35, AMBER_FILL, AMBER),
        db("7", "Gold", 210, 70, 50, 35, AMBER_FILL, AMBER),
        node("8", "Analytics", 100, 130, 90, 30, AMBER_FILL, AMBER),
        edge("9", "2", "3"), edge("10", "3", "4"),
        edge("11", "2", "5"), edge("12", "3", "6"), edge("13", "4", "7"),
        edge("14", "7", "8"),
    ])

def jk_all_in():
    """Monolith: one giant box"""
    return wrap([
        node("2", "Client", 90, 10, 100, 28, CYAN_FILL, CYAN),
        container("3", "Monolith", 20, 55, 240, 140, "#1E293B", AMBER),
        node("4", "Auth", 30, 80, 65, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("5", "Users", 105, 80, 65, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("6", "Orders", 180, 80, 65, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("7", "Payment", 30, 120, 65, 25, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("8", "Search", 105, 120, 65, 25, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("9", "Notify", 180, 120, 65, 25, GREEN_FILL, GREEN, extra="fontSize=8;"),
        db("10", "Single DB", 90, 160, 100, 40),
        edge("11", "2", "3"),
    ])

def jk_minimalist():
    """Minimal 3-tier"""
    return wrap([
        node("2", "Client", 85, 10, 100, 35, CYAN_FILL, CYAN),
        node("3", "API", 85, 80, 100, 35, BLUE_FILL, BLUE),
        db("4", "DB", 95, 150, 80, 45),
        edge("5", "2", "3", "HTTPS"),
        edge("6", "3", "4", "SQL"),
    ])

def jk_rubber_duck():
    """Observability: Logs + Metrics + Traces"""
    return wrap([
        node("2", "App", 90, 10, 90, 30, BLUE_FILL, BLUE),
        node("3", "Logs", 10, 70, 70, 30, GREEN_FILL, GREEN),
        node("4", "Metrics", 100, 70, 70, 30, AMBER_FILL, AMBER),
        node("5", "Traces", 190, 70, 70, 30, PURPLE_FILL, PURPLE),
        node("6", "Collector", 90, 125, 90, 28, CYAN_FILL, CYAN),
        node("7", "Dashboard", 80, 175, 110, 28, PINK_FILL, PINK),
        edge("8", "2", "3"), edge("9", "2", "4"), edge("10", "2", "5"),
        edge("11", "3", "6"), edge("12", "4", "6"), edge("13", "5", "6"),
        edge("14", "6", "7"),
    ])

def jk_legacy_code():
    """Spaghetti architecture: messy connections"""
    return wrap([
        node("2", "UI", 100, 10, 60, 25, RED_FILL, RED, extra="fontSize=8;"),
        node("3", "Auth", 10, 50, 55, 25, AMBER_FILL, AMBER, extra="fontSize=8;"),
        node("4", "Core", 80, 55, 60, 28, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("5", "Legacy\nAPI", 170, 45, 60, 30, RED_FILL, RED, extra="fontSize=8;"),
        node("6", "Cache", 10, 105, 55, 25, PURPLE_FILL, PURPLE, extra="fontSize=8;"),
        node("7", "Queue", 85, 110, 55, 25, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("8", "Worker", 170, 105, 60, 25, CYAN_FILL, CYAN, extra="fontSize=8;"),
        db("9", "DB v1", 20, 155, 55, 30, RED_FILL, RED),
        db("10", "DB v2", 100, 155, 55, 30, AMBER_FILL, AMBER),
        db("11", "DB v3", 185, 155, 55, 30, GREEN_FILL, GREEN),
        edge("12", "2", "3"), edge("13", "2", "4"), edge("14", "2", "5"),
        edge("15", "3", "6"), edge("16", "4", "7"), edge("17", "5", "8"),
        edge("18", "3", "9"), edge("19", "4", "10"), edge("20", "8", "11"),
        edge("21", "6", "4", "", RED, dashed=1),
        edge("22", "5", "9", "", RED, dashed=1),
        edge("23", "7", "5", "", RED, dashed=1),
        edge("24", "3", "5", "", AMBER, dashed=1),
    ])

def jk_microservice_mania():
    """Microservices: gateway + registry + N services"""
    return wrap([
        node("2", "Gateway", 90, 10, 80, 28, AMBER_FILL, AMBER),
        node("3", "Registry", 210, 55, 60, 25, PURPLE_FILL, PURPLE, extra="fontSize=8;"),
        node("4", "Config", 210, 95, 60, 25, CYAN_FILL, CYAN, extra="fontSize=8;"),
        node("5", "User", 10, 55, 60, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("6", "Order", 80, 55, 60, 25, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("7", "Pay", 150, 55, 50, 25, PINK_FILL, PINK, extra="fontSize=8;"),
        node("8", "Cart", 10, 100, 60, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("9", "Search", 80, 100, 60, 25, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("10", "Notify", 150, 100, 50, 25, AMBER_FILL, AMBER, extra="fontSize=8;"),
        db("11", "DB", 40, 145, 50, 30, GREEN_FILL, GREEN),
        db("12", "DB", 120, 145, 50, 30, GREEN_FILL, GREEN),
        edge("13", "2", "5"), edge("14", "2", "6"), edge("15", "2", "7"),
        edge("16", "5", "3", "", PURPLE, dashed=1), edge("17", "6", "3", "", PURPLE, dashed=1),
        edge("18", "5", "11"), edge("19", "9", "12"),
        edge("20", "6", "10", "", AMBER, dashed=1),
    ])

def jk_cache_hit():
    """Multi-level cache: L1 → L2 → Redis → DB"""
    return wrap([
        node("2", "Client", 95, 10, 80, 28, CYAN_FILL, CYAN),
        node("3", "L1 Cache\n(Memory)", 85, 55, 100, 30, GREEN_FILL, GREEN, extra="fontSize=9;"),
        node("4", "L2 Cache\n(Redis)", 85, 105, 100, 30, AMBER_FILL, AMBER, extra="fontSize=9;"),
        db("5", "Database", 95, 160, 80, 40),
        node("6", "HIT", 210, 55, 40, 20, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("7", "HIT", 210, 105, 40, 20, AMBER_FILL, AMBER, extra="fontSize=8;"),
        node("8", "MISS", 20, 80, 45, 18, RED_FILL, RED, extra="fontSize=7;"),
        node("9", "MISS", 20, 130, 45, 18, RED_FILL, RED, extra="fontSize=7;"),
        edge("10", "2", "3"), edge("11", "3", "4", "miss", RED),
        edge("12", "4", "5", "miss", RED),
        edge("13", "3", "6", "hit", GREEN),
        edge("14", "4", "7", "hit", AMBER),
    ])

def jk_incident_cmd():
    """Alert → PagerDuty → War Room"""
    return wrap([
        node("2", "Monitor", 10, 10, 70, 28, GREEN_FILL, GREEN),
        node("3", "Alert\nFired!", 100, 10, 70, 32, RED_FILL, RED),
        node("4", "PagerDuty", 200, 10, 70, 28, AMBER_FILL, AMBER, extra="fontSize=8;"),
        node("5", "War Room", 100, 65, 100, 30, PURPLE_FILL, PURPLE),
        node("6", "IC", 40, 115, 60, 25, RED_FILL, RED, extra="fontSize=9;"),
        node("7", "Scribe", 120, 115, 60, 25, BLUE_FILL, BLUE, extra="fontSize=9;"),
        node("8", "Comms", 200, 115, 60, 25, CYAN_FILL, CYAN, extra="fontSize=9;"),
        node("9", "Postmortem", 100, 165, 100, 25, AMBER_FILL, AMBER, extra="fontSize=9;"),
        edge("10", "2", "3", "threshold", RED),
        edge("11", "3", "4"),
        edge("12", "4", "5", "page"),
        edge("13", "5", "6"), edge("14", "5", "7"), edge("15", "5", "8"),
        edge("16", "6", "9", "resolve", GREEN),
    ])

def jk_open_source():
    """GitHub flow: Fork → PR → Review → Merge"""
    return wrap([
        node("2", "Fork", 20, 10, 60, 28, BLUE_FILL, BLUE),
        node("3", "Branch", 100, 10, 70, 28, PURPLE_FILL, PURPLE),
        node("4", "Commit", 190, 10, 70, 28, GREEN_FILL, GREEN),
        node("5", "PR", 40, 70, 60, 28, AMBER_FILL, AMBER),
        node("6", "Review", 130, 70, 70, 28, CYAN_FILL, CYAN),
        node("7", "CI/CD", 220, 70, 55, 28, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("8", "Merge", 100, 130, 80, 30, GREEN_FILL, GREEN),
        node("9", "Release", 100, 175, 80, 25, AMBER_FILL, AMBER),
        edge("10", "2", "3"), edge("11", "3", "4"),
        edge("12", "4", "5"),
        edge("13", "5", "6"), edge("14", "6", "7"),
        edge("15", "6", "8", "approve", GREEN),
        edge("16", "8", "9"),
    ])

def jk_10x_dev():
    """Full-stack one person does everything"""
    return wrap([
        node("2", "10x Dev", 90, 10, 90, 30, AMBER_FILL, AMBER),
        node("3", "Frontend", 10, 65, 65, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("4", "Backend", 90, 65, 65, 25, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("5", "Infra", 170, 65, 60, 25, PURPLE_FILL, PURPLE, extra="fontSize=8;"),
        node("6", "CDN", 10, 115, 50, 22, CYAN_FILL, CYAN, extra="fontSize=7;"),
        node("7", "API", 75, 115, 50, 22, BLUE_FILL, BLUE, extra="fontSize=7;"),
        node("8", "Queue", 140, 115, 50, 22, PINK_FILL, PINK, extra="fontSize=7;"),
        node("9", "K8s", 205, 115, 50, 22, GREEN_FILL, GREEN, extra="fontSize=7;"),
        db("10", "DB", 50, 155, 50, 30),
        db("11", "Cache", 130, 155, 50, 30, AMBER_FILL, AMBER),
        node("12", "CI/CD", 210, 160, 50, 22, PURPLE_FILL, PURPLE, extra="fontSize=7;"),
        edge("13", "2", "3"), edge("14", "2", "4"), edge("15", "2", "5"),
        edge("16", "3", "6"), edge("17", "4", "7"), edge("18", "4", "8"),
        edge("19", "5", "9"), edge("20", "7", "10"), edge("21", "8", "11"),
        edge("22", "9", "12"),
    ])

def jk_over_engineer():
    """Over-engineered: simple need → 15 services"""
    return wrap([
        node("2", "Todo App", 90, 10, 90, 25, AMBER_FILL, AMBER, extra="fontSize=9;"),
        node("3", "API GW", 40, 45, 55, 20, BLUE_FILL, BLUE, extra="fontSize=7;"),
        node("4", "Auth", 110, 45, 50, 20, PURPLE_FILL, PURPLE, extra="fontSize=7;"),
        node("5", "Rate\nLimit", 175, 45, 45, 24, RED_FILL, RED, extra="fontSize=7;"),
        node("6", "Svc-A", 10, 80, 45, 20, GREEN_FILL, GREEN, extra="fontSize=7;"),
        node("7", "Svc-B", 65, 80, 45, 20, GREEN_FILL, GREEN, extra="fontSize=7;"),
        node("8", "Svc-C", 120, 80, 45, 20, GREEN_FILL, GREEN, extra="fontSize=7;"),
        node("9", "Svc-D", 175, 80, 45, 20, GREEN_FILL, GREEN, extra="fontSize=7;"),
        node("10", "Queue", 10, 112, 45, 18, PINK_FILL, PINK, extra="fontSize=6;"),
        node("11", "Cache", 65, 112, 45, 18, CYAN_FILL, CYAN, extra="fontSize=6;"),
        node("12", "Search", 120, 112, 45, 18, AMBER_FILL, AMBER, extra="fontSize=6;"),
        node("13", "ML", 175, 112, 45, 18, PURPLE_FILL, PURPLE, extra="fontSize=6;"),
        db("14", "DB-1", 10, 145, 40, 25, GREEN_FILL, GREEN),
        db("15", "DB-2", 60, 145, 40, 25, BLUE_FILL, BLUE),
        db("16", "DB-3", 110, 145, 40, 25, AMBER_FILL, AMBER),
        db("17", "DB-4", 160, 145, 40, 25, RED_FILL, RED),
        node("18", "K8s", 210, 145, 40, 25, GREEN_FILL, GREEN, extra="fontSize=7;"),
        edge("19", "2", "3"), edge("20", "3", "6"), edge("21", "3", "7"),
        edge("22", "4", "8"), edge("23", "5", "9"),
    ])

def jk_devops_guru():
    """CI/CD pipeline: Build → Test → Stage → Deploy"""
    return wrap([
        node("2", "Git Push", 10, 50, 65, 28, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("3", "Build", 95, 10, 60, 25, GREEN_FILL, GREEN, extra="fontSize=9;"),
        node("4", "Unit\nTest", 95, 50, 60, 30, AMBER_FILL, AMBER, extra="fontSize=8;"),
        node("5", "Int\nTest", 95, 95, 60, 30, AMBER_FILL, AMBER, extra="fontSize=8;"),
        node("6", "Stage", 180, 30, 60, 25, PURPLE_FILL, PURPLE, extra="fontSize=9;"),
        node("7", "Approve", 180, 75, 60, 25, CYAN_FILL, CYAN, extra="fontSize=8;"),
        node("8", "Deploy", 180, 120, 60, 28, GREEN_FILL, GREEN, extra="fontSize=9;"),
        node("9", "Monitor", 100, 155, 70, 25, PINK_FILL, PINK, extra="fontSize=8;"),
        edge("10", "2", "3"), edge("11", "3", "4"), edge("12", "4", "5"),
        edge("13", "5", "6"), edge("14", "6", "7"),
        edge("15", "7", "8", "✓", GREEN), edge("16", "8", "9"),
        edge("17", "9", "2", "rollback", RED, dashed=1),
    ])

def jk_chaos_lover():
    """Chaos engineering: random kill/delay/error injection"""
    return wrap([
        node("2", "Chaos\nController", 80, 10, 100, 35, RED_FILL, RED),
        node("3", "Svc-A", 10, 80, 60, 25, BLUE_FILL, BLUE, extra="fontSize=8;"),
        node("4", "Svc-B", 100, 80, 60, 25, GREEN_FILL, GREEN, extra="fontSize=8;"),
        node("5", "Svc-C", 190, 80, 60, 25, PURPLE_FILL, PURPLE, extra="fontSize=8;"),
        node("6", "Kill Pod", 10, 130, 60, 22, RED_FILL, RED, extra="fontSize=7;"),
        node("7", "Add\nLatency", 100, 130, 60, 25, AMBER_FILL, AMBER, extra="fontSize=7;"),
        node("8", "Network\nPartition", 190, 130, 60, 25, PINK_FILL, PINK, extra="fontSize=7;"),
        node("9", "Observe & Learn", 70, 175, 120, 25, CYAN_FILL, CYAN, extra="fontSize=9;"),
        edge("10", "2", "3", "inject", RED, dashed=1),
        edge("11", "2", "4", "inject", RED, dashed=1),
        edge("12", "2", "5", "inject", RED, dashed=1),
        edge("13", "3", "6"), edge("14", "4", "7"), edge("15", "5", "8"),
        edge("16", "6", "9"), edge("17", "7", "9"), edge("18", "8", "9"),
    ])

# ── Main ──

DIAGRAMS = {
    "jk_sla_maniac": jk_sla_maniac,
    "jk_data_hoarder": jk_data_hoarder,
    "jk_cloud_native": jk_cloud_native,
    "jk_pattern_amp": jk_pattern_amp,
    "jk_combo_king": jk_combo_king,
    "jk_card_counter": jk_card_counter,
    "jk_reroll_master": jk_reroll_master,
    "jk_gold_mine": jk_gold_mine,
    "jk_all_in": jk_all_in,
    "jk_minimalist": jk_minimalist,
    "jk_rubber_duck": jk_rubber_duck,
    "jk_legacy_code": jk_legacy_code,
    "jk_microservice_mania": jk_microservice_mania,
    "jk_cache_hit": jk_cache_hit,
    "jk_incident_cmd": jk_incident_cmd,
    "jk_open_source": jk_open_source,
    "jk_10x_dev": jk_10x_dev,
    "jk_over_engineer": jk_over_engineer,
    "jk_devops_guru": jk_devops_guru,
    "jk_chaos_lover": jk_chaos_lover,
}

def main():
    os.makedirs(OUTDIR, exist_ok=True)
    for name, fn in DIAGRAMS.items():
        path = os.path.join(OUTDIR, f"{name}.drawio")
        xml = fn()
        with open(path, "w") as f:
            f.write(xml)
        print(f"  OK  {name}.drawio")
    print(f"\nGenerated {len(DIAGRAMS)} drawio files in {OUTDIR}")
    print("\nTo export as PNG, open in draw.io → File → Export as → PNG")
    print("Or use CLI: drawio -x -f png -o output.png input.drawio")

if __name__ == "__main__":
    main()
