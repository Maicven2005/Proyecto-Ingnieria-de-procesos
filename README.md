# Proyecto Ingeniería de Procesos

Sistema académico para el análisis del macroproceso **PM.1 Trayectoria y Progresión** de la Ley N.º 29944 - Reforma Magisterial, siguiendo criterios de gestión por procesos y CEPLAN.

## Estructura

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

## Abrir el frontend

Abra el archivo:

```text
frontend/index.html
```

El frontend se conecta al backend local en `http://localhost:5000/api/...`.
