# Design Notes - Site Manus à reproduire sur Streamlit

## Couleurs
- **Background principal** : Violet foncé (#4C1D95 ou similaire)
- **Header ROI** : Jaune/Or (#FCD34D)
- **Texte principal** : Blanc
- **Texte secondaire** : Gris clair (#9CA3AF)
- **Tests ontologiques** : Barres bleues (#3B82F6) avec texte vert (#10B981)
- **Bouton Démarrer** : Vert (#10B981)
- **Bouton Pause** : Orange (#F59E0B)
- **Bouton Arrêter** : Rouge (#EF4444)
- **Bouton Normal** : Bleu (#3B82F6)
- **Statistiques AUTORISER** : Vert foncé (#065F46)
- **Statistiques ANALYSER** : Orange foncé (#92400E)
- **Statistiques BLOQUER** : Rouge foncé (#7F1D1D)

## Structure
1. **Header** :
   - Gauche : "Bank Safety Lab ULTRA" (jaune, gros)
   - Sous-titre : "Autonomous Banking Decision Robot | Track 3: Robotic Interaction" (gris)
   - Droite : "ROI: 0M €" (jaune, très gros)
   - Sous-ROI : "0 transactions processed" (gris, petit)

2. **Tests Ontologiques** :
   - Titre : "9 Tests Ontologiques | Précision: 96% ✅"
   - 9 barres de progression en grille 3x3
   - Chaque barre : nom (blanc), pourcentage (vert), barre bleue

3. **Contrôles de Simulation** :
   - Titre : "Contrôles de Simulation"
   - Ligne 1 : Démarrer (vert), Pause (orange), Arrêter (rouge)
   - Ligne 2 : Lent, Normal (bleu), Rapide, Ultra
   - Ligne 3 : Batch 10, Batch 50, Batch 100, Batch 500
   - Ligne 4 : Export CSV

4. **Statistiques Décisionnelles** :
   - Titre : "📊 Statistiques Décisionnelles"
   - 3 cartes en ligne :
     - AUTORISER (vert foncé) : compteur + pourcentage
     - ANALYSER (orange foncé) : compteur + pourcentage
     - BLOQUER (rouge foncé) : compteur + pourcentage

5. **Journal des Événements** :
   - Titre : "📝 Journal des Événements"
   - Sous-titre : "Dernières 0 transactions"
   - Message vide : "Aucune transaction pour le moment. Lancez la simulation !"

6. **Graphiques** :
   - 2 colonnes :
     - Gauche : "Distribution des Décisions" (doughnut)
     - Droite : "Évolution des Métriques" (line)

7. **Section Jury** :
   - Titre : "🤖 Autonomous Banking Decision Robot"
   - Sous-titre : "Future of Work | Track 3: Robotic Interaction and Task Execution"
   - Description
   - 3 colonnes :
     - 👁️ Ce qu'il VOIT
     - 🧠 Ce qu'il PENSE
     - ✅ Ce qu'il CHOISIT
   - Footer : "💡 Valeur Business: ..."
