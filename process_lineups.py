import json
import pandas as pd
from collections import defaultdict
import os
from itertools import combinations

# Generalize for all teams
os.chdir('C:\\Users\\bsanchez\\Documents\\cadete2025\\JSONs fichas')
json_files = [f for f in os.listdir() if f.endswith('.json')]

archivos_problematicos = []

# Nombres de archivos
competition_mappings = {
  "LF CHALLENGE": "lineups_lf_challenge.json",
  "C ESP CLUBES JR MASC": "lineups_c_esp_clubes_jr_masc.json",
  "PRIMERA FEB": "lineups_primera_feb.json",
  "Fase Final 1ª División Femenin": "lineups_fase_final_1a_división_femenin.json",
  "C ESP CLUBES CAD MASC": "lineups_c_esp_clubes_cad_masc.json",
  "LF ENDESA": "lineups_lf_endesa.json",
  "L.F.-2": "lineups_lf2.json",
  "C ESP CLUBES CAD FEM": "lineups_c_esp_clubes_cad_fem.json",
  "SEGUNDA FEB": "lineups_segunda_feb.json",
  "TERCERA FEB": "lineups_tercera_feb.json",
  "C ESP CLUBES INF FEM": "lineups_c_esp_clubes_inf_fem.json",
  "C ESP CLUBES INF MASC": "lineups_c_esp_clubes_inf_masc.json",
  "C ESP CLUBES MINI MASC": "lineups_c_esp_clubes_mini_masc.json",
  "C ESP CLUBES MINI FEM": "lineups_c_esp_clubes_mini_fem.json"
}

# Find all leagues
leagues = set()

for f in json_files:
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
    competition = data["HEADER"]["competition"]
    leagues.add(competition)

