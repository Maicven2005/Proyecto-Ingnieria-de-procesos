
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
let db = null;

app.use(express.json());
app.use(cors());

// Conectar a la base de datos (sin bloquear)
function connectDB() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(path.join(__dirname, 'procesos_ceplan.db'), (err) => {
            if (err) {
                console.error('❌ Error de conexión en SQLite:', err.message);
                reject(err);
            } else {
                console.log('💾 Conexión exitosa a la base de datos [procesos_ceplan.db].');
                db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
                    if (pragmaErr) {
                        console.error('Error activando claves foraneas en SQLite:', pragmaErr.message);
                        reject(pragmaErr);
                        return;
                    }
                    resolve();
                });
            }
        });
    });
}

// Helper para ejecutar queries sincrónicas
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
};

// Inicializar base de datos y seed cuando se necesite
async function initializeDatabase() {
    await connectDB();
    
    db.serialize(() => {
        // 1. Tabla de Procesos (Jerarquía BPMN y metadatos de auditoría + Caracterización SIPOC)
        db.run(`
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
            )
        `);

        // 2. Tabla de Indicadores Estratégicos (Metodología CEPLAN)
        db.run(`
            CREATE TABLE IF NOT EXISTS indicadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_proceso INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                justificacion TEXT NOT NULL,
                relevancia INTEGER CHECK(relevancia IN (1, 2, 3)) NOT NULL,
                FOREIGN KEY(id_proceso) REFERENCES procesos(id) ON DELETE CASCADE
            )
        `);

        // 3. Tabla de Mediciones Mensuales (Enero - Junio para Ratios Tipo I y II)
        db.run(`
            CREATE TABLE IF NOT EXISTS mediciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_indicador INTEGER NOT NULL,
                mes TEXT CHECK(mes IN ('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio')) NOT NULL,
                vo REAL NOT NULL DEFAULT 0.0,
                le REAL NOT NULL DEFAULT 0.0,
                FOREIGN KEY(id_indicador) REFERENCES indicadores(id) ON DELETE CASCADE,
                UNIQUE(id_indicador, mes)
            )
        `);

        // Inserción de la Estructura Semilla si el sistema se ejecuta desde cero
        db.get("SELECT COUNT(*) as count FROM procesos", (err, row) => {
            if (!err && row && row.count === 0) {
                console.log('🌱 Sembrando datos base del Mapa de Procesos de la Ley N.º 29944...');
                const hoy = new Date().toISOString().split('T')[0];
                const respDefault = "Maicven Angel Jaimes Muñoz";

                // Procesos Estratégicos (Nivel 0)
                db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES ('PE.1', 'Gestión Estratégica Institucional', 'Estratégico', 0, '${respDefault}', '${hoy}', 'Plan Estratégico Institucional (PEI)')`);
                db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES ('PE.2', 'Gestión de Modernización y Transformación Digital', 'Estratégico', 0, '${respDefault}', '${hoy}', 'Plan de Gobierno Digital')`);
                db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES ('PE.3', 'Gestión del Gobierno Corporativo', 'Estratégico', 0, '${respDefault}', '${hoy}', 'Reglamento de Organización y Funciones (ROF)')`);

                // Procesos Soporte / Apoyo (Nivel 0)
                const soportes = [
                    ['PS.1', 'Gestión de Recursos'], ['PS.2', 'Gestión de Tecnología'], 
                    ['PS.3', 'Gestión Financiera'], ['PS.4', 'Gestión de Abastecimiento'],
                    ['PS.5', 'Gestión Archivista'], ['PS.6', 'Gestión Legal']
                ];
                soportes.forEach(s => {
                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES ('${s[0]}', '${s[1]}', 'Apoyo', 0, '${respDefault}', '${hoy}', 'Servicio Operativo Optimizado')`);
                });

                // Macroproceso Operativo (Nivel 0) y su Nivel 1 asignado al estudiante
                db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES ('PM.1', 'Trayectoria y Progresión', 'Misional', 0, '${respDefault}', '${hoy}', 'Docentes Evaluados y Promovidos')`, function() {
                    const idPadreMisional = this.lastID;
                    const respPendiente = 'Responsable por asignar';
                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.1', 'Ingreso a la carrera', 'Misional', 1, '${respPendiente}', '${hoy}', 'Docentes incorporados a la carrera pública magisterial', ${idPadreMisional})`);
                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.3', 'Ascenso a escala', 'Misional', 1, '${respPendiente}', '${hoy}', 'Docentes ascendidos de escala magisterial', ${idPadreMisional})`);
                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.4', 'Acceso a cargos', 'Misional', 1, '${respPendiente}', '${hoy}', 'Docentes designados en cargos de responsabilidad', ${idPadreMisional})`);
                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.5', 'Periodo de prueba y confirmación', 'Misional', 1, '${respPendiente}', '${hoy}', 'Docentes confirmados luego del periodo de prueba', ${idPadreMisional})`);
                    
                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2', 'Evaluación del desempeño', 'Misional', 1, '${respDefault}', '${hoy}', 'Resolución de resultado, Informe de retroalimentación, Plan de capacitación', ${idPadreMisional})`, function() {
                        const idEvaDesempeno = this.lastID;

                        // Inyección de Subprocesos de Nivel 2
                        const subprocesosN2 = [
                            ['PM.1.2.1', 'Planificación y convocatoria', 'Plan de evaluación y cronograma'],
                            ['PM.1.2.2', 'Conformación de comites de evaluación', 'Comité de evaluación instalado'],
                            ['PM.1.2.3', 'Ejecución de la Evaluación', 'Fichas de rúbricas y evidencias de campo'],
                            ['PM.1.2.4', 'Procesamiento y Publicación de Resultados', 'Actas de resultados y resoluciones de reclamos'],
                            ['PM.1.2.5', 'Gestión de Consecuencias', 'Resoluciones de continuidad / capacitación']
                        ];

                        subprocesosN2.forEach(sub => {
                            db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('${sub[0]}', '${sub[1]}', 'Misional', 2, '${respDefault}', '${hoy}', '${sub[2]}', ${idEvaDesempeno})`, function() {
                                const idSubproceso = this.lastID;

                                // Inyección dirigida de Actividades Nivel 3 e Indicadores según asignación de Maicven
                                if (sub[0] === 'PM.1.2.1') {
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.1.1', 'Emitir resolución', 'Misional', 3, '${respDefault}', '${hoy}', 'R.D. Emitida', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.1.2', 'Publicar instrumentos', 'Misional', 3, '${respDefault}', '${hoy}', 'Guías Publicadas', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.1.3', 'Validar padrón', 'Misional', 3, '${respDefault}', '${hoy}', 'Padrón Validado', ${idSubproceso})`);
                                }
                                if (sub[0] === 'PM.1.2.2') {
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.2.1', 'Designar integrantes', 'Misional', 3, '${respDefault}', '${hoy}', 'Credenciales', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.2.2', 'Registrar comité', 'Misional', 3, '${respDefault}', '${hoy}', 'Registro Informático', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.2.3', 'Capacitar comité', 'Misional', 3, '${respDefault}', '${hoy}', 'Certificaciones', ${idSubproceso})`);
                                    
                                    // Indicador Core 1
                                    db.run(`INSERT INTO indicadores (id_proceso, nombre, justificacion, relevancia) VALUES (${idSubproceso}, 'Porcentaje de comités evaluadores debidamente conformados e instalados.', 'Garantiza la legalidad institucional de la evaluación dentro de los plazos normados por la UGEL.', 2)`, function() {
                                        const idInd = this.lastID;
                                        const meses = [['Enero', 20, 20], ['Febrero', 45, 50], ['Marzo', 65, 70], ['Abril', 80, 85], ['Mayo', 95, 95], ['Junio', 100, 100]];
                                        meses.forEach(m => db.run(`INSERT INTO mediciones (id_indicador, mes, vo, le) VALUES (${idInd}, '${m[0]}', ${m[1]}, ${m[2]})`));
                                    });
                                }
                                if (sub[0] === 'PM.1.2.3') {
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.3.1', 'Programar visitas', 'Misional', 3, '${respDefault}', '${hoy}', 'Cronograma', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.3.2', 'Aplicar rúbricas', 'Misional', 3, '${respDefault}', '${hoy}', 'Fichas Llenadas', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.3.3', 'Evaluar compromiso', 'Misional', 3, '${respDefault}', '${hoy}', 'Reporte de Gestión', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.3.4', 'Consolidar evidencias', 'Misional', 3, '${respDefault}', '${hoy}', 'Expediente', ${idSubproceso})`);

                                    // Indicador Core 2
                                    db.run(`INSERT INTO indicadores (id_proceso, nombre, justificacion, relevancia) VALUES (${idSubproceso}, 'Porcentaje de rúbricas de observación de aula aplicadas correctamente.', 'Mitiga riesgos de impugnaciones por parte del magisterio al estandarizar criterios en el aula.', 1)`, function() {
                                        const idInd = this.lastID;
                                        const meses = [['Enero', 10, 15], ['Febrero', 30, 35], ['Marzo', 55, 60], ['Abril', 75, 80], ['Mayo', 88, 90], ['Junio', 98, 100]];
                                        meses.forEach(m => db.run(`INSERT INTO mediciones (id_indicador, mes, vo, le) VALUES (${idInd}, '${m[0]}', ${m[1]}, ${m[2]})`));
                                    });
                                }
                                if (sub[0] === 'PM.1.2.4') {
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.4.1', 'Ingresar puntajes', 'Misional', 3, '${respDefault}', '${hoy}', 'Base de Datos', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.4.2', 'Publicar preliminares', 'Misional', 3, '${respDefault}', '${hoy}', 'Padrón Web', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.4.3', 'Gestionar reclamos', 'Misional', 3, '${respDefault}', '${hoy}', 'Resolución Reclamo', ${idSubproceso})`);
                                    db.run(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES ('PM.1.2.4.4', 'Emitir resultados finales', 'Misional', 3, '${respDefault}', '${hoy}', 'R.D. Resultados', ${idSubproceso})`);

                                    // Indicador Core 3
                                    db.run(`INSERT INTO indicadores (id_proceso, nombre, justificacion, relevancia) VALUES (${idSubproceso}, 'Porcentaje de reclamos atendidos y resueltos en el plazo legal.', 'Garantiza el derecho administrativo del docente y evita contingencias legales contra la DRE.', 3)`, function() {
                                        const idInd = this.lastID;
                                        const meses = [['Enero', 40, 50], ['Febrero', 60, 65], ['Marzo', 75, 80], ['Abril', 85, 90], ['Mayo', 92, 95], ['Junio', 100, 100]];
                                        meses.forEach(m => db.run(`INSERT INTO mediciones (id_indicador, mes, vo, le) VALUES (${idInd}, '${m[0]}', ${m[1]}, ${m[2]})`));
                                    });
                                }
                            });
                        });

                        // Inyectar valores SIPOC para los subprocesos Nivel 2 definidos (PM.1.2.2, PM.1.2.3, PM.1.2.4)
                        db.run(`UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = 'PM.1.2.2'`, ['Dirección Regional de Educación', 'Docentes del padrón', 'Comité registrado', 'Docentes evaluados']);
                        db.run(`UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = 'PM.1.2.3'`, ['Coordinador de evaluación', 'Cronograma general', 'Fichas de rúbricas y evidencias', 'Docentes evaluados']);
                        db.run(`UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = 'PM.1.2.4'`, ['Comité evaluador', 'Fichas de evaluación', 'Actas de resultados y resoluciones de reclamos', 'Docentes evaluados']);
                    });
                });
            }
        });
    });
}


// ============================================================================
// ENDPOINTS DE LA API REST (CRUD COMPLETO)
// ============================================================================

app.get('/api/health', (req, res) => {
    db.get('SELECT COUNT(*) as procesos FROM procesos', [], (err, row) => {
        if (err) return res.status(500).json({ ok: false, error: err.message });
        res.json({
            ok: true,
            database: 'procesos_ceplan.db',
            procesos: row?.procesos || 0,
            timestamp: new Date().toISOString()
        });
    });
});

// --- CRUD PROCESOS ---
app.get('/api/procesos', (req, res) => {
    db.all("SELECT * FROM procesos ORDER BY codigo ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/procesos', (req, res) => {
    const { codigo, nombre, tipo, nivel, responsable, producto, id_padre, proveedores, entradas, salidas, clientes } = req.body;
    const actualizado_en = new Date().toISOString().split('T')[0];
    const sql = `INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre, proveedores, entradas, salidas, clientes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;
    db.run(sql, [codigo, nombre, tipo, nivel, responsable || 'Maicven Angel Jaimes Muñoz', actualizado_en, producto, id_padre, proveedores, entradas, salidas, clientes], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Procesado con éxito.' });
    });
});

