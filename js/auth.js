const autenticado =
    localStorage.getItem("autenticado");

if(autenticado !== "true"){

    window.location.href="index.html";

}

document.addEventListener("DOMContentLoaded", () => {

    const usuario = localStorage.getItem("usuario");
    const bienvenido = document.getElementById("bienvenido");
    const bienvenidoTexto = document.getElementById("bienvenido-texto");

    if(bienvenido && bienvenidoTexto && usuario){
        bienvenidoTexto.textContent = `Bienvenido, ${usuario}`;
        bienvenido.style.display = "inline-flex";
    }

});

function cerrarSesion(){

    localStorage.removeItem("autenticado");
    localStorage.removeItem("usuario");

    window.location.href="index.html";

}