for league in list(leagues):
    # Get unique values of team-competition
    equipos_cadete = {}
    
    # PLAYERS SHOULD BE SAVED BY ID TO AVOID PLAYERS WITH SAME NAMES
    for match_json in json_files:
        with open(match_json, 'r', encoding='utf-8') as file:
            data = json.load(file)
            
        if data['HEADER']['competition'] != league:
            continue
            
        eq1 = data["HEADER"]["TEAM"][0]["id"]
        eq2 = data["HEADER"]["TEAM"][1]["id"]
        
        if eq1 not in equipos_cadete:
            equipos_cadete[eq1] = []
        if eq2 not in equipos_cadete:
            equipos_cadete[eq2] = []

    # Read JSON file
    for match_json in json_files:
        with open(match_json, 'r', encoding='utf-8') as file:
            data = json.load(file)
            
        if data["HEADER"]["competition"] != league:
            continue
        
        match_id = match_json.split('_')[1].split('.')[0]
        
        id_local = data["HEADER"]["TEAM"][0]["id"]
        id_visitante = data["HEADER"]["TEAM"][1]["id"]
        
        quinteto_inicial_local = []
        quinteto_inicial_visitante = []
        
        # Get starting 5 from the first 10 events of PLAYBYPLAY
        for evento in data["PLAYBYPLAY"]["LINES"][-11:]:
            if evento["text"].lower() == "comienzo del cuarto 1":
                continue
            player_id = evento["idPlayer"]
            if evento["team"] == "1":
                quinteto_inicial_local.append(player_id)
            elif evento["team"] == "2":
                quinteto_inicial_visitante.append(player_id)
                
        print(match_json)
        print(len(quinteto_inicial_local))
        print(len(quinteto_inicial_visitante))
        print("-----------------\n\n")
        
        
        # Saber si el Barça es local o visitante
        
        eventos_con_lineups = []
        unique_lineups_local = set()
        unique_lineups_visitante = set()
        
        # For the rest of the events, make necessary changes to current lineup for current event
        for evento in data["PLAYBYPLAY"]["LINES"][-12::-1]:
            if evento["action"] == "subst":
                equipo_sust = evento["team"]
                player_sust = evento["idPlayer"]
                if "Entra a pista" in evento["text"]:
                    if equipo_sust == "1":
                        quinteto_inicial_local.append(player_sust)
                    elif equipo_sust == "2":
                        quinteto_inicial_visitante.append(player_sust)
                elif "Sale de pista" in evento["text"]:
                    if equipo_sust == "1":
                        quinteto_inicial_local.remove(player_sust)
                    elif equipo_sust == "2":
                        try:
                            quinteto_inicial_visitante.remove(player_sust)
                        except:
                            continue
            # Necessary to do a shallow copy of the list, otherwise it would point
            # to the same final list always?            
            eventos_con_lineups.append([evento, quinteto_inicial_local[:], quinteto_inicial_visitante[:]])
            
            # Ir guardando quintetos únicos cuando aparecen
            if len(quinteto_inicial_local[:]) == 5:
                string_quinteto_local = ' - '.join(sorted(quinteto_inicial_local[:]))
                unique_lineups_local.add(string_quinteto_local)
            
            if len(quinteto_inicial_visitante[:]) == 5:
                string_quinteto_visitante = ' - '.join(sorted(quinteto_inicial_visitante[:]))
                unique_lineups_visitante.add(string_quinteto_visitante)
        
        # Comprobar que para cualquier evento que no sea subst siempre hay 5 jugadores
        # en pista para cada equipo
        for i in range(len(eventos_con_lineups)):
            # Sacar tipo de evento y número de jugadores en el equipo
            if len(eventos_con_lineups[i][2]) != 5 and eventos_con_lineups[i][0]["action"] != "subst":
                archivos_problematicos.append(match_json)
            elif len(eventos_con_lineups[i][1]) != 5 and eventos_con_lineups[i][0]["action"] != "subst":
                archivos_problematicos.append(match_json)
                print(eventos_con_lineups[i][0]["num"], 
                      eventos_con_lineups[i][0]["action"], 
                      len(eventos_con_lineups[i][2]),
                      eventos_con_lineups[i][2],
                      match_json,
                      end="\n\n")
            
        # A partir de aquí comprobar si barsa es local o visitante
        # Determine if Barsa is local or visitante
        equipo_local = "1"
        equipo_visitante = "2"
        
        # Calcular +/- y estadísticas por quinteto
        # Get all actions for a lineup stint
        lineups_stints_actions_local = {}
        lineups_stints_actions_visitante = {}
        
        # Guardar eventos para local
        for lineup in unique_lineups_local:
            for event in eventos_con_lineups:
                if lineup == ' - '.join(sorted(event[1])):
                    if lineup in lineups_stints_actions_local:
                        lineups_stints_actions_local[lineup].append(event)
                    else:
                        lineups_stints_actions_local[lineup] = [event]
                        
        
        # Guardar eventos para visitante
        for lineup in unique_lineups_visitante:
            for event in eventos_con_lineups:
                if lineup == ' - '.join(sorted(event[2])):
                    if lineup in lineups_stints_actions_visitante:
                        lineups_stints_actions_visitante[lineup].append(event)
                    else:
                        lineups_stints_actions_visitante[lineup] = [event]
                            
        
        # Get basic counting stats for each lineup
        unique_actions = set()
        
        for evento in data["PLAYBYPLAY"]["LINES"]:
            unique_actions.add(evento["action"])
        
        # Estadísticas básicas de quinteto
        # Initialize defaultdict with stats keys already set to 0
        lineups_stats_local = defaultdict(lambda: {"T2I": 0,
                                             "T2C": 0,
                                             "T3I": 0, 
                                             "T3C": 0,
                                             "T1I":0,
                                             "T1C": 0,
                                             "AST": 0, 
                                             "REB": 0,
                                             "REBD": 0,
                                             "REBO": 0,
                                             "PER": 0,
                                             "ROB": 0,
                                             "TAP": 0,
                                             "TAPC": 0,
                                             "FC": 0,
                                             "FR": 0,
                                             "T2CC": 0,
                                             "T3CC": 0,
                                             "T1CC": 0,
                                             "REBDC": 0,
                                             "REBOC": 0})
        
        
        # Process each lineup and its events for local team
        for lineup, eventos in lineups_stints_actions_local.items():
            for i in range(len(eventos)):
                e = eventos[i][0]
        
                # Skip if not Barsa's action
                if e["team"] == equipo_local:
        
                    if e["action"] == "shoot":
                        if "TIRO DE 2" in e["text"]:
                            lineups_stats_local[lineup]["T2I"] += 1
                            if "ANOTADO" in e["text"]:
                                lineups_stats_local[lineup]["T2C"] += 1
                        elif "TIRO DE 3" in e["text"]:
                            lineups_stats_local[lineup]["T3I"] += 1
                            if "ANOTADO" in e["text"]:
                                lineups_stats_local[lineup]["T3C"] += 1
        
                    elif e["action"] == "fthrow":
                        lineups_stats_local[lineup]["T1I"] += 1
                        if "ANOTADO" in e["text"]:
                            lineups_stats_local[lineup]["T1C"] += 1
        
                    elif e["action"] == "assist":
                        lineups_stats_local[lineup]["AST"] += 1
        
                    elif e["action"] == "rebound":
                        lineups_stats_local[lineup]["REB"] += 1
                        prev = eventos[i - 1][0] if i > 0 else {}
                        if prev.get("action") in ["shoot", "fthrow"]:
                            if prev.get("team") == equipo_local:
                                lineups_stats_local[lineup]["REBO"] += 1
                            elif prev.get("team") == equipo_visitante:
                                lineups_stats_local[lineup]["REBD"] += 1
                        elif prev.get("action") == "blockshot":
                            if prev.get("team") == equipo_local:
                                lineups_stats_local[lineup]["REBD"] += 1
                            elif prev.get("team") == equipo_visitante:
                                lineups_stats_local[lineup]["REBO"] += 1
        
                    elif e["action"] == "lose":
                        lineups_stats_local[lineup]["PER"] += 1
                    elif e["action"] == "recovery":
                        lineups_stats_local[lineup]["ROB"] += 1
                    elif e["action"] == "blockshot":
                        lineups_stats_local[lineup]["TAP"] += 1
                    elif e["action"] == "foul":
                        lineups_stats_local[lineup]["FC"] += 1
        
                elif e["team"] == equipo_visitante:
        
                    if e["action"] == "foul":
                        lineups_stats_local[lineup]["FR"] += 1
                    elif e["action"] == "blockshot":
                        lineups_stats_local[lineup]["TAPC"] += 1
                    elif e["action"] == "shoot":
                        if "TIRO DE 2 ANOTADO" in e["text"]:
                            lineups_stats_local[lineup]["T2CC"] += 1
                        elif "TIRO DE 3 ANOTADO" in e["text"]:
                            lineups_stats_local[lineup]["T3CC"] += 1
                    elif e["action"] == "fthrow" and "ANOTADO" in e["text"]:
                        lineups_stats_local[lineup]["T1CC"] += 1
                    elif e["action"] == "rebound":
                        prev = eventos[i - 1][0] if i > 0 else {}
                        if prev.get("action") in ["shoot", "fthrow"]:
                            if prev.get("team") == equipo_visitante:
                                lineups_stats_local[lineup]["REBOC"] += 1
                            elif prev.get("team") == equipo_local:
                                lineups_stats_local[lineup]["REBDC"] += 1
                        elif prev.get("action") == "blockshot":
                            if prev.get("team") == equipo_local:
                                lineups_stats_local[lineup]["REBOC"] += 1
                            elif prev.get("team") == equipo_visitante:
                                lineups_stats_local[lineup]["REBDC"] += 1
        
        if len(lineups_stats_local) == 0:
            print(match_json)
        
        # Añadir datos al diccionario de la liga
        equipos_cadete[id_local].append({match_id: lineups_stats_local})
            
        # Calcular estadísticas para equipo visitante
        # Initialize defaultdict with stats keys already set to 0
        lineups_stats_visitante = defaultdict(lambda: {"T2I": 0,
                                             "T2C": 0,
                                             "T3I": 0, 
                                             "T3C": 0,
                                             "T1I":0,
                                             "T1C": 0,
                                             "AST": 0, 
                                             "REB": 0,
                                             "REBD": 0,
                                             "REBO": 0,
                                             "PER": 0,
                                             "ROB": 0,
                                             "TAP": 0,
                                             "TAPC": 0,
                                             "FC": 0,
                                             "FR": 0,
                                             "T2CC": 0,
                                             "T3CC": 0,
                                             "T1CC": 0,
                                             "REBDC": 0,
                                             "REBOC": 0})
        
        for lineup, eventos in lineups_stints_actions_visitante.items():
            for i in range(len(eventos)):
                e = eventos[i][0]
        
                # Skip if not Barsa's action
                if e["team"] == equipo_visitante:
        
                    if e["action"] == "shoot":
                        if "TIRO DE 2" in e["text"]:
                            lineups_stats_visitante[lineup]["T2I"] += 1
                            if "ANOTADO" in e["text"]:
                                lineups_stats_visitante[lineup]["T2C"] += 1
                        elif "TIRO DE 3" in e["text"]:
                            lineups_stats_visitante[lineup]["T3I"] += 1
                            if "ANOTADO" in e["text"]:
                                lineups_stats_visitante[lineup]["T3C"] += 1
        
                    elif e["action"] == "fthrow":
                        lineups_stats_visitante[lineup]["T1I"] += 1
                        if "ANOTADO" in e["text"]:
                            lineups_stats_visitante[lineup]["T1C"] += 1
        
                    elif e["action"] == "assist":
                        lineups_stats_visitante[lineup]["AST"] += 1
        
                    elif e["action"] == "rebound":
                        lineups_stats_visitante[lineup]["REB"] += 1
                        prev = eventos[i - 1][0] if i > 0 else {}
                        if prev.get("action") in ["shoot", "fthrow"]:
                            if prev.get("team") == equipo_visitante:
                                lineups_stats_visitante[lineup]["REBO"] += 1
                            elif prev.get("team") == equipo_local:
                                lineups_stats_visitante[lineup]["REBD"] += 1
                        elif prev.get("action") == "blockshot":
                            if prev.get("team") == equipo_visitante:
                                lineups_stats_visitante[lineup]["REBD"] += 1
                            elif prev.get("team") == equipo_local:
                                lineups_stats_visitante[lineup]["REBO"] += 1
        
                    elif e["action"] == "lose":
                        lineups_stats_visitante[lineup]["PER"] += 1
                    elif e["action"] == "recovery":
                        lineups_stats_visitante[lineup]["ROB"] += 1
                    elif e["action"] == "blockshot":
                        lineups_stats_visitante[lineup]["TAP"] += 1
                    elif e["action"] == "foul":
                        lineups_stats_visitante[lineup]["FC"] += 1
        
                elif e["team"] == equipo_local:
        
                    if e["action"] == "foul":
                        lineups_stats_visitante[lineup]["FR"] += 1
                    elif e["action"] == "blockshot":
                        lineups_stats_visitante[lineup]["TAPC"] += 1
                    elif e["action"] == "shoot":
                        if "TIRO DE 2 ANOTADO" in e["text"]:
                            lineups_stats_visitante[lineup]["T2CC"] += 1
                        elif "TIRO DE 3 ANOTADO" in e["text"]:
                            lineups_stats_visitante[lineup]["T3CC"] += 1
                    elif e["action"] == "fthrow" and "ANOTADO" in e["text"]:
                        lineups_stats_visitante[lineup]["T1CC"] += 1
                    elif e["action"] == "rebound":
                        prev = eventos[i - 1][0] if i > 0 else {}
                        if prev.get("action") in ["shoot", "fthrow"]:
                            if prev.get("team") == equipo_local:
                                lineups_stats_visitante[lineup]["REBOC"] += 1
                            elif prev.get("team") == equipo_visitante:
                                lineups_stats_visitante[lineup]["REBDC"] += 1
                        elif prev.get("action") == "blockshot":
                            if prev.get("team") == equipo_visitante:
                                lineups_stats_visitante[lineup]["REBOC"] += 1
                            elif prev.get("team") == equipo_local:
                                lineups_stats_visitante[lineup]["REBDC"] += 1
        
        
        # Añadir datos al diccionario de la liga
        equipos_cadete[id_visitante].append({match_id: lineups_stats_visitante})
    
    # Assuming `data` is your loaded dictionary
    flat_rows = []
    
    for team_id, matches in equipos_cadete.items():
        for match_ in matches:
            for match_id, lineups in match_.items():
                for lineup, stats in lineups.items():
                    row = {
                        "team_id": team_id,
                        "match_id": match_id,
                        "lineup": lineup,
                    }
                    row.update(stats)
                    flat_rows.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(flat_rows)
    
    # Calcular +/- en base a tiros convertidos
    df['+/-'] = (df['T2C'] * 2) + (df['T3C'] * 3) + (df['T1C'] * 1) - ((df['T2CC'] * 2) + (df['T3CC'] * 3) + (df['T1CC'] * 1))
        
    # Calcular posesiones jugadas juntos
    df['Posesiones'] = (df['T2I'] + df['T3I']) + (0.44 * df['T1I']) - df['REBO'] +  df['PER']
        
    # Añadir PTS y PTSC
    df['PTS'] = (df['T2C'] * 2) +  (df['T3C'] * 3) +  df['T1C']
    df['PTSC'] = (df['T2CC'] * 2) +  (df['T3CC'] * 3) +  df['T1CC']
    
    # Reordenar columnas
    new_order = ['team_id', 'match_id', 'lineup', 'PTS', 'PTSC'] + [col for col in df.columns if col not in ['team_id', 'match_id', 'lineup', 'PTS', 'PTSC']]
    df = df[new_order]
    
    # Guardar como CSV
    grouped = df[[col for col in df.columns if col != "match_id"]].groupby(['team_id', 'lineup']).sum().reset_index()
    
    # Calcular subquintetos y añadir al grouped df
    # Convert each Quinteto to a list of players
    grouped['Players'] = grouped['lineup'].apply(lambda x: [p.strip() for p in x.split(' - ')])
    
    # List of stats we want to aggregate for each 2-man pair
    stats_to_aggregate = [*grouped.columns[2:-1]]
    
    # Initialize aggregation dictionary
    pair_stats = defaultdict(lambda: {stat: 0.0 for stat in stats_to_aggregate})
    
    # Store all sub-lineup stats across teams for this group size
    all_team_lineup_stats = []
    
    for group_size in [4, 3, 2]:
        
        # This will store stats per team_id and sub-lineup
        lineup_stats = defaultdict(lambda: defaultdict(lambda: {stat: 0 for stat in stats_to_aggregate}))
    
        for _, row in grouped.iterrows():
            players = row['Players']
            team_id = row['team_id']
            stats = {stat: row[stat] for stat in stats_to_aggregate}
    
            for group in combinations(players, group_size):
                key = tuple(sorted(group))
                for stat in stats_to_aggregate:
                    lineup_stats[team_id][key][stat] += stats[stat]
    
        # Convert to DataFrame
        lineup_stats_rows = []
        for team_id, group_dict in lineup_stats.items():
            for group, stats in group_dict.items():
                row = {
                    "team_id": team_id,
                    **{f"Player {i+1}": player for i, player in enumerate(group)},
                    **stats
                }
                lineup_stats_rows.append(row)
    
        lineup_stats_df = pd.DataFrame(lineup_stats_rows)
    
        # Create "lineup" string
        player_columns = [col for col in lineup_stats_df.columns if col.startswith("Player")]
        lineup_stats_df["lineup"] = lineup_stats_df[player_columns].apply(lambda row: ' - '.join(row.astype(str)), axis=1)
    
        # Reorder columns
        lineup_stats_df = lineup_stats_df[["team_id", "lineup"] + [col for col in lineup_stats_df.columns if col not in ["team_id", "lineup"] + player_columns]]
        
        lineup_stats_df['Players'] = lineup_stats_df['lineup'].apply(lambda x: [p.strip() for p in x.split(' - ')])
        
        # Append to grouped
        grouped = pd.concat([grouped, lineup_stats_df], ignore_index=True)
    
    # Añadir columna de tipo de quinteto
    grouped['n_jug'] = grouped['Players'].apply(lambda x: len(x))
    
    # Guardar como CSV
    grouped.to_csv(f'C:\\Users\\bsanchez\\Documents\\cadete2025\\Lineups\\{competition_mappings[league]}.csv', index=False)

