const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('procesos_ceplan.db');

db.serialize(() => {
  db.run("UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = ?", ['Dirección Regional de Educación','Docentes del padrón','Comité registrado','Docentes evaluados','PM.1.2.2'], function(err){ if(err) console.error(err); });
  db.run("UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = ?", ['Coordinador de evaluación','Cronograma general','Fichas de rúbricas y evidencias de campo','Docentes evaluados','PM.1.2.3'], function(err){ if(err) console.error(err); });
  db.run("UPDATE procesos SET proveedores = ?, entradas = ?, salidas = ?, clientes = ? WHERE codigo = ?", ['Comité evaluador','Fichas de evaluación','Actas de resultados y resoluciones de reclamos','Docentes evaluados','PM.1.2.4'], function(err){ if(err) console.error(err); });
});

db.close(() => console.log('SIPOC updates applied'));
