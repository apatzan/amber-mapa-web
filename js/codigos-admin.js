let codigos = [];
let editingIndex = -1;
let esNuevo = false;
let terminoBusqueda = "";
let propiedades = [];
let asignacionCodigoId = null;
let propiedadesSeleccionadas = new Set();
let terminoAsignacion = "";
let varasDesde = null;
let varasHasta = null;

function authFetch(url, opciones = {}){
    const token = localStorage.getItem("token");
    const headers = { ...(opciones.headers || {}), "Authorization": `Bearer ${token}` };

    return fetch(url, { ...opciones, headers });
}

function manejarSesionInvalida(respuesta){
    if(respuesta.status === 401 || respuesta.status === 403){
        window.location.href = "index.html";
        return true;
    }

    return false;
}

async function cargarCodigos(){
    const respuesta = await authFetch("/api/codigos");

    if(manejarSesionInvalida(respuesta)) return;

    const datos = await respuesta.json();
    codigos = datos.codigos;

    renderTabla();
}

function mostrarMensaje(texto){
    const mensaje = document.getElementById("admin-mensaje");
    mensaje.textContent = texto;

    setTimeout(() => {
        if(mensaje.textContent === texto) mensaje.textContent = "";
    }, 3000);
}

function escapeHtml(valor){
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function salirDeEdicionActual(){
    if(editingIndex !== -1 && esNuevo){
        codigos.splice(editingIndex, 1);
    }

    editingIndex = -1;
    esNuevo = false;
}

function textoPropiedades(item){
    if(item.tipo === "mantenimiento" || !item.propiedades_limitadas) return "Todas";
    if(item.propiedades_asignadas === 0) return "Ninguna";

    return item.propiedades_asignadas === 1
        ? "1 propiedad"
        : `${item.propiedades_asignadas} propiedades`;
}

function renderTabla(){
    const tbody = document.getElementById("tabla-codigos-body");
    tbody.innerHTML = "";

    codigos.forEach((item, index) => {
        const coincideBusqueda = item.nombre.toLowerCase().includes(terminoBusqueda);

        if(!coincideBusqueda && index !== editingIndex) return;

        const fila = document.createElement("tr");

        if(index === editingIndex){
            fila.innerHTML = `
                <td><input type="text" id="edit-codigo" value="${escapeHtml(item.codigo)}"></td>
                <td><input type="text" id="edit-nombre" value="${escapeHtml(item.nombre)}"></td>
                <td>
                    <select id="edit-tipo">
                        <option value="consulta" ${item.tipo === "consulta" ? "selected" : ""}>consulta</option>
                        <option value="mantenimiento" ${item.tipo === "mantenimiento" ? "selected" : ""}>mantenimiento</option>
                    </select>
                </td>
                <td>${textoPropiedades(item)}</td>
                <td class="acciones-celda">
                    <button class="btn btn-small" onclick="guardarEdicion()">Guardar</button>
                    <button class="btn btn-small btn-secondary" onclick="cancelarEdicion()">Cancelar</button>
                </td>
            `;
        }else{
            fila.innerHTML = `
                <td>${escapeHtml(item.codigo)}</td>
                <td>${escapeHtml(item.nombre)}</td>
                <td>${escapeHtml(item.tipo)}</td>
                <td>${textoPropiedades(item)}</td>
                <td class="acciones-celda">
                    <button class="btn btn-small" onclick="iniciarEdicion(${index})">Editar</button>
                    ${item.tipo === "mantenimiento" ? "" : `<button class="btn btn-small btn-secondary" onclick="abrirAsignacion(${index})">Propiedades</button>`}
                    <button class="btn btn-small btn-danger" onclick="eliminarCodigo(${index})">Eliminar</button>
                </td>
            `;
        }

        tbody.appendChild(fila);
    });
}

function iniciarEdicion(index){
    salirDeEdicionActual();
    cerrarAsignacion();
    editingIndex = index;
    renderTabla();
}

function cancelarEdicion(){
    salirDeEdicionActual();
    renderTabla();
}

async function guardarEdicion(){
    const codigo = document.getElementById("edit-codigo").value.trim();
    const nombre = document.getElementById("edit-nombre").value.trim();
    const tipo = document.getElementById("edit-tipo").value.trim();

    if(!codigo || !nombre || !tipo){
        mostrarMensaje("Código, nombre y tipo son obligatorios");
        return;
    }

    const item = codigos[editingIndex];
    const esCreacion = esNuevo;

    const respuesta = await authFetch(
        esCreacion ? "/api/codigos" : `/api/codigos/${item.id}`,
        {
            method: esCreacion ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codigo, nombre, tipo })
        }
    );

    if(manejarSesionInvalida(respuesta)) return;

    const datos = await respuesta.json();

    if(!respuesta.ok){
        mostrarMensaje(datos.error || "No se pudo guardar el código");
        return;
    }

    editingIndex = -1;
    esNuevo = false;

    await cargarCodigos();
    mostrarMensaje("Cambios guardados");
}

