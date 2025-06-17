import json
import pandas as pd
from collections import defaultdict
import os

# Generalize for all teams
os.chdir('C:\\Users\\bsanchez\\Downloads\\Cadete2025\\cadete2025\\JSONs fichas')
json_files = [f for f in os.listdir() if f.endswith('.json')]

# Read JSON file
for match_json in json_files:
    with open(match_json, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
    if data["HEADER"]["competition"] != "C ESP CLUBES CAD MASC":
        continue
    if data["HEADER"]["TEAM"][0]["name"] != "BARÇA" and data["HEADER"]["TEAM"][1]["name"] != "BARÇA":
        continue
    
    quinteto_inicial_local = []
    quinteto_inicial_visitante = []
    
    # Get starting 5 from the first 10 events of PLAYBYPLAY
    for evento in data["PLAYBYPLAY"]["LINES"][-11:]:
        if evento["text"].lower() == "comienzo del cuarto 1":
            continue
        player_id = evento["text"].split(") ")[1].split(":")[0]
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
            player_sust = evento["text"].split(":")[0].split(") ")[1]
            if "Entra a pista" in evento["text"]:
                if equipo_sust == "1":
                    quinteto_inicial_local.append(player_sust)
                elif equipo_sust == "2":
                    quinteto_inicial_visitante.append(player_sust)
            elif "Sale de pista" in evento["text"]:
                if equipo_sust == "1":
                    quinteto_inicial_local.remove(player_sust)
                elif equipo_sust == "2":
                    quinteto_inicial_visitante.remove(player_sust)
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
            print(eventos_con_lineups[i][0]["num"], 
                  eventos_con_lineups[i][0]["action"], 
                  len(eventos_con_lineups[i][2]),
                  eventos_con_lineups[i][2],
                  match_json,
                  end="\n\n",
                  )
        
    # A partir de aquí comprobar si barsa es local o visitante
    # Determine if Barsa is local or visitante
    equipo_local = data["HEADER"]["TEAM"][0]["name"]
    
    barsa = "1" if equipo_local == "BARÇA" else "2"
    rival = "2" if equipo_local == "BARÇA" else "1"
    
    # Calcular +/- y estadísticas por quinteto
    # Get all actions for a lineup stint
    lineups_stints_actions = {}
    
    if equipo_local == "BARÇA":
        for lineup in unique_lineups_local:
            for event in eventos_con_lineups:
                if lineup == ' - '.join(sorted(event[1])):
                    if lineup in lineups_stints_actions:
                        lineups_stints_actions[lineup].append(event)
                    else:
                        lineups_stints_actions[lineup] = [event]
    else:
        for lineup in unique_lineups_visitante:
            for event in eventos_con_lineups:
                if lineup == ' - '.join(sorted(event[2])):
                    if lineup in lineups_stints_actions:
                        lineups_stints_actions[lineup].append(event)
                    else:
                        lineups_stints_actions[lineup] = [event]
                        
    
    # Get basic counting stats for each lineup
    unique_actions = set()
    
    for evento in data["PLAYBYPLAY"]["LINES"]:
        unique_actions.add(evento["action"])
    
    # Estadísticas básicas de quinteto
    # Initialize defaultdict with stats keys already set to 0
    lineups_stats = defaultdict(lambda: {"T2I": 0,
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
    
    
    # Process each lineup and its events
    for lineup, eventos in lineups_stints_actions.items():
        for i in range(len(eventos)):
            e = eventos[i][0]
    
            # Skip if not Barsa's action
            if e["team"] == barsa:
    
                if e["action"] == "shoot":
                    if "TIRO DE 2" in e["text"]:
                        lineups_stats[lineup]["T2I"] += 1
                        if "ANOTADO" in e["text"]:
                            lineups_stats[lineup]["T2C"] += 1
                    elif "TIRO DE 3" in e["text"]:
                        lineups_stats[lineup]["T3I"] += 1
                        if "ANOTADO" in e["text"]:
                            lineups_stats[lineup]["T3C"] += 1
    
                elif e["action"] == "fthrow":
                    lineups_stats[lineup]["T1I"] += 1
                    if "ANOTADO" in e["text"]:
                        lineups_stats[lineup]["T1C"] += 1
    
                elif e["action"] == "assist":
                    lineups_stats[lineup]["AST"] += 1
    
                elif e["action"] == "rebound":
                    lineups_stats[lineup]["REB"] += 1
                    prev = eventos[i - 1][0] if i > 0 else {}
                    if prev.get("action") in ["shoot", "fthrow"]:
                        if prev.get("team") == barsa:
                            lineups_stats[lineup]["REBO"] += 1
                        elif prev.get("team") == rival:
                            lineups_stats[lineup]["REBD"] += 1
                    elif prev.get("action") == "blockshot":
                        if prev.get("team") == barsa:
                            lineups_stats[lineup]["REBD"] += 1
                        elif prev.get("team") == rival:
                            lineups_stats[lineup]["REBO"] += 1
    
                elif e["action"] == "lose":
                    lineups_stats[lineup]["PER"] += 1
                elif e["action"] == "recovery":
                    lineups_stats[lineup]["ROB"] += 1
                elif e["action"] == "blockshot":
                    lineups_stats[lineup]["TAP"] += 1
                elif e["action"] == "foul":
                    lineups_stats[lineup]["FC"] += 1
    
            elif e["team"] == rival:
    
                if e["action"] == "foul":
                    lineups_stats[lineup]["FR"] += 1
                elif e["action"] == "blockshot":
                    lineups_stats[lineup]["TAPC"] += 1
                elif e["action"] == "shoot":
                    if "TIRO DE 2 ANOTADO" in e["text"]:
                        lineups_stats[lineup]["T2CC"] += 1
                    elif "TIRO DE 3 ANOTADO" in e["text"]:
                        lineups_stats[lineup]["T3CC"] += 1
                elif e["action"] == "fthrow" and "ANOTADO" in e["text"]:
                    lineups_stats[lineup]["T1CC"] += 1
                elif e["action"] == "rebound":
                    prev = eventos[i - 1][0] if i > 0 else {}
                    if prev.get("action") in ["shoot", "fthrow"]:
                        if prev.get("team") == rival:
                            lineups_stats[lineup]["REBOC"] += 1
                        elif prev.get("team") == barsa:
                            lineups_stats[lineup]["REBDC"] += 1
                    elif prev.get("action") == "blockshot":
                        if prev.get("team") == barsa:
                            lineups_stats[lineup]["REBOC"] += 1
                        elif prev.get("team") == rival:
                            lineups_stats[lineup]["REBDC"] += 1
    
    if len(lineups_stats) == 0:
        print(match_json)
        
    # Create table of stats
    # Convert to DataFrame
    df = pd.DataFrame.from_dict(lineups_stats, orient='index').reset_index()
    
    print(f"Match: {match_json}")
    print(f"Local team: {equipo_local}")
    print(f"BARÇA is team: {barsa}")
    print(f"Number of local lineups: {len(unique_lineups_local)}")
    print(f"Number of visitor lineups: {len(unique_lineups_visitante)}")
    print(f"Number of lineups with stats: {len(lineups_stats)}")
    print(f"Number of lineups stints with actions: {len(lineups_stints_actions)}")
    
    if df.empty:
        print(match_json)
    
    # Rename the first column
    # Rename 'index' to 'Quinteto'
    df = df.rename(columns={'index': 'Quinteto'})
    
    # Calcular +/- en base a tiros convertidos
    df['+/-'] = (df['T2C'] * 2) + (df['T3C'] * 3) + (df['T1C'] * 1) - ((df['T2CC'] * 2) + (df['T3CC'] * 3) + (df['T1CC'] * 1))
    
    # Calcular posesiones jugadas juntos
    df['Posesiones'] = (df['T2I'] + df['T3I']) + (0.44 * df['T1I']) - df['REBO'] +  df['PER']
    
    # Save table as csv with match id
    match_id = match_json.split('_')[1].split('.')[0]
    df.to_csv(f"C:\\Users\\bsanchez\\Downloads\\Cadete2025\\cadete2025\\Lineups\\barsa_lineups_stats_{match_id}.csv", index=False)


# Agregar stats de todos los archivos CSV
# Directory containing the files
os.chdir('C:\\Users\\bsanchez\\Downloads\\Cadete2025\\cadete2025\\Lineups')

# List all CSV files starting with "barsa_lineups_stats"
csv_files = [os.path.join(os.getcwd(), f) for f in os.listdir() if f.startswith("barsa_lineups_stats") and f.endswith(".csv")]

# Read and concatenate all CSVs with semicolon separator
df_list = [pd.read_csv(file, sep=',') for file in csv_files]
combined_df = pd.concat(df_list, ignore_index=True)

# Group by 'Quinteto' and sum numeric columns
grouped_df = combined_df.groupby("Quinteto", as_index=False).sum(numeric_only=True)

grouped_df.head()    

grouped_df['PTS'] = (grouped_df['T2C'] * 2) +  (grouped_df['T3C'] * 3) +  grouped_df['T1C']
grouped_df['PTSC'] = (grouped_df['T2CC'] * 2) +  (grouped_df['T3CC'] * 3) +  grouped_df['T1CC']

# Reordenar columnas
new_order = ['Quinteto', 'PTS', 'PTSC'] + [col for col in grouped_df.columns if col not in ['Quinteto', 'PTS', 'PTSC']]
grouped_df = grouped_df[new_order]

# Guardar como CSV
grouped_df.to_csv("barsa_lineups_stats.csv", index=False)

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

for lineup, actions in lineups_stints_actions.items():
    tiempos = {}
    actions_list = []
    for action in actions:
        actions_list.append(int(action[0]["num"]))
        # Guardar cuarto y tiempo restante de cada acción
        tiempos[int(action[0]["num"])] = [action[0]["quarter"], action[0]["time"]]
        
    print(tiempos)


# Save player photos
player_photos = {}

# Read JSON file
for match_json in json_files:
    with open(match_json, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
    if data["HEADER"]["competition"] != "C ESP CLUBES CAD MASC":
        continue
    if data["HEADER"]["TEAM"][0]["name"] != "BARÇA" and data["HEADER"]["TEAM"][1]["name"] != "BARÇA":
        continue
    
    local = data['SCOREBOARD']['TEAM'][0]['name']
    visitante = data['SCOREBOARD']['TEAM'][1]['name']
    
    if local == "BARÇA":
        for player_barsa in data['SCOREBOARD']['TEAM'][0]['PLAYER']:
            if player_barsa["name"] not in player_photos:
                player_photos[player_barsa["name"]] = player_barsa["logo"]
                
    elif visitante == "BARÇA":
        for player_barsa in data['SCOREBOARD']['TEAM'][1]['PLAYER']:
            if player_barsa["name"] not in player_photos:
                player_photos[player_barsa["name"]] = player_barsa["logo"]

# Save photos as JSON
with open("fotos_barsa_lineups.json", "w", encoding="utf-8") as f:
    json.dump(player_photos, f, indent=4, ensure_ascii=False)
    
    
    