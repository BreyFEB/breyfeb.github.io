
const SUPABASE_URL = 'https://ovadhyvmvinklxjvnbgi.supabase.co'; // URL de tu proyecto
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YWRoeXZtdmlua2x4anZuYmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTA0NTcsImV4cCI6MjA2ODY2NjQ1N30.bU0MqDZcf-MbSsC4vfMVuUk_5r2vHozBTf-V5LIZT1s'; // Tu clave pública anónima

// Importar Supabase desde CDN
const { createClient } = supabase;

// Crear cliente de Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== FUNCIONES DE AUTENTICACIÓN =====

/**
 * Registrar nuevo usuario
 */
async function signUpUser(email, password) {
    try {
        console.log('🔄 Registrando usuario con Supabase...', email);
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            console.error('❌ Error en registro:', error);
            throw error;
        }

        console.log('✅ Usuario registrado exitosamente:', data.user?.email);
        return { user: data.user, session: data.session };
    } catch (error) {
        console.error('❌ Error registrando usuario:', error);
        throw error;
    }
}

/**
 * Iniciar sesión
 */
async function signInUser(email, password) {
    try {
        console.log('🔄 Iniciando sesión con Supabase...', email);
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error('❌ Error en login:', error);
            throw error;
        }

        console.log('✅ Sesión iniciada exitosamente:', data.user?.email);
        return { user: data.user, session: data.session };
    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
}

/**
 * Cerrar sesión
 */
async function signOutUser() {
    try {
        console.log('🔄 Cerrando sesión...');
        
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('❌ Error cerrando sesión:', error);
            throw error;
        }

        console.log('✅ Sesión cerrada exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error cerrando sesión:', error);
        throw error;
    }
}

/**
 * Obtener usuario actual
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
            console.error('❌ Error obteniendo usuario:', error);
            return null;
        }

        return user;
    } catch (error) {
        console.error('❌ Error obteniendo usuario:', error);
        return null;
    }
}

/**
 * Obtener sesión actual
 */
async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('❌ Error obteniendo sesión:', error);
            return null;
        }

        return session;
    } catch (error) {
        console.error('❌ Error obteniendo sesión:', error);
        return null;
    }
}

// ===== FUNCIONES DE BASE DE DATOS =====

/**
 * Guardar/actualizar perfil de usuario
 */
async function saveUserProfile(userId, profileData) {
    try {
        console.log('💾 Guardando perfil en Supabase...', userId);
        
        // Intentar actualizar primero, luego insertar si no existe
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .upsert({
                user_id: userId,
                ...profileData,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select();

        if (error) {
            console.error('❌ Error guardando perfil:', error);
            throw error;
        }

        console.log('✅ Perfil guardado exitosamente:', data);
        return data[0];
    } catch (error) {
        console.error('❌ Error guardando perfil:', error);
        throw error;
    }
}

/**
 * Obtener perfil de usuario
 */
async function getUserProfile(userId) {
    try {
        console.log('📥 Obteniendo perfil de Supabase...', userId);
        
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('❌ Error obteniendo perfil:', error);
            throw error;
        }

        if (data) {
            console.log('✅ Perfil encontrado:', data);
            return data;
        } else {
            console.log('📝 No se encontró perfil, será creado al guardar');
            return null;
        }
    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        throw error;
    }
}

/**
 * Escuchar cambios en el estado de autenticación
 */
function onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔔 Cambio de estado de auth:', event, session?.user?.email);
        callback(event, session);
    });
}

// ===== UTILIDADES =====

/**
 * Verificar si el usuario está autenticado
 */
async function isUserAuthenticated() {
    const session = await getCurrentSession();
    return session !== null;
}

/**
 * Obtener información completa del usuario (auth + perfil)
 */
async function getFullUserInfo() {
    try {
        const user = await getCurrentUser();
        if (!user) return null;

        const profile = await getUserProfile(user.id);
        
        return {
            user: user,
            profile: profile
        };
    } catch (error) {
        console.error('❌ Error obteniendo info completa del usuario:', error);
        return null;
    }
}

// ===== FUNCIONES DE EQUIPOS FAVORITOS =====

/**
 * Obtener equipos favoritos del usuario
 */
