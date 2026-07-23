const autenticado =
    localStorage.getItem("autenticado");

if(autenticado !== "true"){

    window.location.href="index.html";

}

document.addEventListener("DOMContentLoaded", () => {

    const usuario = localStorage.getItem("usuario");
    const bienvenido = document.getElementById("bienvenido");

    if(bienvenido && usuario){
        bienvenido.textContent = `Bienvenido: ${usuario}`;
    }

});

function cerrarSesion(){

    localStorage.removeItem("autenticado");
    localStorage.removeItem("usuario");

    window.location.href="index.html";

}