# Save player photos
player_photos = {}

# Read JSON file
for match_json in json_files:
    with open(match_json, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    for player_barsa in data['SCOREBOARD']['TEAM'][0]['PLAYER'] + data['SCOREBOARD']['TEAM'][1]['PLAYER']:
        if player_barsa["id"] not in player_photos:
            player_photos[player_barsa["id"]] = [player_barsa["logo"], player_barsa["name"]]

# Save photos as JSON
with open("C:\\Users\\bsanchez\\Documents\\cadete2025\\Lineups\\player_photos.json", "w", encoding="utf-8") as f:
    json.dump(player_photos, f, indent=4, ensure_ascii=False)

# Función para sacar stints de acciones
def get_consecutive_ranges(numbers):
    if not numbers:
        return []  # Handle empty input
    
    ranges = []  # This will hold our final list of (start, end) tuples
    start = end = numbers[0]  # Initialize both start and end to the first number

    for n in numbers[1:]:  # Iterate through the rest of the list
        if n == end + 1:
            # If current number is exactly 1 greater than previous, it's part of the current range
            end = n
        else:
            # We've hit a break in the sequence — save the current range
            ranges.append((start, end))
            # Start a new range
            start = end = n

    # Append the last range
    ranges.append((start, end))
    
    return ranges

# Tiempo restante en cuarto en base a cuarto y tiempo
def calculate_time_remaining_in_match(quarter, time):
    
    cuarto_tiempo = {
        1: 40*60,
        2: 30*60,
        3: 20*60,
        4: 10*60
        }
    
    if int(quarter) < 4:
        quarter_seconds = cuarto_tiempo[int(quarter) + 1]
    else:
        quarter_seconds = 0
        
    time_remaining_in_quarter = (int(time.split(':')[0]) * 60) + int(time.split(':')[1])
    
    time_remaining_in_match = quarter_seconds + time_remaining_in_quarter
    
    return time_remaining_in_match / 60

for lineup, actions in lineups_stints_actions_local.items():
    tiempos = {}
    actions_list = []
    for action in actions:
        actions_list.append(int(action[0]["num"]))
        # Guardar cuarto y tiempo restante de cada acción
        tiempos[int(action[0]["num"])] = [action[0]["quarter"], action[0]["time"]]
        
    print(tiempos)
    
    
    