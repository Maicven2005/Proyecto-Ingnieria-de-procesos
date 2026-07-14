PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS procesos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('Estratégico', 'Misional', 'Apoyo')) NOT NULL,
    nivel INTEGER NOT NULL,
    responsable TEXT NOT NULL,
    estado TEXT DEFAULT 'Activo',
    version TEXT DEFAULT '1.0',
    actualizado_en TEXT NOT NULL,
    producto TEXT,
    id_padre INTEGER,
    proveedores TEXT,
    entradas TEXT,
    salidas TEXT,
    clientes TEXT,
    FOREIGN KEY(id_padre) REFERENCES procesos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS indicadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proceso INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    justificacion TEXT NOT NULL,
    relevancia INTEGER CHECK(relevancia IN (1, 2, 3)) NOT NULL,
    FOREIGN KEY(id_proceso) REFERENCES procesos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mediciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_indicador INTEGER NOT NULL,
    mes TEXT CHECK(mes IN ('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio')) NOT NULL,
    vo REAL NOT NULL DEFAULT 0.0,
    le REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY(id_indicador) REFERENCES indicadores(id) ON DELETE CASCADE,
    UNIQUE(id_indicador, mes)
);
