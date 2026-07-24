const DRAFT_KEY = "codigos_draft";

let codigos = [];
let editingIndex = -1;
let esNuevo = false;

async function cargarCodigos(){

    const draft = localStorage.getItem(DRAFT_KEY);

    if(draft){
        codigos = JSON.parse(draft);
    }else{
        const respuesta = await fetch("data/codigos.json");
        const datos = await respuesta.json();
        codigos = datos.codigos;
    }

    renderTabla();
}

function guardarDraft(){
    localStorage.setItem(DRAFT_KEY, JSON.stringify(codigos));
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
        const fila = document.createElement("tr");

        if(index === editingIndex){
            fila.innerHTML = `
                <td><input type="text" id="edit-codigo" value="${escapeHtml(item.codigo)}"></td>
                <td><input type="text" id="edit-nombre" value="${escapeHtml(item.nombre)}"></td>
                <td><input type="text" id="edit-tipo" value="${escapeHtml(item.tipo)}"></td>
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

function guardarEdicion(){
    const codigo = document.getElementById("edit-codigo").value.trim();
    const nombre = document.getElementById("edit-nombre").value.trim();
    const tipo = document.getElementById("edit-tipo").value.trim();

    if(!codigo || !nombre || !tipo){
        mostrarMensaje("Código, nombre y tipo son obligatorios");
        return;
    }

    codigos[editingIndex] = { codigo, nombre, tipo };
    editingIndex = -1;
    esNuevo = false;

    guardarDraft();
    renderTabla();
    mostrarMensaje("Cambios guardados (borrador local)");
}

function eliminarCodigo(index){
    const item = codigos[index];

    if(!confirm(`¿Eliminar el código ${item.codigo}?`)) return;

    codigos.splice(index, 1);
    guardarDraft();
    renderTabla();
    mostrarMensaje("Código eliminado (borrador local)");
}

function agregarNuevo(){
    salirDeEdicionActual();

    codigos.push({ codigo: "", nombre: "", tipo: "" });
    editingIndex = codigos.length - 1;
    esNuevo = true;

    renderTabla();
}

function descargarJSON(){
    const contenido = JSON.stringify({ codigos }, null, 4);
    const blob = new Blob([contenido], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "codigos.json";
    enlace.click();

    URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
    cargarCodigos();

    document.getElementById("btn-nuevo").addEventListener("click", agregarNuevo);
    document.getElementById("btn-descargar").addEventListener("click", descargarJSON);
});