async function eliminarCodigo(index){
    const item = codigos[index];

    if(!confirm(`¿Eliminar el código ${item.codigo}?`)) return;

    const respuesta = await authFetch(`/api/codigos/${item.id}`, { method: "DELETE" });

    if(manejarSesionInvalida(respuesta)) return;

    if(!respuesta.ok){
        const datos = await respuesta.json().catch(() => ({}));
        mostrarMensaje(datos.error || "No se pudo eliminar el código");
        return;
    }

    if(asignacionCodigoId === item.id) cerrarAsignacion();

    await cargarCodigos();
    mostrarMensaje("Código eliminado");
}

function agregarNuevo(){
    salirDeEdicionActual();
    cerrarAsignacion();

    codigos.push({ codigo: "", nombre: "", tipo: "" });
    editingIndex = codigos.length - 1;
    esNuevo = true;

    renderTabla();
}

// varas_terreno viene de una hoja de cálculo con dos formatos: "1,341,578.45" y "110.000".
// En el segundo el punto separa miles (son 110,000 varas, no 110).
function parseVaras(raw){
    if(raw === null || raw === undefined) return null;

    const texto = String(raw).trim();
    const digitos = /^\d{1,3}(\.\d{3})+$/.test(texto)
        ? texto.replace(/\./g, "")
        : texto.replace(/,/g, "");
    const num = parseFloat(digitos);

    return isNaN(num) ? null : num;
}

function coincideVaras(item){
    if(varasDesde === null && varasHasta === null) return true;

    const varas = parseVaras(item.varas_terreno);
    if(varas === null) return false;

    return (varasDesde === null || varas >= varasDesde)
        && (varasHasta === null || varas <= varasHasta);
}

function coincideTexto(item){
    if(!terminoAsignacion) return true;

    return [item.codigo, item.titulo, item.tipo_inmueble, item.departamento]
        .some(valor => (valor || "").toLowerCase().includes(terminoAsignacion));
}

function propiedadesListadas(){
    return propiedades.filter(item => coincideTexto(item) && coincideVaras(item));
}

function leerVaras(id){
    const valor = document.getElementById(id).value;
    return valor === "" ? null : Number(valor);
}

function renderContadorAsignacion(){
    document.getElementById("asignacion-contador").textContent = propiedadesSeleccionadas.size === 0
        ? "Ninguna seleccionada: verá todas las propiedades"
        : `${propiedadesSeleccionadas.size} de ${propiedades.length} seleccionadas`;
}

function renderListaAsignacion(){
    const lista = document.getElementById("asignacion-lista");
    lista.innerHTML = "";

    const listadas = propiedadesListadas();

    if(listadas.length === 0){
        lista.textContent = "Ninguna propiedad coincide con la búsqueda";
    }

    listadas.forEach(item => {
        const varas = parseVaras(item.varas_terreno) === null ? "" : `${item.varas_terreno.trim()} varas`;
        const detalle = [item.tipo_inmueble, item.departamento, varas].filter(Boolean).join(" · ");

        const opcion = document.createElement("label");
        opcion.className = "filtro-opcion";
        opcion.innerHTML = `
            <input type="checkbox" ${propiedadesSeleccionadas.has(item.id) ? "checked" : ""}>
            <span><strong>${escapeHtml(item.codigo)}</strong> ${escapeHtml(item.titulo || "")}${detalle ? ` (${escapeHtml(detalle)})` : ""}</span>
        `;

        opcion.querySelector("input").addEventListener("change", (evento) => {
            if(evento.target.checked){
                propiedadesSeleccionadas.add(item.id);
            }else{
                propiedadesSeleccionadas.delete(item.id);
            }
            renderContadorAsignacion();
        });

        lista.appendChild(opcion);
    });

    renderContadorAsignacion();
}

