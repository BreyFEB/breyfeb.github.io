import os
import json

json_dir = 'JSONs fichas'
missing_ids = []

for filename in os.listdir(json_dir):
    if filename.endswith('.json'):
        file_path = os.path.join(json_dir, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for team_idx in [0, 1]:
                    team = data.get('SCOREBOARD', {}).get('TEAM', [{}]*2)[team_idx]
                    for player in team.get('PLAYER', []):
                        if not player.get('id'):
                            missing_ids.append((filename, player.get('name', 'Unknown')))
        except Exception as e:
            print(f'Error reading {filename}: {e}')

if missing_ids:
    print('Players missing id:')
    for fname, pname in missing_ids:
        print(f'File: {fname} | Player: {pname}')
else:
    print('All player records have an id.') 