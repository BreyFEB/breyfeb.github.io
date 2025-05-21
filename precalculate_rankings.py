import json
import os
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Any
import pandas as pd

def minutes_to_seconds(min_formatted):
    if not min_formatted:
        return 0
    try:
        minutes, seconds = map(int, min_formatted.split(':'))
        return minutes * 60 + seconds
    except:
        return 0

def is_group_phase(match_round):
    return match_round.strip().upper() in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

def process_match_data(data):
    players_map = {}
    phase_records = {}  # New dictionary for phase-specific records
    competition_set = set()
    team_set = set()
    
    comp = data['HEADER'].get('competition', '')
    match_round = data['HEADER'].get('round', '')
    match_date = data['HEADER'].get('starttime', '')
    competition_set.add(comp)
    
    # Determine if it's a female competition
    female_competitions = [
        "LF ENDESA",
        "LF CHALLENGE",
        "L.F.-2",
        "C ESP CLUBES JR FEM",
        "CE SSAA Cadete Fem.",
        "CE SSA Infantil Fem.",
        "C ESP CLUBES CAD FEM",
        "Fase Final 1ª División Femenin"
    ]
    genero = "M" if any(f.lower() == comp.strip().lower() for f in female_competitions) else "H"
    
    # Process both teams
    for team_idx in [0, 1]:
        team_header = data['HEADER']['TEAM'][team_idx]
        team = data['SCOREBOARD']['TEAM'][team_idx]
        team_name = team_header.get('name', f'Equipo {team_idx+1}')
        team_points = int(team_header.get('pts', 0))
        team_set.add(team_name)
        
        rival_idx = 1 if team_idx == 0 else 0
        rival_header = data['HEADER']['TEAM'][rival_idx]
        rival_name = rival_header.get('name', f'Equipo {rival_idx+1}')
        rival_points = int(rival_header.get('pts', 0))
        
        current_phase = "Fase de Grupos" if is_group_phase(match_round) else "Playoffs"
        
        # Process each player in the team
        for player in team.get('PLAYER', []):
            player_id = player.get('id', '')
            if not player_id:
                continue
                
            # Create unique IDs for total and phase-specific stats
            total_id = f"{player_id}-{team_name}-{comp}"
            group_phase_id = f"{player_id}-{team_name}-{comp}-grupos"
            playoffs_id = f"{player_id}-{team_name}-{comp}-playoffs"
            
            # Initialize total record if it doesn't exist
            if total_id not in players_map:
                players_map[total_id] = {
                    'id': player_id,
                    'dorsal': player.get('no', ''),
                    'playerPhoto': player.get('logo', 'https://via.placeholder.com/50'),
                    'playerName': player.get('name', 'Desconocido'),
                    'teamName': team_name,
                    'competition': comp,
                    'round_': match_round,
                    'phaseType': "",
                    'gender': genero,
                    'games': 0,
                    'seconds': 0,
                    'pts': 0,
                    't2i': 0,
                    't2c': 0,
                    't3i': 0,
                    't3c': 0,
                    'tli': 0,
                    'tlc': 0,
                    'ro': 0,
                    'rd': 0,
                    'rt': 0,
                    'as': 0,
                    'br': 0,
                    'bp': 0,
                    'tp': 0,
                    'fc': 0,
                    'va': 0,
                    'pm': 0,
                    'matches': []
                }
            
            # Initialize phase record if it doesn't exist
            phase_id = group_phase_id if current_phase == "Fase de Grupos" else playoffs_id
            if phase_id not in phase_records:
                phase_records[phase_id] = {
                    'id': player_id,
                    'dorsal': player.get('no', ''),
                    'playerPhoto': player.get('logo', 'https://via.placeholder.com/50'),
                    'playerName': player.get('name', 'Desconocido'),
                    'teamName': team_name,
                    'competition': comp,
                    'round_': match_round,
                    'phaseType': current_phase,
                    'gender': genero,
                    'games': 0,
                    'seconds': 0,
                    'pts': 0,
                    't2i': 0,
                    't2c': 0,
                    't3i': 0,
                    't3c': 0,
                    'tli': 0,
                    'tlc': 0,
                    'ro': 0,
                    'rd': 0,
                    'rt': 0,
                    'as': 0,
                    'br': 0,
                    'bp': 0,
                    'tp': 0,
                    'fc': 0,
                    'va': 0,
                    'pm': 0,
                    'matches': []
                }
            
            # Get current records
            total_record = players_map[total_id]
            phase_record = phase_records[phase_id]
            
            # Process match statistics
            p2a = int(player.get('p2a', 0))
            p2m = int(player.get('p2m', 0))
            p3a = int(player.get('p3a', 0))
            p3m = int(player.get('p3m', 0))
            p1a = int(player.get('p1a', 0))
            p1m = int(player.get('p1m', 0))
            
            # Calculate percentages
            pct2 = round((p2m / p2a) * 100, 1) if p2a > 0 else 0.0
            pct3 = round((p3m / p3a) * 100, 1) if p3a > 0 else 0.0
            pctTl = round((p1m / p1a) * 100, 1) if p1a > 0 else 0.0
            
            # Create match record
            match_record = {
                'matchDate': match_date,
                'round_': match_round,
                'phaseType': current_phase,
                'rival': rival_name,
                'rivalFull': rival_name,
                'rivalShort': rival_name[:3].upper(),
                'minutes': player.get('minFormatted', '0:00'),
                'pts': int(player.get('pts', 0)),
                't2i': p2a,
                't2c': p2m,
                'pct2': pct2,
                't3i': p3a,
                't3c': p3m,
                'pct3': pct3,
                'tli': p1a,
                'tlc': p1m,
                'pctTl': pctTl,
                'ro': int(player.get('ro', 0)),
                'rd': int(player.get('rd', 0)),
                'rt': int(player.get('rt', 0)),
                'as': int(player.get('assist', 0)),
                'br': int(player.get('st', 0)),
                'bp': int(player.get('to', 0)),
                'tp': int(player.get('bs', 0)),
                'fc': int(player.get('pf', 0)),
                'va': int(player.get('val', 0)),
                'pm': int(player.get('pllss', 0)),
                'teamPoints': team_points,
                'rivalPoints': rival_points,
                'resultado': 'G' if team_points > rival_points else 'P',
                'marcador': f"{team_points}-{rival_points}"
            }
            
            # Update both records
            for record in [total_record, phase_record]:
                record['games'] += 1
                record['seconds'] += minutes_to_seconds(player.get('minFormatted', '0:00'))
                record['pts'] += int(player.get('pts', 0))
                record['t2i'] += p2a
                record['t2c'] += p2m
                record['t3i'] += p3a
                record['t3c'] += p3m
                record['tli'] += p1a
                record['tlc'] += p1m
                record['ro'] += int(player.get('ro', 0))
                record['rd'] += int(player.get('rd', 0))
                record['rt'] += int(player.get('rt', 0))
                record['as'] += int(player.get('assist', 0))
                record['br'] += int(player.get('st', 0))
                record['bp'] += int(player.get('to', 0))
                record['tp'] += int(player.get('bs', 0))
                record['fc'] += int(player.get('pf', 0))
                record['va'] += int(player.get('val', 0))
                record['pm'] += int(player.get('pllss', 0))
                record['matches'].append(match_record)
            
            # Update percentages for both records
            for record in [total_record, phase_record]:
                record['pct2'] = round((record['t2c'] / record['t2i']) * 100, 1) if record['t2i'] > 0 else 0.0
                record['pct3'] = round((record['t3c'] / record['t3i']) * 100, 1) if record['t3i'] > 0 else 0.0
                record['pctTl'] = round((record['tlc'] / record['tli']) * 100, 1) if record['tli'] > 0 else 0.0
    
    return {
        'players': list(players_map.values()),
        'phase_records': list(phase_records.values()),
        'competitions': list(competition_set),
        'teams': list(team_set)
    }

