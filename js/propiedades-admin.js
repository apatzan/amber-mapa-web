let propiedades = [];
let editingId = null;
let terminoBusqueda = "";

const CAMPOS_PROPIEDAD = [
    "codigo", "titulo", "tipo_inmueble", "giro_negocio", "pais", "municipio",
    "departamento", "region", "metros_terreno", "varas_terreno", "latitud",
    "longitud", "plano", "maps", "video", "link_amber"
];

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

function escapeHtml(valor){
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function mostrarMensaje(texto){
    const mensaje = document.getElementById("admin-mensaje");
    mensaje.textContent = texto;

    setTimeout(() => {
        if(mensaje.textContent === texto) mensaje.textContent = "";
    }, 3000);
}

async function cargarPropiedades(){
    const respuesta = await authFetch("/api/propiedades");

    if(manejarSesionInvalida(respuesta)) return;

    const datos = await respuesta.json();
    propiedades = datos.propiedades;

    renderTabla();
}

function renderTabla(){
    const tbody = document.getElementById("tabla-propiedades-body");
    tbody.innerHTML = "";

    propiedades
        .filter(item => {
            if(!terminoBusqueda) return true;

            const codigo = (item.codigo || "").toLowerCase();
            const titulo = (item.titulo || "").toLowerCase();
            return codigo.includes(terminoBusqueda) || titulo.includes(terminoBusqueda);
        })
        .forEach(item => {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${escapeHtml(item.codigo)}</td>
                <td>${escapeHtml(item.titulo)}</td>
                <td>${escapeHtml(item.tipo_inmueble)}</td>
                <td>${escapeHtml(item.pais)}</td>
                <td>${escapeHtml(item.departamento)}</td>
                <td class="acciones-celda">
                    <button class="btn btn-small" onclick="iniciarEdicion(${item.id})">Editar</button>
                    <button class="btn btn-small btn-danger" onclick="eliminarPropiedad(${item.id})">Eliminar</button>
                </td>
            `;

            tbody.appendChild(fila);
        });
}

function mostrarFormulario(propiedad){
    for(const campo of CAMPOS_PROPIEDAD){
        document.getElementById(`campo-${campo}`).value = propiedad[campo] ?? "";
    }

    document.getElementById("form-propiedad-contenedor").hidden = false;
}

function ocultarFormulario(){
    document.getElementById("form-propiedad-contenedor").hidden = true;
    document.getElementById("form-propiedad").reset();
    editingId = null;
}

function iniciarEdicion(id){
    const propiedad = propiedades.find(p => p.id === id);
    if(!propiedad) return;

    editingId = id;
    mostrarFormulario(propiedad);
}

function agregarNuevo(){
    editingId = null;
    mostrarFormulario({});
}

async function guardarPropiedad(evento){
    evento.preventDefault();

    const propiedad = {};
    for(const campo of CAMPOS_PROPIEDAD){
        propiedad[campo] = document.getElementById(`campo-${campo}`).value.trim();
    }

    if(!propiedad.codigo || !propiedad.titulo){
        mostrarMensaje("Código y título son obligatorios");
        return;
    }

    const esCreacion = editingId === null;

    const respuesta = await authFetch(
        esCreacion ? "/api/propiedades" : `/api/propiedades/${editingId}`,
        {
            method: esCreacion ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(propiedad)
        }
    );

    if(manejarSesionInvalida(respuesta)) return;

    const datos = await respuesta.json();

    if(!respuesta.ok){
        mostrarMensaje(datos.error || "No se pudo guardar la propiedad");
        return;
    }

    ocultarFormulario();
    await cargarPropiedades();
    mostrarMensaje("Cambios guardados");
}

async function eliminarPropiedad(id){
    const item = propiedades.find(p => p.id === id);
    if(!item) return;

    if(!confirm(`¿Eliminar la propiedad ${item.codigo}?`)) return;

    const respuesta = await authFetch(`/api/propiedades/${id}`, { method: "DELETE" });

    if(manejarSesionInvalida(respuesta)) return;

    if(!respuesta.ok){
        const datos = await respuesta.json().catch(() => ({}));
        mostrarMensaje(datos.error || "No se pudo eliminar la propiedad");
        return;
    }

    await cargarPropiedades();
    mostrarMensaje("Propiedad eliminada");
}

document.addEventListener("DOMContentLoaded", () => {
    cargarPropiedades();

    document.getElementById("btn-nuevo").addEventListener("click", agregarNuevo);
    document.getElementById("btn-cancelar-propiedad").addEventListener("click", ocultarFormulario);
    document.getElementById("form-propiedad").addEventListener("submit", guardarPropiedad);

    document.getElementById("buscar-propiedad").addEventListener("input", (evento) => {
        terminoBusqueda = evento.target.value.trim().toLowerCase();
        renderTabla();
    });
});