async function getUserFavoriteTeams(userId) {
    try {
        console.log('📥 Obteniendo equipos favoritos de Supabase...', userId);
        
        const { data, error } = await supabaseClient
            .from('favorite_teams')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error obteniendo equipos favoritos:', error);
            throw error;
        }

        console.log(`✅ ${data.length} equipos favoritos encontrados`);
        return data;
    } catch (error) {
        console.error('❌ Error obteniendo equipos favoritos:', error);
        throw error;
    }
}

/**
 * Agregar equipo a favoritos
 */
async function addFavoriteTeam(userId, teamData) {
    try {
        console.log('⭐ Agregando equipo a favoritos...', teamData.name);
        console.log('📊 Datos del equipo:', teamData);
        console.log('👤 ID de usuario:', userId);
        
        const insertData = {
            user_id: userId,
            team_id: teamData.id,
            team_name: teamData.name,
            team_logo: teamData.logo,
            competitions: teamData.competitions,
            created_at: new Date().toISOString()
        };
        
        console.log('📤 Datos a insertar:', insertData);
        
        const { data, error } = await supabaseClient
            .from('favorite_teams')
            .insert(insertData)
            .select();

        if (error) {
            console.error('❌ Error de Supabase:', error);
            console.error('🔍 Código del error:', error.code);
            console.error('💬 Mensaje del error:', error.message);
            console.error('📋 Detalles del error:', error.details);
            throw error;
        }

        console.log('✅ Equipo agregado a favoritos:', data[0]);
        return data[0];
    } catch (error) {
        console.error('❌ Error agregando equipo favorito:', error);
        throw error;
    }
}

/**
 * Quitar equipo de favoritos
 */
async function removeFavoriteTeam(userId, teamId) {
    try {
        console.log('💔 Quitando equipo de favoritos...', teamId);
        
        const { data, error } = await supabaseClient
            .from('favorite_teams')
            .delete()
            .eq('user_id', userId)
            .eq('team_id', teamId)
            .select();

        if (error) {
            console.error('❌ Error quitando equipo favorito:', error);
            throw error;
        }

        console.log('✅ Equipo quitado de favoritos:', data);
        return data;
    } catch (error) {
        console.error('❌ Error quitando equipo favorito:', error);
        throw error;
    }
}

/**
 * Verificar si un equipo es favorito del usuario
 */
async function isTeamFavorite(userId, teamId) {
    try {
        const { data, error } = await supabaseClient
            .from('favorite_teams')
            .select('team_id')
            .eq('user_id', userId)
            .eq('team_id', teamId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data !== null;
    } catch (error) {
        console.error('❌ Error verificando equipo favorito:', error);
        return false;
    }
}

/**
 * Función de diagnóstico para verificar la tabla favorite_teams
 */
async function diagnoseFavoriteTeamsTable() {
    try {
        console.log('🔍 Verificando tabla favorite_teams...');
        
        // Intentar hacer una consulta simple para ver si la tabla existe
        const { data, error } = await supabaseClient
            .from('favorite_teams')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Error accediendo a la tabla favorite_teams:', error);
            console.error('🔍 Posibles causas:');
            console.error('   - La tabla no existe');
            console.error('   - Permisos RLS (Row Level Security) mal configurados');
            console.error('   - Problema de conexión con Supabase');
            return false;
        }

        console.log('✅ Tabla favorite_teams accesible');
        console.log('📊 Datos de prueba:', data);
        return true;
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        return false;
    }
}

/**
 * Función para probar la estructura de la tabla
 */
async function testFavoriteTeamsStructure() {
    try {
        console.log('🧪 Probando estructura de favorite_teams...');
        
        // Obtener información del usuario actual
        const user = await getCurrentUser();
        if (!user) {
            console.log('❌ No hay usuario autenticado');
            return false;
        }

        // Intentar insertar un registro de prueba
        const testData = {
            user_id: user.id,
            team_id: 'TEST_ID',
            team_name: 'EQUIPO DE PRUEBA',
            team_logo: 'https://example.com/logo.png',
            competitions: ['TEST_COMPETITION'],
            created_at: new Date().toISOString()
        };

        console.log('📤 Insertando datos de prueba:', testData);

        const { data, error } = await supabaseClient
            .from('favorite_teams')
            .insert(testData)
            .select();

        if (error) {
            console.error('❌ Error insertando datos de prueba:', error);
            return false;
        }

        console.log('✅ Inserción de prueba exitosa:', data);

        // Limpiar datos de prueba
        await supabaseClient
            .from('favorite_teams')
            .delete()
            .eq('team_id', 'TEST_ID');

        console.log('🧹 Datos de prueba eliminados');
        return true;
    } catch (error) {
        console.error('❌ Error en prueba de estructura:', error);
        return false;
    }
}

