async function validar(){

    const codigoIngresado =
        document.getElementById("codigo").value.trim();

    const respuesta =
        await fetch("data/codigos.json");

    const datos =
        await respuesta.json();

    const usuario =
        datos.codigos.find(
            item => item.codigo === codigoIngresado
        );

    if(usuario){

        localStorage.setItem("autenticado","true");
        localStorage.setItem("usuario",usuario.nombre);

        window.location.href="mapa.html";

    }else{

        document.getElementById("mensaje").innerHTML =
        "Código inválido";

    }

}
