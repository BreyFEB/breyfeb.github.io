# -*- coding: utf-8 -*-
"""
Created on Tue Jul  1 10:07:41 2025

@author: bsanchez
"""

# Datos de campeonatos de clubes
import json
import pandas as pd
import os
from collections import defaultdict

# Generalize for all teams
os.chdir('C:\\Users\\bsanchez\\Documents\\cadete2025\\JSONs fichas')
json_files = [f for f in os.listdir() if f.endswith('.json')]

# Competiciones a mantener
# Nombres de archivos
competitions = [
  "C ESP CLUBES CAD MASC",
  "C ESP CLUBES CAD FEM",
  "C ESP CLUBES INF FEM",
  "C ESP CLUBES INF MASC",
  "C ESP CLUBES MINI MASC",
  "C ESP CLUBES MINI FEM"
]

competition_info = dict()

# Sacar partidos, resultados, rondas, competicion
for match_json in json_files:
    with open(match_json, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
    comp = data["HEADER"]["competition"]
    if comp not in competitions:
        continue
    elif comp not in competition_info:
        competition_info[comp] = []
        
    match_id = match_json.split('_')[1].split('.')[0]
    
    match_dict = dict()
    
    match_dict["match_id"] = match_id
    match_dict["ronda"] = data["HEADER"]["round"].strip()
    match_dict["datetime"] = data["HEADER"]["starttime"]
    
    team_a_score = data["HEADER"]["TEAM"][0]["pts"]
    team_a_name = data["HEADER"]["TEAM"][0]["name"]
    team_a_id = data["HEADER"]["TEAM"][0]["id"]
    team_a_logo = data["HEADER"]["TEAM"][0]["logo"]
    
    match_dict["team_a"] = {"score": team_a_score,
                            "name": team_a_name,
                            "id": team_a_id,
                            "logo": team_a_logo}
    
    team_b_score = data["HEADER"]["TEAM"][1]["pts"]
    team_b_name = data["HEADER"]["TEAM"][1]["name"]
    team_b_id = data["HEADER"]["TEAM"][1]["id"]
    team_b_logo = data["HEADER"]["TEAM"][1]["logo"]
    
    match_dict["team_b"] = {"score": team_b_score,
                            "name": team_b_name,
                            "id": team_b_id,
                            "logo": team_b_logo}
    
    competition_info[comp].append(match_dict)
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    