app.put('/api/procesos/:id', (req, res) => {
    const { codigo, nombre, tipo, nivel, responsable, estado, version, producto, id_padre, proveedores, entradas, salidas, clientes } = req.body;
    const actualizado_en = new Date().toISOString().split('T')[0];
    const sql = `UPDATE procesos SET codigo=?, nombre=?, tipo=?, nivel=?, responsable=?, estado=?, version=?, actualizado_en=?, producto=?, id_padre=?, proveedores=?, entradas=?, salidas=?, clientes=? WHERE id=?`;
    db.run(sql, [codigo, nombre, tipo, nivel, responsable, estado, version, actualizado_en, producto, id_padre, proveedores, entradas, salidas, clientes, req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.delete('/api/procesos/:id', (req, res) => {
    db.run("DELETE FROM procesos WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// --- CRUD INDICADORES Y MEDICIONES ---
app.get('/api/indicadores', (req, res) => {
    const sql = `
        SELECT i.*, p.codigo as codigo_proceso, p.nombre as nombre_proceso 
        FROM indicadores i 
        JOIN procesos p ON i.id_proceso = p.id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/indicadores', (req, res) => {
    const { id_proceso, nombre, justificacion, relevancia, mediciones } = req.body;
    db.run(`INSERT INTO indicadores (id_proceso, nombre, justificacion, relevancia) VALUES (?,?,?,?)`, [id_proceso, nombre, justificacion, relevancia], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        const id_indicador = this.lastID;
        
        if (mediciones && Array.isArray(mediciones)) {
            const stmt = db.prepare(`INSERT OR REPLACE INTO mediciones (id_indicador, mes, vo, le) VALUES (?,?,?,?)`);
            mediciones.forEach(m => stmt.run(id_indicador, m.mes, m.vo, m.le));
            stmt.finalize();
        }
        res.status(201).json({ id: id_indicador });
    });
});

app.get('/api/mediciones/:id_indicador', (req, res) => {
    db.all(`
        SELECT * FROM mediciones
        WHERE id_indicador = ?
        ORDER BY CASE mes
            WHEN 'Enero' THEN 1
            WHEN 'Febrero' THEN 2
            WHEN 'Marzo' THEN 3
            WHEN 'Abril' THEN 4
            WHEN 'Mayo' THEN 5
            WHEN 'Junio' THEN 6
            ELSE 7
        END
    `, [req.params.id_indicador], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/mediciones/:id_indicador', (req, res) => {
    const { mediciones } = req.body;
    const idIndicador = req.params.id_indicador;
    const mesesValidos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];

    if (!Array.isArray(mediciones) || mediciones.length === 0) {
        return res.status(400).json({ error: 'Debe enviar una lista de mediciones.' });
    }

    const medicionesNormalizadas = mediciones.map(m => ({
        mes: m.mes,
        vo: Number(m.vo),
        le: Number(m.le)
    }));

    const tieneDatosInvalidos = medicionesNormalizadas.some(m =>
        !mesesValidos.includes(m.mes) ||
        Number.isNaN(m.vo) ||
        Number.isNaN(m.le) ||
        m.vo < 0 ||
        m.le < 0
    );

    if (tieneDatosInvalidos) {
        return res.status(400).json({ error: 'Las mediciones deben tener mes valido y valores VO/LE numericos mayores o iguales a cero.' });
    }

    db.get(`SELECT id FROM indicadores WHERE id = ?`, [idIndicador], (errIndicador, indicador) => {
        if (errIndicador) return res.status(500).json({ error: errIndicador.message });
        if (!indicador) return res.status(404).json({ error: 'Indicador no encontrado.' });

        db.serialize(() => {
            db.run(`DELETE FROM mediciones WHERE id_indicador = ?`, [idIndicador], (errDelete) => {
                if (errDelete) return res.status(500).json({ error: errDelete.message });

                const stmt = db.prepare(`INSERT INTO mediciones (id_indicador, mes, vo, le) VALUES (?,?,?,?)`);
                for (const m of medicionesNormalizadas) {
                    stmt.run(idIndicador, m.mes, m.vo, m.le);
                }
                stmt.finalize((errFinalize) => {
                    if (errFinalize) return res.status(500).json({ error: errFinalize.message });
                    res.json({ updated: true, id_indicador: Number(idIndicador) });
                });
            });
        });
    });
});

// ============================================================================
// MOTOR MATEMÁTICO AVANZADO - CRITERIO CEPLAN (/api/analitica/ceplan)
// Ejecuta el cálculo dinámico en caliente del modelo de inversión de escala
// ============================================================================
app.get('/api/analitica/ceplan', (req, res) => {
    const query = `
        SELECT i.id, i.nombre, i.relevancia, p.codigo as codigo_proceso,
               m_ene.vo as lb, m_jun.vo as vo_jun, m_jun.le as le_jun
        FROM indicadores i
        JOIN procesos p ON i.id_proceso = p.id
        LEFT JOIN mediciones m_ene ON i.id = m_ene.id_indicador AND m_ene.mes = 'Enero'
        LEFT JOIN mediciones m_jun ON i.id = m_jun.id_indicador AND m_jun.mes = 'Junio'
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.json({ indicadores: [], totales_consolidados: { avance_tipo1_total: 0, avance_tipo2_total: 0 } });

        const R_max = 3;
        const R_min = 1;

        // Fase 1: Extracción del valor inverso según Directiva CEPLAN
        let sumaValoresInversos = 0;
        const calculosIntermedios = rows.map(row => {
            const valorInverso = R_max + R_min - row.relevancia;
            sumaValoresInversos += valorInverso;

            // Formulación de Ratios Individuales de Sentido Ascendente
            const av_tipo1 = row.le_jun > 0 ? (row.vo_jun / row.le_jun) * 100 : 0;
            const denominadorT2 = row.le_jun - row.lb;
            const av_tipo2 = denominadorT2 > 0 ? ((row.vo_jun - row.lb) / denominadorT2) * 100 : 0;

            return { ...row, valorInverso, av_tipo1, av_tipo2 };
        });

        // Fase 2: Ponderación y Sumatorias Vectoriales
        let totalAvanceT1Ponderado = 0;
        let totalAvanceT2Ponderado = 0;

        const indicadoresFinales = calculosIntermedios.map(ind => {
            const ponderacion = sumaValoresInversos > 0 ? (ind.valorInverso / sumaValoresInversos) : 0;
            
            totalAvanceT1Ponderado += (ind.av_tipo1 * ponderacion);
            totalAvanceT2Ponderado += (ind.av_tipo2 * ponderacion);

            return {
                id: ind.id,
                codigo: ind.codigo_proceso,
                nombre: ind.nombre,
                relevancia: ind.relevancia,
                valorInverso: ind.valorInverso,
                ponderacion: parseFloat(ponderacion.toFixed(4)),
                lb: ind.lb || 0,
                vo_jun: ind.vo_jun || 0,
                le_jun: ind.le_jun || 0,
                avanceTipo1: parseFloat(ind.av_tipo1.toFixed(2)),
                avanceTipo2: parseFloat(ind.av_tipo2.toFixed(2))
            };
        });

        res.json({
            indicadores: indicadoresFinales,
            totales_consolidados: {
                avance_tipo1_total: parseFloat(totalAvanceT1Ponderado.toFixed(2)),
                avance_tipo2_total: parseFloat(totalAvanceT2Ponderado.toFixed(2))
            }
        });
    });
});

// ============================================================================
// ENDPOINT DE REGENERACIÓN DE SEMILLA (Para desarrollo / reset de datos)
// ============================================================================
app.post('/api/seed/reset', async (req, res) => {
    try {
        console.log('🔄 Iniciando reset y regeneración de semilla...');
        
        // Limpiar tablas
        await dbRun("DELETE FROM mediciones");
        await dbRun("DELETE FROM indicadores");
        await dbRun("DELETE FROM procesos");
        
        const hoy = new Date().toISOString().split('T')[0];
        const respDefault = "Maicven Angel Jaimes Muñoz";

        // Insertar Procesos Estratégicos
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES (?,?,?,?,?,?,?)`, 
            ['PE.1', 'Gestión Estratégica Institucional', 'Estratégico', 0, respDefault, hoy, 'Plan Estratégico Institucional (PEI)']);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES (?,?,?,?,?,?,?)`, 
            ['PE.2', 'Gestión de Modernización y Transformación Digital', 'Estratégico', 0, respDefault, hoy, 'Plan de Gobierno Digital']);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES (?,?,?,?,?,?,?)`, 
            ['PE.3', 'Gestión del Gobierno Corporativo', 'Estratégico', 0, respDefault, hoy, 'Reglamento de Organización y Funciones (ROF)']);

        // Insertar Procesos de Apoyo
        const soportes = [
            ['PS.1', 'Gestión de Recursos'], ['PS.2', 'Gestión de Tecnología'], 
            ['PS.3', 'Gestión Financiera'], ['PS.4', 'Gestión de Abastecimiento'],
            ['PS.5', 'Gestión Archivista'], ['PS.6', 'Gestión Legal']
        ];
        for (const [codigo, nombre] of soportes) {
            await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES (?,?,?,?,?,?,?)`, 
                [codigo, nombre, 'Apoyo', 0, respDefault, hoy, 'Servicio Operativo Optimizado']);
        }

        // Insertar Macroproceso Misional
        const idPM1 = await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto) VALUES (?,?,?,?,?,?,?)`, 
            ['PM.1', 'Trayectoria y Progresión', 'Misional', 0, respDefault, hoy, 'Docentes Evaluados y Promovidos']);
        
        const responsablesSublineas = {
            'PM.1.1': 'Responsable por asignar',
            'PM.1.2': respDefault,
            'PM.1.3': 'Responsable por asignar',
            'PM.1.4': 'Responsable por asignar',
            'PM.1.5': 'Responsable por asignar'
        };

        const sublineasNivel1 = [
            ['PM.1.1', 'Ingreso a la carrera', 'Docentes incorporados a la carrera pública magisterial'],
            ['PM.1.2', 'Evaluación del desempeño', 'Resolución de resultado, Informe de retroalimentación, Plan de capacitación'],
            ['PM.1.3', 'Ascenso a escala', 'Docentes ascendidos de escala magisterial'],
            ['PM.1.4', 'Acceso a cargos', 'Docentes designados en cargos de responsabilidad'],
            ['PM.1.5', 'Periodo de prueba y confirmación', 'Docentes confirmados luego del periodo de prueba']
        ];

        const sublineasIds = {};
        for (const [codigo, nombre, producto] of sublineasNivel1) {
            const id = await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`,
                [codigo, nombre, 'Misional', 1, responsablesSublineas[codigo], hoy, producto, idPM1]);
            sublineasIds[codigo] = id;
        }

        const idPM12 = sublineasIds['PM.1.2'];

        // Insertar Subprocesos Nivel 2
        const subprocesos = [
            ['PM.1.2.1', 'Planificación y convocatoria', 'Plan de evaluación y cronograma'],
            ['PM.1.2.2', 'Conformación de comites de evaluación', 'Comité de evaluación instalado'],
            ['PM.1.2.3', 'Ejecución de la Evaluación', 'Fichas de rúbricas y evidencias de campo'],
            ['PM.1.2.4', 'Procesamiento y Publicación de Resultados', 'Actas de resultados y resoluciones de reclamos'],
            ['PM.1.2.5', 'Gestión de Consecuencias', 'Resoluciones de continuidad / capacitación']
        ];
        
        const subprocesosIds = {};
        for (const [codigo, nombre, producto] of subprocesos) {
            const id = await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
                [codigo, nombre, 'Misional', 2, respDefault, hoy, producto, idPM12]);
            subprocesosIds[codigo] = id;
        }

        // Rellenar columnas SIPOC para los subprocesos core Nivel 2
        await dbRun(`UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = ?`, ['Dirección Regional de Educación', 'Docentes del padrón', 'Comité registrado', 'Docentes evaluados', 'PM.1.2.2']);
        await dbRun(`UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = ?`, ['Coordinador de evaluación', 'Cronograma general', 'Fichas de rúbricas y evidencias de campo', 'Docentes evaluados', 'PM.1.2.3']);
        await dbRun(`UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = ?`, ['Comité evaluador', 'Fichas de evaluación', 'Actas de resultados y resoluciones de reclamos', 'Docentes evaluados', 'PM.1.2.4']);

        // Insertar Actividades Nivel 3 e Indicadores
        // PM.1.2.1
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.1.1', 'Emitir resolución', 'Misional', 3, respDefault, hoy, 'R.D. Emitida', subprocesosIds['PM.1.2.1']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.1.2', 'Publicar instrumentos', 'Misional', 3, respDefault, hoy, 'Guías Publicadas', subprocesosIds['PM.1.2.1']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.1.3', 'Validar padrón', 'Misional', 3, respDefault, hoy, 'Padrón Validado', subprocesosIds['PM.1.2.1']]);

        // PM.1.2.2 + Indicador
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.2.1', 'Designar integrantes', 'Misional', 3, respDefault, hoy, 'Credenciales', subprocesosIds['PM.1.2.2']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.2.2', 'Registrar comité', 'Misional', 3, respDefault, hoy, 'Registro Informático', subprocesosIds['PM.1.2.2']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.2.3', 'Capacitar comité', 'Misional', 3, respDefault, hoy, 'Certificaciones', subprocesosIds['PM.1.2.2']]);
        
        const idInd1 = await dbRun(`INSERT INTO indicadores (id_proceso, nombre, justificacion, relevancia) VALUES (?,?,?,?)`, 
            [subprocesosIds['PM.1.2.2'], 'Porcentaje de comités evaluadores debidamente conformados e instalados.', 'Garantiza la legalidad institucional de la evaluación dentro de los plazos normados por la UGEL.', 2]);
        const meses1 = [['Enero', 20, 20], ['Febrero', 45, 50], ['Marzo', 65, 70], ['Abril', 80, 85], ['Mayo', 95, 95], ['Junio', 100, 100]];
        for (const [mes, vo, le] of meses1) {
            await dbRun(`INSERT INTO mediciones (id_indicador, mes, vo, le) VALUES (?,?,?,?)`, [idInd1, mes, vo, le]);
        }

        // PM.1.2.3 + Indicador
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.3.1', 'Programar visitas', 'Misional', 3, respDefault, hoy, 'Cronograma', subprocesosIds['PM.1.2.3']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.3.2', 'Aplicar rúbricas', 'Misional', 3, respDefault, hoy, 'Fichas Llenadas', subprocesosIds['PM.1.2.3']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.3.3', 'Evaluar compromiso', 'Misional', 3, respDefault, hoy, 'Reporte de Gestión', subprocesosIds['PM.1.2.3']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.3.4', 'Consolidar evidencias', 'Misional', 3, respDefault, hoy, 'Expediente', subprocesosIds['PM.1.2.3']]);
        
        const idInd2 = await dbRun(`INSERT INTO indicadores (id_proceso, nombre, justificacion, relevancia) VALUES (?,?,?,?)`, 
            [subprocesosIds['PM.1.2.3'], 'Porcentaje de rúbricas de observación de aula aplicadas correctamente.', 'Mitiga riesgos de impugnaciones por parte del magisterio al estandarizar criterios en el aula.', 1]);
        const meses2 = [['Enero', 10, 15], ['Febrero', 30, 35], ['Marzo', 55, 60], ['Abril', 75, 80], ['Mayo', 88, 90], ['Junio', 98, 100]];
        for (const [mes, vo, le] of meses2) {
            await dbRun(`INSERT INTO mediciones (id_indicador, mes, vo, le) VALUES (?,?,?,?)`, [idInd2, mes, vo, le]);
        }

        // PM.1.2.4 + Indicador
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.4.1', 'Ingresar puntajes', 'Misional', 3, respDefault, hoy, 'Base de Datos', subprocesosIds['PM.1.2.4']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.4.2', 'Publicar preliminares', 'Misional', 3, respDefault, hoy, 'Padrón Web', subprocesosIds['PM.1.2.4']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.4.3', 'Gestionar reclamos', 'Misional', 3, respDefault, hoy, 'Resolución Reclamo', subprocesosIds['PM.1.2.4']]);
        await dbRun(`INSERT INTO procesos (codigo, nombre, tipo, nivel, responsable, actualizado_en, producto, id_padre) VALUES (?,?,?,?,?,?,?,?)`, 
            ['PM.1.2.4.4', 'Emitir resultados finales', 'Misional', 3, respDefault, hoy, 'R.D. Resultados', subprocesosIds['PM.1.2.4']]);
        
        const idInd3 = await dbRun(`INSERT INTO indicadores (id_proceso, nombre, justificacion, relevancia) VALUES (?,?,?,?)`, 
            [subprocesosIds['PM.1.2.4'], 'Porcentaje de reclamos atendidos y resueltos en el plazo legal.', 'Garantiza el derecho administrativo del docente y evita contingencias legales contra la DRE.', 3]);
        const meses3 = [['Enero', 40, 50], ['Febrero', 60, 65], ['Marzo', 75, 80], ['Abril', 85, 90], ['Mayo', 92, 95], ['Junio', 100, 100]];
        for (const [mes, vo, le] of meses3) {
            await dbRun(`INSERT INTO mediciones (id_indicador, mes, vo, le) VALUES (?,?,?,?)`, [idInd3, mes, vo, le]);
        }

        console.log('✅ Semilla regenerada exitosamente');
        res.json({ success: true, message: '✅ Semilla regenerada. Recarga la página para ver los cambios.' });
    } catch (error) {
        console.error('❌ Error en seed/reset:', error);
        res.status(500).json({ error: error.message });
    }
});

// Inicialización de la Escucha de Red Local
const PORT = 5000;
app.listen(PORT, async () => {
    console.log(`🚀 API de Ingeniería de Procesos UNHEVAL arriba en http://localhost:${PORT}`);
    try {
        await initializeDatabase();
    } catch (err) {
        console.error(' Error inicializando base de datos:', err);
    }
});
