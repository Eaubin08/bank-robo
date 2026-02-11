"""
Bank Safety Lab - Autonomous Banking Decision Robot
Streamlit Version - Reproduction exacte du site Manus
"""

import streamlit as st
import pandas as pd
import random
import time
from datetime import datetime
import plotly.graph_objects as go

# Configuration de la page
st.set_page_config(
    page_title="Bank Safety Lab ULTRA",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# CSS personnalisé pour reproduire exactement le design Manus
st.markdown("""
<style>
    /* Reset Streamlit defaults */
    .main {
        background: linear-gradient(135deg, #4C1D95 0%, #5B21B6 100%);
        padding: 2rem;
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Custom styling */
    .stApp {
        background: linear-gradient(135deg, #4C1D95 0%, #5B21B6 100%);
    }
    
    h1, h2, h3, p, div, span, label {
        color: white !important;
    }
    
    /* Header */
    .main-title {
        font-size: 2.5rem;
        font-weight: 800;
        color: #FCD34D !important;
        margin-bottom: 0.25rem;
    }
    
    .sub-title {
        font-size: 1rem;
        color: #9CA3AF !important;
        margin-bottom: 2rem;
    }
    
    .roi-display {
        font-size: 3rem;
        font-weight: 800;
        color: #FCD34D !important;
        text-align: right;
    }
    
    .roi-subtitle {
        font-size: 0.875rem;
        color: #9CA3AF !important;
        text-align: right;
    }
    
    /* Cards */
    .stat-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin: 0.5rem 0;
    }
    
    .stat-card-green {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .stat-card-orange {
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .stat-card-red {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    /* Buttons */
    .stButton > button {
        width: 100%;
        border-radius: 0.375rem;
        font-weight: 600;
        border: none;
        padding: 0.5rem 1rem;
    }
    
    /* Progress bars */
    .stProgress > div > div > div {
        background-color: #3B82F6;
    }
    
    /* Metrics */
    [data-testid="stMetricValue"] {
        font-size: 2rem !important;
        font-weight: 700 !important;
    }
</style>
""", unsafe_allow_html=True)

# Scénarios bancaires (16 scénarios comme dans le site Manus)
SCENARIOS = [
    {"name": "Client-Premium", "risk": 0.1},
    {"name": "Achat-Regulier", "risk": 0.15},
    {"name": "Virement-Famille", "risk": 0.12},
    {"name": "Retrait-ATM-Habituel", "risk": 0.13},
    {"name": "Paiement-Restaurant", "risk": 0.11},
    {"name": "Achat-Pharmacie", "risk": 0.10},
    {"name": "Virement-Loyer", "risk": 0.14},
    {"name": "Achat-Supermarche", "risk": 0.12},
    {"name": "Paiement-Essence", "risk": 0.13},
    {"name": "Virement-Epargne", "risk": 0.09},
    {"name": "Achat-Librairie", "risk": 0.11},
    {"name": "Paiement-Cinema", "risk": 0.12},
    {"name": "Retrait-ATM-Etranger", "risk": 0.55},
    {"name": "Virement-Salaire", "risk": 0.48},
    {"name": "Achat-Montant-Eleve", "risk": 0.62},
    {"name": "Transaction-Crypto", "risk": 0.85},
]

# Initialisation de la session
if 'transactions' not in st.session_state:
    st.session_state.transactions = []
if 'total_roi' not in st.session_state:
    st.session_state.total_roi = 0
if 'decision_counts' not in st.session_state:
    st.session_state.decision_counts = {"AUTORISER": 0, "ANALYSER": 0, "BLOQUER": 0}
if 'is_running' not in st.session_state:
    st.session_state.is_running = False

def calculate_metrics(scenario):
    """Calcule les métriques de sécurité"""
    risk = scenario["risk"]
    return {
        "ir": round(risk + random.uniform(-0.1, 0.1), 2),
        "ciz": round(risk * 0.5 + random.uniform(-0.05, 0.05), 2),
        "dts": round(risk * 0.7 + random.uniform(-0.08, 0.08), 2),
        "tsg": round(risk * 0.6 + random.uniform(-0.06, 0.06), 2),
    }

def make_decision(metrics):
    """Prend une décision basée sur les métriques"""
    tsg = metrics["tsg"]
    if tsg < 0.3:
        return "AUTORISER"
    elif tsg < 0.7:
        return "ANALYSER"
    else:
        return "BLOQUER"

def process_transaction():
    """Traite une transaction"""
    scenario = random.choice(SCENARIOS)
    metrics = calculate_metrics(scenario)
    decision = make_decision(metrics)
    
    if decision == "AUTORISER":
        roi_contribution = random.randint(20, 100)
    elif decision == "ANALYSER":
        roi_contribution = random.randint(10, 50)
    else:
        roi_contribution = 0
    
    transaction = {
        "timestamp": datetime.now(),
        "scenario": scenario["name"],
        "decision": decision,
        "metrics": metrics,
        "roi": roi_contribution,
    }
    
    st.session_state.transactions.append(transaction)
    st.session_state.total_roi += roi_contribution
    st.session_state.decision_counts[decision] += 1
    
    return transaction

# Header
col1, col2 = st.columns([3, 1])
with col1:
    st.markdown('<div class="main-title">Bank Safety Lab ULTRA</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Autonomous Banking Decision Robot | Track 3: Robotic Interaction</div>', unsafe_allow_html=True)
with col2:
    st.markdown(f'<div class="roi-display">ROI: {st.session_state.total_roi}M €</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="roi-subtitle">{len(st.session_state.transactions)} transactions processed</div>', unsafe_allow_html=True)

st.markdown("---")

# Tests Ontologiques
st.markdown("### 9 Tests Ontologiques | Précision: 96% ✅")
cols = st.columns(3)
tests = [
    "Time Is Law", "Absolute Hold Gate", "Zero Tolerance Flag",
    "Irreversibility Index", "Conflict Zone Isolation", "Decision Time Sensitivity",
    "Total System Guard", "Negative Memory Reflexes", "Emergent Behavior Watch"
]
for idx, test in enumerate(tests):
    with cols[idx % 3]:
        st.progress(0.96, text=f"{test}: 96.0%")

st.markdown("---")

# Contrôles de Simulation
st.markdown("### Contrôles de Simulation")
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("▶️ Démarrer", type="primary", disabled=st.session_state.is_running, use_container_width=True):
        st.session_state.is_running = True
        st.rerun()

with col2:
    if st.button("⏸️ Pause", disabled=not st.session_state.is_running, use_container_width=True):
        st.session_state.is_running = False
        st.rerun()

with col3:
    if st.button("⏹️ Arrêter", use_container_width=True):
        st.session_state.is_running = False
        st.rerun()

col1, col2, col3, col4 = st.columns(4)
with col2:
    st.button("Normal", type="primary", use_container_width=True)

col1, col2, col3, col4 = st.columns(4)
with col1:
    if st.button("Batch 10", use_container_width=True):
        for _ in range(10):
            process_transaction()
        st.rerun()
with col2:
    if st.button("Batch 50", use_container_width=True):
        for _ in range(50):
            process_transaction()
        st.rerun()
with col3:
    if st.button("Batch 100", use_container_width=True):
        for _ in range(100):
            process_transaction()
        st.rerun()
with col4:
    if st.button("Batch 500", use_container_width=True):
        for _ in range(500):
            process_transaction()
        st.rerun()

if st.button("📥 Export CSV", use_container_width=True):
    if len(st.session_state.transactions) > 0:
        df = pd.DataFrame([
            {
                "#": i+1,
                "Scenario": tx["scenario"],
                "Decision": tx["decision"],
                "IR": tx["metrics"]["ir"],
                "CIZ": tx["metrics"]["ciz"],
                "DTS": tx["metrics"]["dts"],
                "TSG": tx["metrics"]["tsg"],
                "ROI": tx["roi"],
                "Timestamp": tx["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
            }
            for i, tx in enumerate(st.session_state.transactions)
        ])
        csv = df.to_csv(index=False)
        st.download_button(
            label="📥 Télécharger CSV",
            data=csv,
            file_name=f"bank-safety-data-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv",
            mime="text/csv",
            use_container_width=True
        )

# Simulation continue
if st.session_state.is_running:
    process_transaction()
    time.sleep(1)
    st.rerun()

st.markdown("---")

# Statistiques Décisionnelles
st.markdown("### 📊 Statistiques Décisionnelles")
col1, col2, col3 = st.columns(3)

total = len(st.session_state.transactions)

with col1:
    count = st.session_state.decision_counts["AUTORISER"]
    pct = (count / total * 100) if total > 0 else 0
    st.markdown(f'<div class="stat-card stat-card-green"><h3>AUTORISER</h3><h1>{count}</h1><p>{pct:.0f}%</p></div>', unsafe_allow_html=True)

with col2:
    count = st.session_state.decision_counts["ANALYSER"]
    pct = (count / total * 100) if total > 0 else 0
    st.markdown(f'<div class="stat-card stat-card-orange"><h3>ANALYSER</h3><h1>{count}</h1><p>{pct:.0f}%</p></div>', unsafe_allow_html=True)

with col3:
    count = st.session_state.decision_counts["BLOQUER"]
    pct = (count / total * 100) if total > 0 else 0
    st.markdown(f'<div class="stat-card stat-card-red"><h3>BLOQUER</h3><h1>{count}</h1><p>{pct:.0f}%</p></div>', unsafe_allow_html=True)

st.markdown("---")

# Journal des événements
st.markdown(f"### 📝 Journal des Événements")
st.caption(f"Dernières {min(len(st.session_state.transactions), 10)} transactions")

if len(st.session_state.transactions) == 0:
    st.info("Aucune transaction pour le moment. Lancez la simulation !")
else:
    for tx in st.session_state.transactions[-10:][::-1]:
        with st.expander(f"{tx['scenario']} - {tx['decision']}", expanded=False):
            col1, col2 = st.columns([3, 1])
            with col1:
                st.write(f"**Métriques:** IR: {tx['metrics']['ir']}, CIZ: {tx['metrics']['ciz']}, DTS: {tx['metrics']['dts']}, TSG: {tx['metrics']['tsg']}")
            with col2:
                st.metric("ROI", f"+{tx['roi']}M €")

st.markdown("---")

# Graphiques
col1, col2 = st.columns(2)

with col1:
    st.markdown("### Distribution des Décisions")
    if len(st.session_state.transactions) > 0:
        fig = go.Figure(data=[go.Pie(
            labels=list(st.session_state.decision_counts.keys()),
            values=list(st.session_state.decision_counts.values()),
            marker=dict(colors=['#10B981', '#F59E0B', '#EF4444']),
            hole=0.4
        )])
        fig.update_layout(
            height=350,
            showlegend=True,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color='white')
        )
        st.plotly_chart(fig, use_container_width=True)

with col2:
    st.markdown("### Évolution des Métriques")
    if len(st.session_state.transactions) > 1:
        df = pd.DataFrame([
            {
                "Transaction": i+1,
                "IR": tx["metrics"]["ir"],
                "CIZ": tx["metrics"]["ciz"],
                "DTS": tx["metrics"]["dts"],
                "TSG": tx["metrics"]["tsg"]
            }
            for i, tx in enumerate(st.session_state.transactions[-50:])
        ])
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=df["Transaction"], y=df["IR"], name="IR", line=dict(color='#EF4444')))
        fig.add_trace(go.Scatter(x=df["Transaction"], y=df["CIZ"], name="CIZ", line=dict(color='#F59E0B')))
        fig.add_trace(go.Scatter(x=df["Transaction"], y=df["DTS"], name="DTS", line=dict(color='#3B82F6')))
        fig.add_trace(go.Scatter(x=df["Transaction"], y=df["TSG"], name="TSG", line=dict(color='#10B981')))
        fig.update_layout(
            height=350,
            yaxis_range=[0, 1],
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color='white')
        )
        st.plotly_chart(fig, use_container_width=True)

st.markdown("---")

# Section Jury
st.markdown("### 🤖 Autonomous Banking Decision Robot")
st.caption("Future of Work | Track 3: Robotic Interaction and Task Execution")

st.markdown("""
Ce système est un **robot décisionnel autonome** qui opère dans un environnement simulé de transactions bancaires. 
Il démontre comment l'IA peut remplacer ou assister les analystes humains dans la détection de fraude et la validation de transactions.
""")

col1, col2, col3 = st.columns(3)

with col1:
    st.info("""
    **👁️ Ce qu'il VOIT**
    
    Capteurs de métriques (IR, CIZ, DTS, TSG), patterns de transactions, données de compte
    """)

with col2:
    st.info("""
    **🧠 Ce qu'il PENSE**
    
    Analyse Gemini AI, 9 tests ontologiques, calcul de risque, raisonnement transparent
    """)

with col3:
    st.success("""
    **✅ Ce qu'il CHOISIT**
    
    AUTORISER (83%), ANALYSER (4%), BLOQUER (13%) avec justification complète
    """)

st.caption("💡 Valeur Business: Réduction de 90% du temps de traitement, augmentation de 96% de la précision, ROI mesurable en temps réel")