def main():
    # Directory containing match JSON files
    json_dir = "JSONs fichas"
    
    # Use dictionaries to store unique records
    all_players = {}
    all_phase_records = {}
    all_competitions = set()
    all_teams = set()
    
    # Process each JSON file
    for filename in os.listdir(json_dir):
        if filename.endswith('.json'):
            file_path = os.path.join(json_dir, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    match_data = json.load(f)
                    stats = process_match_data(match_data)
                    
                    # Update total records
                    for player in stats['players']:
                        player_id = player['id']
                        if player_id not in all_players:
                            all_players[player_id] = player
                        else:
                            # Update existing record
                            existing = all_players[player_id]
                            existing['games'] += player['games']
                            existing['seconds'] += player['seconds']
                            existing['pts'] += player['pts']
                            existing['t2i'] += player['t2i']
                            existing['t2c'] += player['t2c']
                            existing['t3i'] += player['t3i']
                            existing['t3c'] += player['t3c']
                            existing['tli'] += player['tli']
                            existing['tlc'] += player['tlc']
                            existing['ro'] += player['ro']
                            existing['rd'] += player['rd']
                            existing['rt'] += player['rt']
                            existing['as'] += player['as']
                            existing['br'] += player['br']
                            existing['bp'] += player['bp']
                            existing['tp'] += player['tp']
                            existing['fc'] += player['fc']
                            existing['va'] += player['va']
                            existing['pm'] += player['pm']
                            existing['matches'].extend(player['matches'])
                    
                    # Update phase records
                    for player in stats['phase_records']:
                        player_id = f"{player['id']}-{player['teamName']}-{player['competition']}"
                        if player_id not in all_phase_records:
                            all_phase_records[player_id] = player
                        else:
                            # Update existing record
                            existing = all_phase_records[player_id]
                            existing['games'] += player['games']
                            existing['seconds'] += player['seconds']
                            existing['pts'] += player['pts']
                            existing['t2i'] += player['t2i']
                            existing['t2c'] += player['t2c']
                            existing['t3i'] += player['t3i']
                            existing['t3c'] += player['t3c']
                            existing['tli'] += player['tli']
                            existing['tlc'] += player['tlc']
                            existing['ro'] += player['ro']
                            existing['rd'] += player['rd']
                            existing['rt'] += player['rt']
                            existing['as'] += player['as']
                            existing['br'] += player['br']
                            existing['bp'] += player['bp']
                            existing['tp'] += player['tp']
                            existing['fc'] += player['fc']
                            existing['va'] += player['va']
                            existing['pm'] += player['pm']
                            existing['matches'].extend(player['matches'])
                    
                    all_competitions.update(stats['competitions'])
                    all_teams.update(stats['teams'])
            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")
    
    # Convert dictionaries to lists for JSON serialization
    all_stats = {
        'players': list(all_players.values()),
        'phase_records': list(all_phase_records.values()),
        'competitions': list(all_competitions),
        'teams': list(all_teams)
    }
    
    # Save the precalculated stats
    output_file = 'rankings_stats.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_stats, f, ensure_ascii=False, indent=2)
    
    print(f"Precalculated stats saved to {output_file}")
    print(f"Processed {len(all_stats['players'])} total player records")
    print(f"Processed {len(all_stats['phase_records'])} phase-specific records")
    print(f"Found {len(all_stats['competitions'])} competitions")
    print(f"Found {len(all_stats['teams'])} teams")

if __name__ == "__main__":
    main() 