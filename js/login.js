async function validar(){

    const codigoIngresado =
        document.getElementById("codigo").value.trim();

    const respuesta = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoIngresado })
    });

    if(respuesta.ok){

        const usuario = await respuesta.json();

        localStorage.setItem("autenticado","true");
        localStorage.setItem("usuario",usuario.nombre);
        localStorage.setItem("tipo",usuario.tipo);
        localStorage.setItem("token",usuario.token);

        window.location.href = usuario.tipo === "mantenimiento"
            ? "info.html"
            : "mapa.html";

    }else{

        document.getElementById("mensaje").innerHTML =
        "Código inválido";

    }

}