async function abrirAsignacion(index){
    salirDeEdicionActual();
    renderTabla();

    const item = codigos[index];
    asignacionCodigoId = item.id;

    const [respuestaPropiedades, respuestaAsignadas] = await Promise.all([
        authFetch("/api/propiedades"),
        authFetch(`/api/codigos/${item.id}/propiedades`)
    ]);

    if(manejarSesionInvalida(respuestaPropiedades) || manejarSesionInvalida(respuestaAsignadas)) return;

    // El administrador pudo abrir otro código mientras se esperaba la respuesta
    if(asignacionCodigoId !== item.id) return;

    if(!respuestaPropiedades.ok || !respuestaAsignadas.ok){
        asignacionCodigoId = null;
        mostrarMensaje("No se pudieron cargar las propiedades");
        return;
    }

    const datosPropiedades = await respuestaPropiedades.json();
    const datosAsignadas = await respuestaAsignadas.json();

    propiedades = datosPropiedades.propiedades;
    propiedadesSeleccionadas = new Set(datosAsignadas.propiedad_ids);
    terminoAsignacion = "";
    varasDesde = null;
    varasHasta = null;

    document.getElementById("buscar-asignacion").value = "";
    document.getElementById("varas-desde").value = "";
    document.getElementById("varas-hasta").value = "";
    document.getElementById("asignacion-titulo").textContent = `Propiedades de ${item.nombre} (${item.codigo})`;
    renderListaAsignacion();

    const contenedor = document.getElementById("asignacion-contenedor");
    contenedor.hidden = false;
    contenedor.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cerrarAsignacion(){
    document.getElementById("asignacion-contenedor").hidden = true;
    asignacionCodigoId = null;
}

function marcarListadas(marcar){
    propiedadesListadas().forEach(item => {
        if(marcar){
            propiedadesSeleccionadas.add(item.id);
        }else{
            propiedadesSeleccionadas.delete(item.id);
        }
    });

    renderListaAsignacion();
}

async function guardarAsignacion(){
    const respuesta = await authFetch(`/api/codigos/${asignacionCodigoId}/propiedades`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedad_ids: [...propiedadesSeleccionadas] })
    });

    if(manejarSesionInvalida(respuesta)) return;

    const datos = await respuesta.json();

    if(!respuesta.ok){
        mostrarMensaje(datos.error || "No se pudieron guardar las propiedades");
        return;
    }

    cerrarAsignacion();

    await cargarCodigos();
    mostrarMensaje("Propiedades asignadas");
}

document.addEventListener("DOMContentLoaded", () => {
    cargarCodigos();

    document.getElementById("btn-nuevo").addEventListener("click", agregarNuevo);
    document.getElementById("btn-guardar-asignacion").addEventListener("click", guardarAsignacion);
    document.getElementById("btn-cancelar-asignacion").addEventListener("click", cerrarAsignacion);
    document.getElementById("btn-marcar-listadas").addEventListener("click", () => marcarListadas(true));
    document.getElementById("btn-desmarcar-listadas").addEventListener("click", () => marcarListadas(false));

    document.getElementById("buscar-asignacion").addEventListener("input", (evento) => {
        terminoAsignacion = evento.target.value.trim().toLowerCase();
        renderListaAsignacion();
    });

    document.getElementById("varas-desde").addEventListener("input", () => {
        varasDesde = leerVaras("varas-desde");
        renderListaAsignacion();
    });

    document.getElementById("varas-hasta").addEventListener("input", () => {
        varasHasta = leerVaras("varas-hasta");
        renderListaAsignacion();
    });

    document.getElementById("buscar-nombre").addEventListener("input", (evento) => {
        terminoBusqueda = evento.target.value.trim().toLowerCase();
        renderTabla();
    });
});
