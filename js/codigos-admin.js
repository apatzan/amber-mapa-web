let codigos = [];
let editingIndex = -1;
let esNuevo = false;
let terminoBusqueda = "";

async function cargarCodigos(){
    const respuesta = await fetch("/api/codigos");
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
                <td class="acciones-celda">
                    <button class="btn btn-small" onclick="iniciarEdicion(${index})">Editar</button>
                    <button class="btn btn-small btn-danger" onclick="eliminarCodigo(${index})">Eliminar</button>
                </td>
            `;
        }

        tbody.appendChild(fila);
    });
}

function iniciarEdicion(index){
    salirDeEdicionActual();
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

    const respuesta = await fetch(
        esCreacion ? "/api/codigos" : `/api/codigos/${item.id}`,
        {
            method: esCreacion ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codigo, nombre, tipo })
        }
    );

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

    const respuesta = await fetch(`/api/codigos/${item.id}`, { method: "DELETE" });

    if(!respuesta.ok){
        const datos = await respuesta.json().catch(() => ({}));
        mostrarMensaje(datos.error || "No se pudo eliminar el código");
        return;
    }

    await cargarCodigos();
    mostrarMensaje("Código eliminado");
}

function agregarNuevo(){
    salirDeEdicionActual();

    codigos.push({ codigo: "", nombre: "", tipo: "" });
    editingIndex = codigos.length - 1;
    esNuevo = true;

    renderTabla();
}

document.addEventListener("DOMContentLoaded", () => {
    cargarCodigos();

    document.getElementById("btn-nuevo").addEventListener("click", agregarNuevo);

    document.getElementById("buscar-nombre").addEventListener("input", (evento) => {
        terminoBusqueda = evento.target.value.trim().toLowerCase();
        renderTabla();
    });
});
