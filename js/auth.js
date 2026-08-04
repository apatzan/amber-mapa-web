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

async function cerrarSesion(){

    const token = localStorage.getItem("token");

    localStorage.removeItem("autenticado");
    localStorage.removeItem("usuario");
    localStorage.removeItem("tipo");
    localStorage.removeItem("token");

    if(token){
        try{
            await fetch("/api/logout", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
        }catch(error){
            // el logout local ya ocurrió; ignorar fallas de red al invalidar en el servidor
        }
    }

    window.location.href="index.html";

}
