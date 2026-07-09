-- database.sql

-- 1. Tabla de Procesos (Estructura Jerárquica del Nivel 0 al Nivel 3)
CREATE TABLE IF NOT EXISTS procesos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,       
    nombre TEXT NOT NULL,              
    nivel INTEGER NOT NULL,            
    producto TEXT,                     
    id_padre INTEGER,                  
    FOREIGN KEY (id_padre) REFERENCES procesos(id) ON DELETE CASCADE
);

-- 2. Tabla de Indicadores y su peso CEPLAN
CREATE TABLE IF NOT EXISTS indicadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proceso INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    justificacion TEXT,
    relevancia INTEGER CHECK(relevancia IN (1, 2, 3)), 
    FOREIGN KEY (id_proceso) REFERENCES procesos(id) ON DELETE CASCADE
);

-- 3. Tabla de Mediciones Mensuales (Data Histórica Semestral)
CREATE TABLE IF NOT EXISTS mediciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_indicador INTEGER NOT NULL,
    mes TEXT NOT NULL,                 
    vo REAL DEFAULT 0.0,               
    le REAL DEFAULT 0.0,               
    FOREIGN KEY (id_indicador) REFERENCES indicadores(id) ON DELETE CASCADE,
    UNIQUE(id_indicador, mes)
);