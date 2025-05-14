import json
import os
from collections import defaultdict
from typing import Dict, List, Any
import pandas as pd

def load_json_files(directory: str) -> List[Dict[str, Any]]:
    """Load all JSON files from the specified directory."""
    json_files = []
    for filename in os.listdir(directory):
        if filename.endswith('.json'):
            file_path = os.path.join(directory, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    json_files.append(json.load(f))
            except Exception as e:
                print(f"Error loading {filename}: {e}")
    return json_files

def process_player_stats(matches: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Process matches and calculate aggregated player statistics."""
    player_stats = defaultdict(lambda: {
        'id': '',
        'nombre': '',
        'equipo': '',
        'genero': '',
        'competicion': '',
        'foto': '',
        'team_logo': '',
        'estadisticas': {
            'puntos': 0,
            'rebotes': 0,
            'asistencias': 0,
            'partidos': 0
        }
    })

    for match in matches:
        try:
            comp = match['HEADER'].get('competition', '')
            team_a_header = match['HEADER']['TEAM'][0]
            team_b_header = match['HEADER']['TEAM'][1]
            team_a = match['SCOREBOARD']['TEAM'][0]
            team_b = match['SCOREBOARD']['TEAM'][1]

            team_a_name = team_a_header.get('name', 'Equipo A')
            team_b_name = team_b_header.get('name', 'Equipo B')
            team_a_logo = team_a_header.get('logo', '')
            team_b_logo = team_b_header.get('logo', '')

            # Process both teams
            for team, team_name, team_logo in [
                (team_a, team_a_name, team_a_logo),
                (team_b, team_b_name, team_b_logo)
            ]:
                if not team or 'PLAYER' not in team:
                    continue

                for player in team['PLAYER']:
                    if not player or 'id' not in player:
                        continue

                    player_id = f"{player['id']}-{team_name}-{comp}-total"
                    stats = player_stats[player_id]

                    # Update player info if not set
                    if not stats['id']:
                        stats.update({
                            'id': player['id'],
                            'nombre': player.get('name', 'Desconocido'),
                            'equipo': team_name,
                            'genero': 'masculino' if comp.lower() in ['primera feb', 'segunda feb', 'tercera feb', 'c esp clubes jr masc'] else 'femenino',
                            'competicion': comp,
                            'foto': player.get('logo', 'https://randomuser.me/api/portraits/men/1.jpg'),
                            'team_logo': team_logo
                        })

                    # Update statistics
                    stats['estadisticas']['partidos'] += 1
                    stats['estadisticas']['puntos'] += int(player.get('pts', 0))
                    stats['estadisticas']['rebotes'] += (int(player.get('ro', 0)) + int(player.get('rd', 0)))
                    stats['estadisticas']['asistencias'] += int(player.get('assist', 0))

        except Exception as e:
            print(f"Error processing match: {e}")
            continue

    return player_stats

def calculate_averages(player_stats: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Calculate averages for each player's statistics."""
    players_list = []
    for player_id, stats in player_stats.items():
        partidos = stats['estadisticas']['partidos']
        if partidos > 0:
            player_data = stats.copy()
            player_data['estadisticas'] = {
                'puntos': round(stats['estadisticas']['puntos'] / partidos, 1),
                'rebotes': round(stats['estadisticas']['rebotes'] / partidos, 1),
                'asistencias': round(stats['estadisticas']['asistencias'] / partidos, 1)
            }
            players_list.append(player_data)
    return players_list

def save_stats_to_json(players_list: List[Dict[str, Any]], output_file: str):
    """Save the calculated statistics to a JSON file."""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(players_list, f, ensure_ascii=False, indent=2)

def main():
    # Directory containing JSON files
    json_dir = "JSONs fichas"
    output_file = "player_stats.json"

    # Load and process JSON files
    print("Loading JSON files...")
    matches = load_json_files(json_dir)
    print(f"Loaded {len(matches)} matches")

    # Process player statistics
    print("Processing player statistics...")
    player_stats = process_player_stats(matches)
    print(f"Processed statistics for {len(player_stats)} players")

    # Calculate averages
    print("Calculating averages...")
    players_list = calculate_averages(player_stats)

    # Save results
    print(f"Saving results to {output_file}...")
    save_stats_to_json(players_list, output_file)
    print("Done!")

    # Print some statistics
    print("\nSummary:")
    print(f"Total players: {len(players_list)}")
    print(f"Total matches processed: {len(matches)}")
    
    # Calculate some basic statistics
    df = pd.DataFrame(players_list)
    print("\nTop 5 players by points:")

if __name__ == "__main__":
    main()
