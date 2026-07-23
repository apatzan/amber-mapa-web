const autenticado =
    localStorage.getItem("autenticado");

if(autenticado !== "true"){

    window.location.href="index.html";

}

function cerrarSesion(){

    localStorage.removeItem("autenticado");
    localStorage.removeItem("usuario");

    window.location.href="index.html";

}
