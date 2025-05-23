import json
import sys

def find_all_rounds(obj, found=None):
    if found is None:
        found = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == 'round_':
                found.add(v)
            find_all_rounds(v, found)
    elif isinstance(obj, list):
        for item in obj:
            find_all_rounds(item, found)
    return found

def get_unique_rounds():
    try:
        # Read the JSON file
        print("Reading rankings_stats.json...")
        with open('rankings_stats.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Verify the data structure
        if 'phase_records' not in data:
            print("Error: 'phase_records' not found in the JSON file")
            return
        
        # Get all unique round values from phase records
        unique_rounds = set()
        round_count = 0
        
        print("Recursively searching for all 'round_' key values...")
        unique_rounds = find_all_rounds(data)
        
        # Print results
        print("\nUnique round values found:")
        print("-" * 30)
        for round_value in sorted(unique_rounds):
            print(round_value)
        print("-" * 30)
        print(f"Total unique rounds: {len(unique_rounds)}")
        print(f"Total records processed: {round_count}")
        
    except FileNotFoundError:
        print("Error: rankings_stats.json file not found")
    except json.JSONDecodeError:
        print("Error: Invalid JSON format in rankings_stats.json")
    except Exception as e:
        print(f"An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    get_unique_rounds() 