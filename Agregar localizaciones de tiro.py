# -*- coding: utf-8 -*-
"""
Created on Wed Jun  4 10:29:04 2025

@author: bsanchez
"""

import json
import os
import math
import re

os.chdir("C:\\Users\\bsanchez\\Documents\\cadete2025\\JSONs fichas")

# Find all unique players
player_ids = []
all_leagues = []

# JSON files in directory
json_files = [j_file for j_file in os.listdir() if j_file.endswith(".json")]

for json_file in json_files:
    # Load data
    with open(json_file, 'r', encoding='utf-8') as f:
        match_data = json.load(f)
    
    all_players = match_data['SCOREBOARD']['TEAM'][0]['PLAYER'] + match_data['SCOREBOARD']['TEAM'][1]['PLAYER']
    for player in all_players:
        if player["id"] not in player_ids:
            player_ids.append(player["id"])
            
    if match_data["HEADER"]["competition"] not in all_leagues:
        all_leagues.append(match_data["HEADER"]["competition"])

dist_aro_metros = (1.575, 7.5)

for league in all_leagues:
    # Diccionario para almacenar todos los tiros de la liga
    player_shots = {}
    for json_file in json_files:
        match_list = []
        
        # Load data
        with open(json_file, 'r', encoding='utf-8') as f:
            match_data = json.load(f)

        liga = match_data["HEADER"]["competition"]
        if liga != league:
            continue
            
        # Guardar equipos del partido
        match_vs = match_data['HEADER']['TEAM'][0]["name"] + ' vs ' + match_data['HEADER']['TEAM'][1]["name"]
        match_id = json_file.split("_")[1].split('.')[0]
        
        fecha_hora = match_data["HEADER"]["starttime"]
        round_ = match_data["HEADER"]["round"].strip()
        
        # Identify player shots
        num_eventos = len(match_data['PLAYBYPLAY']['LINES'])
        for i in range(num_eventos - 1, -1, -1):
            evento = match_data['PLAYBYPLAY']['LINES'][i]
            if ("TIRO DE 2" in evento["text"] or "TIRO DE 3" in evento["text"]):
                # Crear diccionario completo del evento
                evento_dict = {}
                evento_dict["match"] = match_vs
                evento_dict["liga"] = liga
                evento_dict["fecha_hora"] = fecha_hora
                evento_dict["round"] = round_
                evento_dict["match_id"] = match_id
                evento_dict["equipo_string"] = re.search(r"\(([^)]*)\)", evento["text"]).group(1)
                
                # Identificar al jugador
                player_id = evento["idPlayer"]
                evento_dict["player_id"] = player_id
                
                evento_dict["desc_tiro"] = evento["text"]
                evento_dict["tiempo"] = evento["time"]
                evento_dict["cuarto"] = evento["quarter"]
                if evento["scoreA"] is not None:
                    evento_dict["scoreA"] = evento["scoreA"]
                    evento_dict["scoreB"] = evento["scoreB"]
                # Else find the most recent event with non null scores
                else:
                    found_score = False
                    for i_ in range(i + 1, num_eventos):
                        evento_ant = match_data['PLAYBYPLAY']['LINES'][i_]
                        if evento_ant["scoreA"] is not None:
                            evento_dict["scoreA"] = evento_ant["scoreA"]
                            evento_dict["scoreB"] = evento_ant["scoreB"]
                            found_score = True
                            break
                    
                    if not found_score:
                        evento_dict["scoreA"] = "0"
                        evento_dict["scoreB"] = "0"
                            
                evento_dict["coord"] = evento["Position"]
                try:
                    coordenada_x = float(evento["Position"].split('|')[0].strip())
                except:
                    continue
                try:
                    coordenada_y = float(evento["Position"].split('|')[1].strip())
                except:
                    continue
                
                # Coordenadas del tiro en escala 0-100
                evento_dict["coord_x"] = coordenada_x if coordenada_x < 50 else (100 - coordenada_x)
                evento_dict["coord_y"] = coordenada_y if coordenada_x < 50 else (100 - coordenada_y)
                # Coordenadas del tiro en metros
                evento_dict["coord_x_metros"] = (evento_dict["coord_x"] * 28) / 100
                evento_dict["coord_y_metros"] = (evento_dict["coord_y"] * 15) / 100
                # Distancia al aro en metros
                evento_dict["dist_al_aro"] = math.sqrt((evento_dict["coord_x_metros"] - dist_aro_metros[0])**2 + (evento_dict["coord_y_metros"] - dist_aro_metros[1])**2)
                
                evento_dict["equipo"] = evento["team"]
                evento_dict["made"] = True if "ANOTADO" in evento["text"] else False
                evento_dict["two_or_three"] = 2 if "TIRO DE 2" in evento["text"] else 3
                # Depende de si es local o visitante:
                if evento["team"] == "1":
                    evento_dict["dif_marcador"] = int(evento_dict["scoreA"]) - int(evento_dict["scoreB"])
                else:
                    evento_dict["dif_marcador"] = int(evento_dict["scoreB"]) - int(evento_dict["scoreA"])
                
                match_list.append(evento_dict)
        
        # Hacer append de match_list si contiene datos del jugador
        if match_list:
            player_shots.update({match_id: match_list})
            
    # Save player_shots as JSON
    remove_chars = ".-ª"
    
    # Create a translation table to delete those characters
    translation_table = str.maketrans('', '', remove_chars)

    league_cleaned = league.translate(translation_table).lower().replace(' ', '_')
    
    filename = f"players_shots_{league_cleaned}.json"
    with open(f'C:\\Users\\bsanchez\\Downloads\\Cadete2025\\cadete2025\\Tiros por liga\\{filename}', 'w', encoding='utf-8') as f:
        json.dump(player_shots, f, ensure_ascii=False, indent=4)    
            
            
            
            
            
            
            
            
            
            
    