# -*- coding: utf-8 -*-
"""
Created on Mon Jul 14 11:57:01 2025

@author: bsanchez
"""

import os
import json

os.chdir("C:\\Users\\bsanchez\\Documents\\cadete2025\\JSONs fichas")

match_jsons = [f for f in os.listdir() if f.endswith(".json")]

for partido in match_jsons:
    # Mayor ventaja para cada equipo
    with open(partido, 'r', encoding='utf-8') as f:
        match_json = json.load(f)
        
    # Saltar si es MINI
    if "MINI" in match_json["HEADER"]["competition"]:
        continue
    
    todos_eventos = match_json['PLAYBYPLAY']['LINES']
    
    todos_eventos.reverse()
    
    final_partido = {
                     'local': {
                        'mayor_ventaja': {},
                        'mayor_racha': {},
                        'tiempo_liderando': {},
                        'ptscontraataque': {},
                        'ptssegunda': 0,
                        'ptspintura': 0,
                        'ptsbanquillo': {},
                        'ptstrasperdida': 0
                        },
                     'visitante': {
                        'mayor_ventaja': {},
                        'mayor_racha': {},
                        'tiempo_liderando': {},
                        'ptscontraataque': {},
                        'ptssegunda': 0,
                        'ptspintura': 0,
                        'ptsbanquillo': {},
                        'ptstrasperdida': 0
                        },
                     'veces_empatado': {'veces': 0, 'tramos': []},
                     'cambios_de_liderato': {'cambios': 0, 'momentos': []}
                    }
    
    ventaja_local = 0
    ventaja_visitante = 0
    
    for evento in todos_eventos:
        if (evento['scoreA'] is not None) and (evento['scoreB'] is not None):
            try:
                score_local = int(evento['scoreA'])
                score_visitante = int(evento['scoreB'])
                
                ventaja_local_evento = score_local - score_visitante
                if ventaja_local_evento > ventaja_local:
                    ventaja_local = ventaja_local_evento
                    
                ventaja_visitante_evento = score_visitante - score_local
                if ventaja_visitante_evento > ventaja_visitante:
                    ventaja_visitante = ventaja_visitante_evento
                
            except:
                print('Cannot convert to int')
            
    # Guardar datos de ventajas
    final_partido['local']['mayor_ventaja']['ventaja'] =  ventaja_local
    final_partido['visitante']['mayor_ventaja']['ventaja'] =  ventaja_visitante
    
    scores = []
    
    for i in range(len(todos_eventos)):
        evento = todos_eventos[i]  
        
        if (evento['scoreA'] is not None) and (evento['scoreB'] is not None):
            try:
                score_local = int(evento['scoreA'])
                score_visitante = int(evento['scoreB'])
                
                score_dict = {'score': (score_local, score_visitante),
                              'quarter': evento['quarter'],
                              'time': evento['time'],
                              'ventaja': int(evento['scoreA']) - int(evento['scoreB'])}
                
                scores.append(score_dict)
                    
            except:
                print('Cannot convert to int')
    
    # Sacar tiempos durante los cuales se ha mantenido la mayor ventaja
    # Para local
    racha_empezada = False
    tramos_local = []
    tramo_local = {'inicio': '', 'final': ''}
    
    for evento in scores:
        # Ventaja local es número positivo
        if evento['ventaja'] == final_partido['local']['mayor_ventaja']['ventaja'] and not racha_empezada:
            tramo_local['inicio'] = evento['quarter'] + ' ' + evento['time']
            
            # Marcar que ha empezado tramo de máxima ventaja
            racha_empezada = True
    
        if evento['ventaja'] != final_partido['local']['mayor_ventaja']['ventaja'] and racha_empezada:
            tramo_local['final'] = evento['quarter'] + ' ' + evento['time']
            
            # Guardar tramo
            tramos_local.append(tramo_local.copy())
            
            # Resetear tramo
            tramo_local = {'inicio': '', 'final': ''}
            
            # Resetear racha
            racha_empezada = False
    
    final_partido['local']['mayor_ventaja']['tramos'] = tramos_local
    
    # Para visitante
    racha_empezada = False
    tramos_visitante = []
    tramo_visitante = {'inicio': '', 'final': ''}
    
    for evento in scores:
        # Ventaja local es número positivo
        if (evento['ventaja'] * -1) == final_partido['visitante']['mayor_ventaja']['ventaja'] and not racha_empezada:
            tramo_visitante['inicio'] = evento['quarter'] + ' ' + evento['time']
            
            # Marcar que ha empezado tramo de máxima ventaja
            racha_empezada = True
    
        if (evento['ventaja'] * -1) != final_partido['visitante']['mayor_ventaja']['ventaja'] and racha_empezada:
            tramo_visitante['final'] = evento['quarter'] + ' ' + evento['time']
            
            # Guardar tramo
            tramos_visitante.append(tramo_visitante.copy())
            
            # Resetear tramo
            tramo_visitante = {'inicio': '', 'final': ''}
            
            # Resetear racha
            racha_empezada = False
    
    final_partido['visitante']['mayor_ventaja']['tramos'] = tramos_visitante
    
    # Mayores rachas
    rachas_max_local = {'racha': 0, 'inicio': '', 'final': ''}
    rachas_max_visitante = {'racha': 0, 'inicio': '', 'final': ''}
    
    racha_local = 0
    racha_visitante = 0
    racha_local_bool = False
    racha_visitante_bool = False
    
    for i in range(len(scores)):
        scoring_event = scores[i]
        
        if i > 0:
            scoring_event_previo = scores[i - 1]
            
            score_local = scoring_event['score'][0]
            score_local_previo = scoring_event_previo['score'][0]
            
            score_visitante = scoring_event['score'][1]
            score_visitante_previo = scoring_event_previo['score'][1]
            
            # Racha para el local
            if score_visitante == score_visitante_previo:
                if racha_local == 0:
                    racha_local_bool = True
                    inicio_racha = scoring_event['quarter'] + ' ' + scoring_event['time']
                    
                racha_local += score_local - score_local_previo
            
            # Si el equipo visitante ha anotado, se acaba la racha local
            elif score_visitante != score_visitante_previo:
                if (racha_local > 0) and (racha_local > rachas_max_local['racha']):
                    rachas_max_local['racha'] = racha_local
                    rachas_max_local['inicio'] = inicio_racha
                    rachas_max_local['final'] = scoring_event['quarter'] + ' ' + scoring_event['time']
                    
                racha_local = 0
                racha_local_bool = False
                
            # Racha para el visitante
            if score_local == score_local_previo:
                # Comprobar si es el comienzo de la racha
                if racha_visitante == 0:
                    racha_visitante_bool = True
                    inicio_racha_visitante = scoring_event['quarter'] + ' ' + scoring_event['time']
                    
                racha_visitante += score_visitante - score_visitante_previo
            
            # Si el equipo local ha anotado, se acaba la racha visitante
            elif score_local != score_local_previo:
                if (racha_visitante > 0) and (racha_visitante > rachas_max_visitante['racha']):
                    rachas_max_visitante['racha'] = racha_visitante
                    rachas_max_visitante['inicio'] = inicio_racha_visitante
                    rachas_max_visitante['final'] = scoring_event['quarter'] + ' ' + scoring_event['time']
                    
                racha_visitante = 0
                racha_visitante_bool = False
                
    final_partido['local']['mayor_racha'] = rachas_max_local
    final_partido['visitante']['mayor_racha'] = rachas_max_visitante
    
    # Veces empatado, distinto de 0-0
    veces_empatado = 0
    tramos_empate = []
    tramo_empate_empezado = False
    
    for scoring_event in scores:
        score_local = scoring_event['score'][0]
        score_visitante = scoring_event['score'][1]
        
        if score_local == score_visitante and not tramo_empate_empezado:
            veces_empatado += 1
            marcador = str(score_local) + '-' + str(score_visitante)
            
            tramo_empate_empezado = True
            inicio = scoring_event['quarter'] + ' ' + scoring_event['time']
            
        if score_local != score_visitante and tramo_empate_empezado:
            tramo_empate_empezado = False
            final = scoring_event['quarter'] + ' ' + scoring_event['time']
            
            tramos_empate.append({'inicio': inicio, 'final': final, 'marcador': marcador})
        
    final_partido['veces_empatado']['veces'] = veces_empatado
    final_partido['veces_empatado']['tramos'] = tramos_empate
    
    # Cambios de liderato
    # GUARDAR CUANDO OCURREN
    for scoring_event in scores:
        score_local = scoring_event['score'][0]
        score_visitante = scoring_event['score'][1]
        
        if score_local > score_visitante:
            scoring_event['lider'] = 'local'
        elif score_visitante > score_local:
            scoring_event['lider'] = 'visitante'
        elif score_local == score_visitante:
            scoring_event['lider'] = 'empatado'
            
    # Quitar scoring events con empate para facilitar cáclulo de cambios de
    # liderato
    scoring_events_sin_empates = []
    
    for scoring_event in scores:
        if scoring_event['lider'] != 'empatado':
            scoring_events_sin_empates.append(scoring_event)
    
    cambios_liderato = 0
    
    for i in range(len(scoring_events_sin_empates)):
        if i > 0:
            scoring_event = scoring_events_sin_empates[i]
            previous_scoring_event = scoring_events_sin_empates[i - 1]
            
            # Mirar si hay cambio de lider
            lider = scoring_event['lider']
            previous_lider = previous_scoring_event['lider']
            
            if lider != previous_lider:
                cambios_liderato += 1
                marcador_previo = str(previous_scoring_event['score'][0]) + '-' + str(previous_scoring_event['score'][1])
                marcador_actual = str(scoring_event['score'][0]) + '-' + str(scoring_event['score'][1])
                cambio_marcador = 'De ' + marcador_previo + ' a ' + marcador_actual
                
                # Guardar cuándo ocurre el cambio de liderato
                cuarto_tiempo = scoring_event['quarter'] + ' ' + scoring_event['time']
                final_partido['cambios_de_liderato']['momentos'].append([cuarto_tiempo, cambio_marcador])
        
    final_partido['cambios_de_liderato']['cambios'] = cambios_liderato
    
    # Tiempo liderando
    # Considerar el caso de MINI, cuartos de 8 minutos
    def quarter_to_seconds_remaining(quarter, time):
        # Necesario saber el número de cuartos para calcular tiempo restante 
        # correctamente
        minutes_remaining = {
            '1': 30 * 60,
            '2': 20 * 60,
            '3': 10 * 60,
            '4': 0
        }
        
        quarter_remaining = minutes_remaining[quarter] if int(quarter) < 5 else 0
        
        time_in_seconds = (int(time.split(':')[0]) * 60) + int(time.split(':')[1])
        
        time_remaining_seconds = quarter_remaining + time_in_seconds
        
        return time_remaining_seconds
    
    ventajas = []    
    
    for scoring_event in scores:
        score_local = scoring_event['score'][0]
        score_visitante = scoring_event['score'][1]
        
        ventaja = score_local - score_visitante
        
        time_remaining = quarter_to_seconds_remaining(scoring_event['quarter'],
                                                      scoring_event['time'])
        
        ventajas.append({'ventaja': ventaja, 'tiempo_restante': time_remaining})
     
    # Calcular tiempo liderando para cada equipo
    tiempo_liderando_local = 0
    tiempo_liderando_visitante = 0
    # Diferencia entre tiempo total de partido y tiempo no empatado
    tiempo_empate = 0
    
    # Lidiar con cambios de ventaja
    for i in range(len(ventajas)):
        ventaja_ = ventajas[i]['ventaja']
        tiempo_rest = ventajas[i]['tiempo_restante']
        
        if i > 0:
            ventaja_previa = ventajas[i - 1]['ventaja']
            tiempo_rest_previo = ventajas[i - 1]['tiempo_restante']
            
            # Caso de prórrogas
            if tiempo_rest > tiempo_rest_previo:
                continue
            
            if (ventaja != 0) and (ventaja_previa == 0):
                tiempo_empate += (tiempo_rest_previo - tiempo_rest)
                continue
            
            # Tiempo liderando para equipo local
            if (ventaja > 0) or (ventaja < 0 and ventaja_previa > 0):
                tiempo_a_anadir = tiempo_rest_previo - tiempo_rest
                tiempo_liderando_local += tiempo_a_anadir
                continue
            
            # Tiempo liderando para equipo visitante
            if (ventaja < 0) or (ventaja > 0 and ventaja_previa < 0):
                tiempo_a_anadir = tiempo_rest_previo - tiempo_rest
                tiempo_liderando_visitante += tiempo_a_anadir
                continue
                
            # Casos donde la ventaja es 0
            if ventaja == 0:
                if ventaja_previa > 0:
                    tiempo_a_anadir = tiempo_rest_previo - tiempo_rest
                    tiempo_liderando_local += tiempo_a_anadir
                elif ventaja_previa < 0:
                    tiempo_a_anadir = tiempo_rest_previo - tiempo_rest
                    tiempo_liderando_visitante += tiempo_a_anadir
    
    # Tiempo liderando por 1-5, 6-10, +10
    from collections import defaultdict
    
    def compute_lead_time(data):
        lead_times = {
            'local': defaultdict(int),
            'visitante': defaultdict(int)
        }
    
        def get_range_label(ventaja):
            abs_v = abs(ventaja)
            if 1 <= abs_v <= 5:
                return '1-5'
            elif 6 <= abs_v <= 10:
                return '6-10'
            elif abs_v > 10:
                return '+10'
            return None
    
        for i in range(len(data) - 1):
            current = data[i]
            next_ = data[i + 1]
            delta_t = current['tiempo_restante'] - next_['tiempo_restante']
            ventaja = current['ventaja']
            
            # Lidiar con prórrogas
            if delta_t < 0 or ventaja == 0:
                continue
            
            team = 'local' if ventaja > 0 else 'visitante'
            label = get_range_label(ventaja)
            if label:
                lead_times[team][label] += delta_t / 60
    
        return lead_times
    
    ventajas_comp = compute_lead_time(ventajas)
    
    final_partido['local']['tiempo_liderando'] = ventajas_comp['local']
    final_partido['visitante']['tiempo_liderando'] = ventajas_comp['visitante']
    
    # Puntos al contraataque ------------------------------------------------------
    pts_contraataque_local = {'tras_robo': 0, 'tras_rebote_def': 0, 'tras_tapon': 0}
    pts_contraataque_visitante = {'tras_robo': 0, 'tras_rebote_def': 0, 'tras_tapon': 0}
    
    def dif_tiempo(tiempo1, tiempo2):
        seg1 = (int(tiempo1.split(':')[0].strip()) * 60) + int(tiempo1.split(':')[1].strip())
        seg2 = (int(tiempo2.split(':')[0].strip()) * 60) + int(tiempo2.split(':')[1].strip())
        
        return abs(seg1 - seg2)
    
    # Tras tapón, tras rebote defensivo, tras robo
    for i in range(len(todos_eventos)):
        evento_actual = todos_eventos[i]
        
        if i == (len(todos_eventos) - 1) or i == 0:
            continue
        
        evento_siguiente = todos_eventos[i + 1]
        evento_anterior = todos_eventos[i - 1]
        
        # Condiciones para tiro anotado en contraataque tras robo
        same_team = evento_actual['team'] == evento_siguiente['team']
        es_robo = evento_actual['action'] == 'recovery'
        tiro_2_o_3_anotado = 'ANOTADO' in evento_siguiente['text']
        # Máximo 8 segundos entre un evento y otro
        diferencia_tiempo = dif_tiempo(evento_actual['time'], evento_siguiente['time']) <= 8
        
        if same_team and es_robo and tiro_2_o_3_anotado and diferencia_tiempo:
            if evento_siguiente['team'] == '1':
                if 'TIRO DE 2' in evento_siguiente['text']:
                    pts_contraataque_local['tras_robo'] += 2
                elif 'TIRO DE 3' in evento_siguiente['text']:
                    pts_contraataque_local['tras_robo'] += 3
            elif evento_siguiente['team'] == '2':
                if 'TIRO DE 2' in evento_siguiente['text']:
                    pts_contraataque_visitante['tras_robo'] += 2
                elif 'TIRO DE 3' in evento_siguiente['text']:
                    pts_contraataque_visitante['tras_robo'] += 3
                    
        # Tras rebote defensivo (no tapón)
        es_rebote = evento_actual['action'] == 'rebound'
        # El tiro tiene que ser fallado por equipo distinto al que rebotea para que
        # sea rebote defensivo
        tiro_fallado_rival = ('FALLADO' in evento_anterior['text']) and (evento_anterior['team'] != evento_actual['team'])
        es_rebote_def = es_rebote and tiro_fallado_rival
        
        if same_team and es_rebote_def and tiro_2_o_3_anotado and diferencia_tiempo:
            if evento_siguiente['team'] == '1':
                if 'TIRO DE 2' in evento_siguiente['text']:
                    pts_contraataque_local['tras_rebote_def'] += 2
                elif 'TIRO DE 3' in evento_siguiente['text']:
                    pts_contraataque_local['tras_rebote_def'] += 3
            elif evento_siguiente['team'] == '2':
                if 'TIRO DE 2' in evento_siguiente['text']:
                    pts_contraataque_visitante['tras_rebote_def'] += 2
                elif 'TIRO DE 3' in evento_siguiente['text']:
                    pts_contraataque_visitante['tras_rebote_def'] += 3
                    
        # Tras tapon en defensa reboteado por el equipo en defensa
        es_tapon_en_defensa = evento_anterior['action'] == 'blockshot'
        same_team = evento_actual['team'] == evento_anterior['team'] == evento_siguiente['team']
        
        if same_team and es_tapon_en_defensa and tiro_2_o_3_anotado and diferencia_tiempo:
            if evento_siguiente['team'] == '1':
                if 'TIRO DE 2' in evento_siguiente['text']:
                    pts_contraataque_local['tras_tapon'] += 2
                elif 'TIRO DE 3' in evento_siguiente['text']:
                    pts_contraataque_local['tras_tapon'] += 3
            elif evento_siguiente['team'] == '2':
                if 'TIRO DE 2' in evento_siguiente['text']:
                    pts_contraataque_visitante['tras_tapon'] += 2
                elif 'TIRO DE 3' in evento_siguiente['text']:
                    pts_contraataque_visitante['tras_tapon'] += 3
                    
    final_partido['local']['ptscontraataque'] = pts_contraataque_local
    final_partido['visitante']['ptscontraataque'] = pts_contraataque_visitante
    
    
    # Puntos de segunda oportunidad
    # ¿Incluir tiros libres?
    # Contemplar tapones
    pts_seg_local = 0
    pts_seg_visitante = 0
    
    for i in range(len(todos_eventos)):
        evento_actual = todos_eventos[i]
        
        if i == (len(todos_eventos) - 1) or i == 0:
            continue
        
        evento_anterior = todos_eventos[i - 1]
        evento_siguiente = todos_eventos[i + 1]
        
        # Condiciones para tiro anotado tras rebote ofensivo
        same_team = evento_actual['team'] == evento_siguiente['team'] == evento_anterior['team']
        tiro_fallado = 'FALLADO' in evento_anterior['text']
        es_rebote = evento_actual['action'] == 'rebound'
        tiro_2_o_3 = 'ANOTADO' in evento_siguiente['text']
        
        if same_team and es_rebote and tiro_2_o_3 and tiro_fallado:
            if evento_siguiente['team'] == '1':
                if 'TIRO DE 2' in evento_siguiente['text']:
                    pts_seg_local += 2
                elif 'TIRO DE 3' in evento_siguiente['text']:
                    pts_seg_local += 3
            if evento_siguiente['team'] == '2':
                if 'TIRO DE 2' in evento_siguiente['text']:
                    pts_seg_visitante += 2
                elif 'TIRO DE 3' in evento_siguiente['text']:
                    pts_seg_visitante += 3
        
    final_partido['local']['ptssegunda'] = pts_seg_local
    final_partido['visitante']['ptssegunda'] = pts_seg_visitante
    
    # Puntos en la pintura
    pts_pintura_local = 0
    pts_pintura_visitante = 0
    
    # Delimitar areas de pinturas
    x1 = 5.8
    x2 = 22.2
    y1 = 5.05
    y2 = 9.95
    
    x1_coord = x1 * 100 / 28
    x2_coord = x2 * 100 / 28
    y1_coord = y1 * 100 / 15
    y2_coord = y2 * 100 / 15
    
    for evento in todos_eventos:
        if 'TIRO DE 2 ANOTADO' in evento['text']:
            try:
                x_coord = float(evento['Position'].split('|')[0].strip())
                y_coord = float(evento['Position'].split('|')[1].strip())
            except:
                continue
            
            condicion_x = x_coord < x1_coord or x_coord > x2_coord
            condicion_y = y_coord > y1_coord and y_coord < y2_coord
            
            if condicion_x and condicion_y:
                if evento['team'] == '1':
                    pts_pintura_local += 2
                elif evento['team'] == '2':
                    pts_pintura_visitante += 2
    
    final_partido['local']['ptspintura'] = pts_pintura_local
    final_partido['visitante']['ptspintura'] = pts_pintura_visitante
    
    # Puntos de banquillo
    quinteto_inicial_local = set()
    quinteto_inicial_visitante = set()
    jugadores_anadidos = 0
    
    for evento in todos_eventos[:20]:
        if jugadores_anadidos == 10:
            break
        
        if 'entra a pista' in evento['text'].lower():
            if evento['team'] == '1':
                quinteto_inicial_local.add(evento['idPlayer'])
                jugadores_anadidos += 1
            elif evento['team'] == '2':
                quinteto_inicial_visitante.add(evento['idPlayer'])
                jugadores_anadidos += 1
    
    pts_banquillo_local = {'1': 0, '2': 0, '3':0}
    pts_banquillo_visitante = {'1': 0, '2': 0, '3':0}
    
    for evento in todos_eventos:
        if 'ANOTADO' in evento['text'].upper():
            if 'TIRO DE 2' in evento['text'].upper():
                key = '2'
            elif 'TIRO DE 3' in evento['text'].upper():
                key = '3'
            elif 'TIRO DE 1' in evento['text'].upper():
                key = '1'
        else:
            continue
            
        if evento['team'] == '1' and evento['idPlayer'] not in quinteto_inicial_local:
            pts_banquillo_local[key] += 1
        elif evento['team'] == '2' and evento['idPlayer'] not in quinteto_inicial_visitante:
            pts_banquillo_visitante[key] += 1
            
    final_partido['local']['ptsbanquillo'] = pts_banquillo_local
    final_partido['visitante']['ptsbanquillo'] = pts_banquillo_visitante

    # Puntos tras perdida -----------------------------------------------------
    # Robo + canasta anotada de mismo equipo
    # Pérdida (lose) del equipo rival y canasta del otro equipo
    
    # Añadir datos a archivo JSON
    match_json['POSTPARTIDO'] = final_partido

    # Save file
    with open(f'C:\\Users\\bsanchez\\Documents\\cadete2025\\JSONs fichas\\{partido}', 'w', encoding='utf-8') as f:
        json.dump(match_json, f, ensure_ascii=False, indent=4)







    
            
