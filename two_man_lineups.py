# -*- coding: utf-8 -*-
"""
Created on Thu Jun 12 12:06:05 2025

@author: bsanchez
"""

from itertools import combinations
from collections import defaultdict
import pandas as pd

# Load the uploaded CSV file
file_path = "barsa_lineups_stats.csv"

# Reload the CSV with the correct delimiter
df = pd.read_csv(file_path, sep=';')

# Display the first few rows and column names
df.head(), df.columns.tolist()

# Convert each Quinteto to a list of players
df['Players'] = df['Quinteto'].apply(lambda x: [p.strip() for p in x.split(' - ')])

# List of stats we want to aggregate for each 2-man pair
stats_to_aggregate = [*df.columns[1:-1]]

# Initialize aggregation dictionary
pair_stats = defaultdict(lambda: {stat: 0.0 for stat in stats_to_aggregate})

def aggregate_lineup_stats(df, stats_to_aggregate, group_size=2, output_file=None):
    """
    Aggregates stats for all N-man combinations from a lineup.

    Parameters:
    - df (pd.DataFrame): DataFrame with a 'Players' column (list of players) and stat columns.
    - stats_to_aggregate (list): List of stat column names to aggregate.
    - group_size (int): Size of the lineup combinations (e.g., 2, 3, or 4).
    - output_file (str): Optional. If provided, saves the output DataFrame to this file.

    Returns:
    - pd.DataFrame: Aggregated stats for each group_size-man lineup.
    """
    lineup_stats = defaultdict(lambda: {stat: 0 for stat in stats_to_aggregate})

    for _, row in df.iterrows():
        players = row['Players']
        stats = {stat: row[stat] for stat in stats_to_aggregate}

        for group in combinations(players, group_size):
            key = tuple(sorted(group))
            for stat in stats_to_aggregate:
                lineup_stats[key][stat] += stats[stat]

    # Convert result to DataFrame
    lineup_stats_df = pd.DataFrame([
        {**{f"Player {i+1}": player for i, player in enumerate(group)}, **stats}
        for group, stats in lineup_stats.items()
    ])
    
    # Hacer una única columna de quinteto
    player_columns = [col for col in lineup_stats_df.columns if col.startswith("Player")]
    
    lineup_stats_df["Quinteto"] = lineup_stats_df[player_columns].apply(lambda row: ' - '.join(row.astype(str)), axis=1)
    
    # Drop player columns
    lineup_stats_df.drop(columns=player_columns, inplace=True)
    
    # Poner Quinteto como primera columna
    lineup_stats_df = lineup_stats_df[["Quinteto"] + [col for col in lineup_stats_df if col != "Quinteto"]]
    
    # Optional: save to CSV
    if output_file:
        lineup_stats_df.to_csv(output_file, index=False, sep=";")

    return lineup_stats_df

nombres_csv = [f"{n_jugadores}_man_lineups.csv" for n_jugadores in ["two", "three", "four"]]

aggregate_lineup_stats(df, stats_to_aggregate=stats_to_aggregate, group_size=4,
                       output_file=nombres_csv[2])



