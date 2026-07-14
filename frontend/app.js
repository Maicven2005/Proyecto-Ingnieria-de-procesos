const { createApp, ref, onMounted, watch } = Vue;

let lineChartInstance = null;
let barChartInstance = null;
const API_BASE_URL = 'http://localhost:5000';

createApp({
    setup() {
        const currentTab = ref('mapa');
        const listaProcesos = ref([]);
        const listaIndicadores = ref([]);
        const analiticaCeplan = ref(null);
        const subprocesoActivo = ref(null);
        const subprocesoDashboardId = ref(null);
        const indicadorEditandoId = ref(null);
        const medicionesEditables = ref([]);
        const mesesSemestre = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];

        // Estructuras de formularios en blanco (Modelos reactivos)
        const formProceso = ref({ id: null, codigo: '', nombre: '', tipo: 'Misional', nivel: 2, responsable: '', producto: '', id_padre: null });
        const formIndicador = ref({
            id_proceso: '', nombre: '', justificacion: '', relevancia: 1,
            mediciones: [
                { mes: 'Enero', vo: 0, le: 0 }, { mes: 'Febrero', vo: 0, le: 0 },
                { mes: 'Marzo', vo: 0, le: 0 }, { mes: 'Abril', vo: 0, le: 0 },
                { mes: 'Mayo', vo: 0, le: 0 }, { mes: 'Junio', vo: 0, le: 0 }
            ]
        });

        // Referencias para SIPOC
        const procesoSIPOCSeleccionado = ref('');
        const dataSIPOCActual = ref(null);

        const syncDashboardSelection = () => {
            const opciones = listaProcesos.value.filter(p => p.tipo === 'Misional' && p.nivel === 2);
            if (!opciones.length) {
                subprocesoDashboardId.value = null;
                return;
            }
            if (!opciones.some(p => p.id === subprocesoDashboardId.value)) {
                subprocesoDashboardId.value = opciones[0].id;
            }
        };

        const subprocesoDashboard = () => {
            return listaProcesos.value.find(p => p.id === subprocesoDashboardId.value) || null;
        };

        const indicadorDashboard = () => {
            return listaIndicadores.value.find(ind => ind.id_proceso === subprocesoDashboardId.value) || null;
        };

        const semaforoEstado = (valor) => {
            const avance = Number(valor || 0);
            if (avance >= 95) return 'verde';
            if (avance >= 75) return 'amarillo';
            return 'rojo';
        };

        const semaforoLabel = (valor) => {
            const estado = semaforoEstado(valor);
            if (estado === 'verde') return 'Adecuado';
            if (estado === 'amarillo') return 'Por mejorar';
            return 'Crítico';
        };

        const semaforoIcon = (valor) => {
            const estado = semaforoEstado(valor);
            if (estado === 'verde') return 'fa-solid fa-circle-check';
            if (estado === 'amarillo') return 'fa-solid fa-triangle-exclamation';
            return 'fa-solid fa-circle-xmark';
        };

        const semaforoCellClass = (valor, destacado = false) => {
            const base = destacado
                ? 'rounded-lg px-4 py-3 border font-black '
                : 'rounded-lg px-3 py-2 border font-bold ';
            const estado = semaforoEstado(valor);

            if (estado === 'verde') {
                return base + 'bg-emerald-500/12 border-emerald-500/40 text-emerald-300';
            }
            if (estado === 'amarillo') {
                return base + 'bg-amber-500/12 border-amber-500/45 text-amber-300';
            }
            return base + 'bg-red-500/12 border-red-500/45 text-red-300';
        };

        const ordenarPorCodigo = (items = []) => {
            return [...items].sort((a, b) => {
                const partesA = String(a.codigo || '').match(/\d+|[A-Za-z]+/g) || [];
                const partesB = String(b.codigo || '').match(/\d+|[A-Za-z]+/g) || [];
                const max = Math.max(partesA.length, partesB.length);

                for (let i = 0; i < max; i++) {
                    const aParte = partesA[i] || '';
                    const bParte = partesB[i] || '';
                    const aNumero = Number(aParte);
                    const bNumero = Number(bParte);
                    const ambosNumeros = !Number.isNaN(aNumero) && !Number.isNaN(bNumero);

                    if (ambosNumeros && aNumero !== bNumero) return aNumero - bNumero;
                    if (!ambosNumeros && aParte !== bParte) return aParte.localeCompare(bParte);
                }

                return 0;
            });
        };

        const renderDashboardCharts = () => {
            if (currentTab.value !== 'graficos' || typeof window === 'undefined' || typeof Chart === 'undefined') {
                return;
            }

            const lineCanvas = document.getElementById('lineChartDashboard');
            const barCanvas = document.getElementById('barChartDashboard');
            if (!lineCanvas || !barCanvas) {
                return;
            }

            if (lineChartInstance) lineChartInstance.destroy();
            if (barChartInstance) barChartInstance.destroy();

            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];
            const indicadorSeleccionado = listaIndicadores.value.find(ind => ind.id_proceso === subprocesoDashboardId.value) || null;
            const historial = indicadorSeleccionado?.historial || [];

            const voData = meses.map(mes => {
                const item = historial.find(h => h.mes === mes);
                return item ? Number(item.vo || 0) : 0;
            });
            const leData = meses.map(mes => {
                const item = historial.find(h => h.mes === mes);
                return item ? Number(item.le || 0) : 0;
            });

            lineChartInstance = new Chart(lineCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: meses,
                    datasets: [
                        {
                            label: 'Valor Obtenido (VO)',
                            data: voData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.18)',
                            tension: 0.35,
                            fill: true,
                            pointRadius: 4,
                            pointBackgroundColor: '#10b981'
                        },
                        {
                            label: 'Logro Esperado (LE)',
                            data: leData,
                            borderColor: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.16)',
                            tension: 0.35,
                            fill: false,
                            pointRadius: 4,
                            pointBackgroundColor: '#38bdf8'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    scales: {
                        x: { ticks: { color: '#9ca3af' } },
                        y: { ticks: { color: '#9ca3af' }, beginAtZero: true, max: 110 }
                    }
                }
            });

            const indicadoresCore = (analiticaCeplan.value?.indicadores || [])
                .filter(ind => ['PM.1.2.2', 'PM.1.2.3', 'PM.1.2.4'].includes(ind.codigo));

            barChartInstance = new Chart(barCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: indicadoresCore.map(ind => ind.codigo),
                    datasets: [
                        {
                            label: 'Avance Tipo I',
                            data: indicadoresCore.map(ind => Number(ind.avanceTipo1 || 0)),
                            backgroundColor: '#10b981',
                            borderRadius: 6
                        },
                        {
                            label: 'Avance Tipo II',
                            data: indicadoresCore.map(ind => Number(ind.avanceTipo2 || 0)),
                            backgroundColor: '#38bdf8',
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    scales: {
                        x: { ticks: { color: '#9ca3af' } },
                        y: { ticks: { color: '#9ca3af' }, beginAtZero: true, max: 110 }
                    }
                }
            });
        };

        // --- LLAMADOS ASÍNCRONOS A LA API BACKEND ---
        const cargarTodo = async () => {
            try {
                // Cargar procesos
                const resP = await fetch(`${API_BASE_URL}/api/procesos`);
                if (!resP.ok) throw new Error(`Error HTTP: ${resP.status}`);
                const procesos = await resP.json();
                listaProcesos.value = ordenarPorCodigo(procesos || []);
                console.log(`✅ Procesos cargados: ${listaProcesos.value.length} elementos`);

                // Cargar indicadores
                const resI = await fetch(`${API_BASE_URL}/api/indicadores`);
                if (!resI.ok) throw new Error(`Error HTTP: ${resI.status}`);
                const inds = await resI.json();
                
                // Cargar el mapeo mensual para cada indicador en la UI
                for(let ind of inds) {
                    const resM = await fetch(`${API_BASE_URL}/api/mediciones/${ind.id}`);
                    if (resM.ok) {
                        ind.historial = await resM.json();
                    }
                }
                listaIndicadores.value = inds || [];
                console.log(`✅ Indicadores cargados: ${listaIndicadores.value.length} elementos`);

                // Cargar analítica CEPLAN
                const resA = await fetch(`${API_BASE_URL}/api/analitica/ceplan`);
                if (resA.ok) {
                    analiticaCeplan.value = await resA.json();
                    console.log(`✅ Analítica CEPLAN cargada`);
                }

                syncDashboardSelection();
            } catch (error) {
                console.error("❌ Error de conexión con el backend local:", error);
                alert(`Error al conectar con el servidor. Asegúrate de que está ejecutando en ${API_BASE_URL}`);
            }
        };

        // --- MÉTODOS CONTROLADORES DE PROCESOS (CRUD) ---
        const filtrarProcesos = (tipo, nivel) => {
            return ordenarPorCodigo(listaProcesos.value.filter(p => p.tipo === tipo && p.nivel === nivel));
        };

        const buscarHijos = (idPadre) => {
            return ordenarPorCodigo(listaProcesos.value.filter(p => p.id_padre === idPadre));
        };

        const guardarProceso = async () => {
            // Validación básica
            if (!formProceso.value.codigo.trim() || !formProceso.value.nombre.trim()) {
                alert("El código y nombre del proceso son obligatorios");
                return;
            }

            const esEdicion = formProceso.value.id !== null;
            const url = esEdicion ? `${API_BASE_URL}/api/procesos/${formProceso.value.id}` : `${API_BASE_URL}/api/procesos`;
            const method = esEdicion ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formProceso.value)
                });
                if (res.ok) {
                    console.log(`✅ Proceso ${esEdicion ? 'actualizado' : 'guardado'} correctamente`);
                    formProceso.value = { id: null, codigo: '', nombre: '', tipo: 'Misional', nivel: 2, responsable: '', producto: '', id_padre: null };
                    await cargarTodo();
                    alert(`¡Proceso ${esEdicion ? 'actualizado' : 'creado'} exitosamente!`);
                } else {
                    const error = await res.json();
                    alert(`Error al guardar: ${error.error || error.message}`);
                }
            } catch (err) {
                console.error(err);
                alert("Error al guardar el proceso. Verifica que el servidor esté corriendo.");
            }
        };

        const abrirEdicion = (proceso) => {
            formProceso.value = { ...proceso };
            currentTab.value = 'inventario';
        };

        const eliminarProceso = async (id) => {
            if (confirm("¿Confirmar la eliminación física del proceso? Se borrarán sus elementos hijos en cascada.")) {
                try {
                    await fetch(`${API_BASE_URL}/api/procesos/${id}`, { method: 'DELETE' });
                    await cargarTodo();
                } catch (err) {
                    console.error(err);
                }
            }
        };

        // --- MÉTODOS DE CONTROLADORES DE INDICADORES ---
        const guardarIndicador = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/indicadores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formIndicador.value)
                });
                if (res.ok) {
                    formIndicador.value = {
                        id_proceso: '', nombre: '', justificacion: '', relevancia: 1,
                        mediciones: [
                            { mes: 'Enero', vo: 0, le: 0 }, { mes: 'Febrero', vo: 0, le: 0 },
                            { mes: 'Marzo', vo: 0, le: 0 }, { mes: 'Abril', vo: 0, le: 0 },
                            { mes: 'Mayo', vo: 0, le: 0 }, { mes: 'Junio', vo: 0, le: 0 }
                        ]
                    };
                    await cargarTodo();
                    alert("¡Indicador enlazado y cargado en el motor CEPLAN!");
                }
            } catch (err) {
                console.error(err);
            }
        };

        // --- MÉTODO DE REGENERACIÓN DE SEMILLA ---
        const normalizarMediciones = (historial = []) => {
            return mesesSemestre.map(mes => {
                const medicion = historial.find(item => item.mes === mes) || {};
                return {
                    mes,
                    vo: Number(medicion.vo || 0),
                    le: Number(medicion.le || 0)
                };
            });
        };

        const iniciarEdicionMediciones = (indicador) => {
            indicadorEditandoId.value = indicador.id;
            medicionesEditables.value = normalizarMediciones(indicador.historial).map(m => ({ ...m }));
        };

        const cancelarEdicionMediciones = () => {
            indicadorEditandoId.value = null;
            medicionesEditables.value = [];
        };

        const guardarMediciones = async (indicador) => {
            const medicionesInvalidas = medicionesEditables.value.some(m =>
                m.vo === null || m.le === null ||
                Number.isNaN(Number(m.vo)) ||
                Number.isNaN(Number(m.le)) ||
                Number(m.vo) < 0 ||
                Number(m.le) < 0
            );

            if (medicionesInvalidas) {
                alert("Verifica las metas mensuales: VO y LE deben ser números mayores o iguales a cero.");
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/mediciones/${indicador.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mediciones: medicionesEditables.value })
                });

                if (res.ok) {
                    cancelarEdicionMediciones();
                    await cargarTodo();
                    alert("Metas semestrales actualizadas correctamente.");
                } else {
                    const error = await res.json();
                    alert(`Error al actualizar metas: ${error.error || error.message}`);
                }
            } catch (err) {
                console.error(err);
                alert("Error de conexión al actualizar las metas semestrales.");
            }
        };

        const regenerarSemilla = async () => {
            if (!confirm("⚠️ Esto borrará todos los procesos e indicadores y regenerará los datos de demostración. ¿Estás seguro?")) {
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/seed/reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (res.ok) {
                    console.log("✅ Semilla regenerada");
                    await cargarTodo();
                    alert("✅ Datos de demostración regenerados exitosamente. Actualiza la página si no ves los cambios.");
                } else {
                    alert("Error al regenerar la semilla");
                }
            } catch (err) {
                console.error(err);
                alert("Error de conexión al regenerar la semilla");
            }
        };

        // --- MÉTODOS PARA CARACTERIZACIÓN SIPOC ---
        const cargarDataSIPOC = async () => {
            if (!procesoSIPOCSeleccionado.value) {
                dataSIPOCActual.value = null;
                return;
            }
            const proceso = listaProcesos.value.find(p => p.id === parseInt(procesoSIPOCSeleccionado.value));
            if (proceso) {
                dataSIPOCActual.value = {
                    id: proceso.id,
                    codigo: proceso.codigo,
                    nombre: proceso.nombre,
                    tipo: proceso.tipo,
                    nivel: proceso.nivel,
                    responsable: proceso.responsable,
                    estado: proceso.estado || 'Activo',
                    version: proceso.version || '1.0',
                    producto: proceso.producto || '',
                    id_padre: proceso.id_padre || null,
                    proveedores: proceso.proveedores || '',
                    entradas: proceso.entradas || '',
                    salidas: proceso.salidas || '',
                    clientes: proceso.clientes || ''
                };
            }
        };

        const indicadorProcesoActual = () => {
            if (!dataSIPOCActual.value) return null;
            return listaIndicadores.value.find(ind => ind.id_proceso === dataSIPOCActual.value.id) || null;
        };

        const procesoPadreActual = () => {
            if (!dataSIPOCActual.value?.id_padre) return null;
            return listaProcesos.value.find(p => p.id === dataSIPOCActual.value.id_padre) || null;
        };

        const analiticaProcesoActual = () => {
            if (!dataSIPOCActual.value) return null;
            return (analiticaCeplan.value?.indicadores || [])
                .find(ind => ind.codigo === dataSIPOCActual.value.codigo) || null;
        };

        const tieneContenido = (valor) => {
            return String(valor || '').trim().length >= 4;
        };

        const sipocChecklist = (proceso) => {
            if (!proceso) return [];
            return [
                { label: 'Proveedores identificados', ok: tieneContenido(proceso.proveedores) },
                { label: 'Entradas documentadas', ok: tieneContenido(proceso.entradas) },
                { label: 'Producto o servicio definido', ok: tieneContenido(proceso.producto) },
                { label: 'Salidas verificables', ok: tieneContenido(proceso.salidas) },
                { label: 'Clientes o usuarios definidos', ok: tieneContenido(proceso.clientes) },
                { label: 'Responsable asignado', ok: tieneContenido(proceso.responsable) },
                { label: 'Indicador enlazado', ok: !!indicadorProcesoActual() }
            ];
        };

        const sipocScore = (proceso) => {
            const items = sipocChecklist(proceso);
            if (!items.length) return 0;
            const completos = items.filter(item => item.ok).length;
            return Math.round((completos / items.length) * 100);
        };

        const guardarSIPOC = async () => {
            if (!dataSIPOCActual.value || !dataSIPOCActual.value.id) {
                alert("Error: Proceso no seleccionado");
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/procesos/${dataSIPOCActual.value.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        codigo: dataSIPOCActual.value.codigo,
                        nombre: dataSIPOCActual.value.nombre,
                        tipo: dataSIPOCActual.value.tipo,
                        nivel: dataSIPOCActual.value.nivel,
                        responsable: dataSIPOCActual.value.responsable,
                        estado: dataSIPOCActual.value.estado,
                        version: dataSIPOCActual.value.version,
                        producto: dataSIPOCActual.value.producto,
                        id_padre: dataSIPOCActual.value.id_padre,
                        proveedores: dataSIPOCActual.value.proveedores,
                        entradas: dataSIPOCActual.value.entradas,
                        salidas: dataSIPOCActual.value.salidas,
                        clientes: dataSIPOCActual.value.clientes
                    })
                });
                if (res.ok) {
                    console.log("✅ SIPOC guardado correctamente");
                    await cargarTodo();
                    alert("✅ Caracterización SIPOC guardada exitosamente");
                } else {
                    const error = await res.json();
                    alert(`Error: ${error.error || error.message}`);
                }
            } catch (err) {
                console.error(err);
                alert("Error al guardar la caracterización SIPOC");
            }
        };

        watch([currentTab, listaIndicadores, analiticaCeplan, subprocesoDashboardId], () => {
            if (currentTab.value === 'graficos') {
                window.requestAnimationFrame(() => renderDashboardCharts());
            }
        }, { deep: true });

        onMounted(async () => {
            await cargarTodo();
            window.setInterval(() => {
                if (document.visibilityState === 'visible') {
                    cargarTodo().catch(console.error);
                }
            }, 15000);
        });

        return {
            currentTab, listaProcesos, listaIndicadores, analiticaCeplan, subprocesoActivo, subprocesoDashboardId,
            subprocesoDashboard, indicadorDashboard, semaforoLabel, semaforoIcon, semaforoCellClass,
            indicadorEditandoId, medicionesEditables,
            formProceso, formIndicador, cargarTodo, regenerarSemilla, filtrarProcesos, buscarHijos, guardarProceso,
            abrirEdicion, eliminarProceso, guardarIndicador, iniciarEdicionMediciones, cancelarEdicionMediciones, guardarMediciones,
            procesoSIPOCSeleccionado, dataSIPOCActual, cargarDataSIPOC, guardarSIPOC, indicadorProcesoActual,
            procesoPadreActual, analiticaProcesoActual, sipocChecklist, sipocScore
        };
    }
}).mount('#app');
