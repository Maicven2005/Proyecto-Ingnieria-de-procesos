# Proyecto Ingeniería de Procesos

Sistema académico para el análisis del macroproceso **PM.1 Trayectoria y Progresión** de la Ley N.º 29944 - Reforma Magisterial, siguiendo criterios de gestión por procesos y CEPLAN.

## Alcance del Proyecto

El grupo trabaja el macroproceso:

```text
PM.1 Trayectoria y Progresión
```

Sublíneas del equipo:

```text
PM.1.1 Ingreso a la carrera
PM.1.2 Evaluación del desempeño
PM.1.3 Ascenso a escala
PM.1.4 Acceso a cargos
PM.1.5 Periodo de prueba y confirmación
```

La sublínea desarrollada con mayor detalle en el software es:

```text
PM.1.2 Evaluación del desempeño
```

## Estructura del Proyecto

```text
.
├── backend/
│   ├── server.js
│   ├── procesos_ceplan.db
│   ├── database.sql
│   └── scripts/
├── frontend/
│   └── index.html
├── package.json
├── package-lock.json
└── README.md
```

## Ejecutar el backend

```bash
npm install
npm start
```

La API queda disponible en:

```text
http://localhost:5000
```

Para comprobar que el backend está activo:

```text
http://localhost:5000/api/health
```

## Abrir el frontend

Abra el archivo:

```text
frontend/index.html
```

El frontend se conecta al backend local en `http://localhost:5000/api/...`.

## Comandos útiles

```bash
npm start
npm run check
npm run check:frontend
npm test
```

## Endpoints principales

```text
GET    /api/health
GET    /api/procesos
POST   /api/procesos
PUT    /api/procesos/:id
DELETE /api/procesos/:id

GET    /api/indicadores
POST   /api/indicadores

GET    /api/mediciones/:id_indicador
PUT    /api/mediciones/:id_indicador

GET    /api/analitica/ceplan
POST   /api/seed/reset
```

## Notas

- No subir `node_modules/`; se reconstruye con `npm install`.
- La base de datos actual está en `backend/procesos_ceplan.db`.
- El esquema SQL de referencia está en `backend/database.sql`.