// ===== FUNCIONES DE JUGADORES FAVORITOS =====

/**
 * Obtener jugadores favoritos del usuario
 */
async function getUserFavoritePlayers(userId) {
    try {
        console.log('📥 Obteniendo jugadores favoritos de Supabase...', userId);
        
        const { data, error } = await supabaseClient
            .from('favorite_players')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error obteniendo jugadores favoritos:', error);
            throw error;
        }

        console.log(`✅ ${data.length} jugadores favoritos encontrados`);
        return data;
    } catch (error) {
        console.error('❌ Error obteniendo jugadores favoritos:', error);
        throw error;
    }
}

/**
 * Agregar jugador a favoritos
 */
async function addFavoritePlayer(userId, playerData) {
    try {
        console.log('⭐ Agregando jugador a favoritos...', playerData.nombre);
        console.log('📊 Datos del jugador:', playerData);
        console.log('👤 ID de usuario:', userId);
        
        const insertData = {
            user_id: userId,
            player_id: playerData.id,
            player_name: playerData.nombre,
            player_photo: playerData.foto,
            team_name: playerData.equipo,
            team_logo: playerData.team_logo,
            competition: playerData.competicion,
            gender: playerData.genero,
            stats: playerData.estadisticas,
            created_at: new Date().toISOString()
        };
        
        console.log('📤 Datos a insertar:', insertData);
        
        const { data, error } = await supabaseClient
            .from('favorite_players')
            .insert(insertData)
            .select();

        if (error) {
            console.error('❌ Error de Supabase:', error);
            console.error('🔍 Código del error:', error.code);
            console.error('💬 Mensaje del error:', error.message);
            console.error('📋 Detalles del error:', error.details);
            throw error;
        }

        console.log('✅ Jugador agregado a favoritos:', data[0]);
        return data[0];
    } catch (error) {
        console.error('❌ Error agregando jugador favorito:', error);
        throw error;
    }
}

/**
 * Quitar jugador de favoritos
 */
async function removeFavoritePlayer(userId, playerId) {
    try {
        console.log('💔 Quitando jugador de favoritos...', playerId);
        
        const { data, error } = await supabaseClient
            .from('favorite_players')
            .delete()
            .eq('user_id', userId)
            .eq('player_id', playerId)
            .select();

        if (error) {
            console.error('❌ Error quitando jugador favorito:', error);
            throw error;
        }

        console.log('✅ Jugador quitado de favoritos:', data);
        return data;
    } catch (error) {
        console.error('❌ Error quitando jugador favorito:', error);
        throw error;
    }
}

/**
 * Verificar si un jugador es favorito del usuario
 */
async function isPlayerFavorite(userId, playerId) {
    try {
        const { data, error } = await supabaseClient
            .from('favorite_players')
            .select('player_id')
            .eq('user_id', userId)
            .eq('player_id', playerId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data !== null;
    } catch (error) {
        console.error('❌ Error verificando jugador favorito:', error);
        return false;
    }
}

// Exportar funciones para uso global
window.supabaseAuth = {
    client: supabaseClient,
    signUp: signUpUser,
    signIn: signInUser,
    signOut: signOutUser,
    getCurrentUser,
    getCurrentSession,
    isAuthenticated: isUserAuthenticated,
    onAuthStateChange,
    saveProfile: saveUserProfile,
    getProfile: getUserProfile,
    getFullUserInfo,
    // Funciones de equipos favoritos
    getFavoriteTeams: getUserFavoriteTeams,
    addFavoriteTeam: addFavoriteTeam,
    removeFavoriteTeam: removeFavoriteTeam,
    isTeamFavorite: isTeamFavorite,
    // Funciones de jugadores favoritos
    getFavoritePlayers: getUserFavoritePlayers,
    addFavoritePlayer: addFavoritePlayer,
    removeFavoritePlayer: removeFavoritePlayer,
    isPlayerFavorite: isPlayerFavorite,
    // Funciones de diagnóstico
    diagnoseFavoriteTeamsTable: diagnoseFavoriteTeamsTable,
    testFavoriteTeamsStructure: testFavoriteTeamsStructure
}; 