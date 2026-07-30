const path = require("path");
const crypto = require("crypto");
const express = require("express");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 8000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const sesiones = new Map();

function crearSesion(usuario){
    const token = crypto.randomBytes(32).toString("hex");
    sesiones.set(token, { ...usuario, expira: Date.now() + SESSION_TTL_MS });
    return token;
}

function obtenerSesion(token){
    const sesion = sesiones.get(token);
    if(!sesion) return null;

    if(Date.now() > sesion.expira){
        sesiones.delete(token);
        return null;
    }

    return sesion;
}

function requireMantenimiento(req, res, next){
    const encabezado = req.headers.authorization || "";
    const token = encabezado.startsWith("Bearer ") ? encabezado.slice(7) : null;
    const sesion = token && obtenerSesion(token);

    if(!sesion) return res.status(401).json({ error: "No autenticado" });
    if(sesion.tipo !== "mantenimiento") return res.status(403).json({ error: "No autorizado" });

    req.sesion = sesion;
    next();
}

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/login", (req, res) => {
    const codigo = String(req.body.codigo || "").trim();

    const usuario = db
        .prepare("SELECT codigo, nombre, tipo FROM codigos WHERE codigo = ?")
        .get(codigo);

    if(!usuario) return res.status(404).json({ error: "Código inválido" });

    const token = crearSesion(usuario);
    res.json({ ...usuario, token });
});

app.post("/api/logout", (req, res) => {
    const encabezado = req.headers.authorization || "";
    const token = encabezado.startsWith("Bearer ") ? encabezado.slice(7) : null;

    if(token) sesiones.delete(token);
    res.status(204).end();
});

app.get("/api/codigos", requireMantenimiento, (req, res) => {
    const codigos = db.prepare("SELECT id, codigo, nombre, tipo FROM codigos ORDER BY id").all();
    res.json({ codigos });
});

app.post("/api/codigos", requireMantenimiento, (req, res) => {
    const { codigo, nombre, tipo } = req.body;

    if(!codigo || !nombre || !tipo){
        return res.status(400).json({ error: "Código, nombre y tipo son obligatorios" });
    }

    try{
        const resultado = db
            .prepare("INSERT INTO codigos (codigo, nombre, tipo) VALUES (?, ?, ?)")
            .run(codigo.trim(), nombre.trim(), tipo.trim());

        res.status(201).json({ id: resultado.lastInsertRowid, codigo, nombre, tipo });
    }catch(error){
        if(error.code === "SQLITE_CONSTRAINT_UNIQUE"){
            return res.status(409).json({ error: `El código ${codigo} ya existe` });
        }
        throw error;
    }
});

app.put("/api/codigos/:id", requireMantenimiento, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, tipo } = req.body;

    if(!codigo || !nombre || !tipo){
        return res.status(400).json({ error: "Código, nombre y tipo son obligatorios" });
    }

    try{
        const resultado = db
            .prepare("UPDATE codigos SET codigo = ?, nombre = ?, tipo = ? WHERE id = ?")
            .run(codigo.trim(), nombre.trim(), tipo.trim(), id);

        if(resultado.changes === 0){
            return res.status(404).json({ error: "Código no encontrado" });
        }

        res.json({ id: Number(id), codigo, nombre, tipo });
    }catch(error){
        if(error.code === "SQLITE_CONSTRAINT_UNIQUE"){
            return res.status(409).json({ error: `El código ${codigo} ya existe` });
        }
        throw error;
    }
});

app.delete("/api/codigos/:id", requireMantenimiento, (req, res) => {
    const { id } = req.params;

    const resultado = db.prepare("DELETE FROM codigos WHERE id = ?").run(id);

    if(resultado.changes === 0){
        return res.status(404).json({ error: "Código no encontrado" });
    }

    res.status(204).end();
});

const CAMPOS_PROPIEDAD = [
    "tipo_inmueble", "titulo", "codigo", "giro_negocio", "pais", "municipio",
    "departamento", "metros_terreno", "varas_terreno", "region", "latitud",
    "longitud", "plano", "maps", "video"
];

function normalizarCamposPropiedad(body){
    const propiedad = {};

    for(const campo of CAMPOS_PROPIEDAD){
        const valor = body[campo];

        if(campo === "longitud"){
            propiedad.longitud = valor === "" || valor === null || valor === undefined
                ? null
                : Number(valor);
            continue;
        }

        propiedad[campo] = valor === "" || valor === null || valor === undefined
            ? null
            : String(valor).trim();
    }

    return propiedad;
}

app.get("/api/propiedades", (req, res) => {
    const propiedades = db.prepare("SELECT * FROM propiedades ORDER BY id").all();
    res.json({ propiedades });
});

app.post("/api/propiedades", requireMantenimiento, (req, res) => {
    const propiedad = normalizarCamposPropiedad(req.body);

    if(!propiedad.codigo || !propiedad.titulo){
        return res.status(400).json({ error: "Código y título son obligatorios" });
    }

    try{
        const resultado = db
            .prepare(`
                INSERT INTO propiedades (
                    tipo_inmueble, titulo, codigo, giro_negocio, pais, municipio, departamento,
                    metros_terreno, varas_terreno, region, latitud, longitud, plano, maps, video
                ) VALUES (
                    @tipo_inmueble, @titulo, @codigo, @giro_negocio, @pais, @municipio, @departamento,
                    @metros_terreno, @varas_terreno, @region, @latitud, @longitud, @plano, @maps, @video
                )
            `)
            .run(propiedad);

        res.status(201).json({ id: resultado.lastInsertRowid, ...propiedad });
    }catch(error){
        if(error.code === "SQLITE_CONSTRAINT_UNIQUE"){
            return res.status(409).json({ error: `El código ${propiedad.codigo} ya existe` });
        }
        throw error;
    }
});

app.put("/api/propiedades/:id", requireMantenimiento, (req, res) => {
    const { id } = req.params;
    const propiedad = normalizarCamposPropiedad(req.body);

    if(!propiedad.codigo || !propiedad.titulo){
        return res.status(400).json({ error: "Código y título son obligatorios" });
    }

    try{
        const resultado = db
            .prepare(`
                UPDATE propiedades SET
                    tipo_inmueble = @tipo_inmueble, titulo = @titulo, codigo = @codigo,
                    giro_negocio = @giro_negocio, pais = @pais, municipio = @municipio,
                    departamento = @departamento, metros_terreno = @metros_terreno,
                    varas_terreno = @varas_terreno, region = @region, latitud = @latitud,
                    longitud = @longitud, plano = @plano, maps = @maps, video = @video
                WHERE id = @id
            `)
            .run({ ...propiedad, id });

        if(resultado.changes === 0){
            return res.status(404).json({ error: "Propiedad no encontrada" });
        }

        res.json({ id: Number(id), ...propiedad });
    }catch(error){
        if(error.code === "SQLITE_CONSTRAINT_UNIQUE"){
            return res.status(409).json({ error: `El código ${propiedad.codigo} ya existe` });
        }
        throw error;
    }
});

app.delete("/api/propiedades/:id", requireMantenimiento, (req, res) => {
    const { id } = req.params;

    const resultado = db.prepare("DELETE FROM propiedades WHERE id = ?").run(id);

    if(resultado.changes === 0){
        return res.status(404).json({ error: "Propiedad no encontrada" });
    }

    res.status(204).end();
});

app.listen(PORT, () => {
    console.log(`Amber corriendo en http://localhost:${PORT}`);
});
