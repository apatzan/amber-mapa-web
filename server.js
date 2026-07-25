const path = require("path");
const express = require("express");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/login", (req, res) => {
    const codigo = String(req.body.codigo || "").trim();

    const usuario = db
        .prepare("SELECT codigo, nombre, tipo FROM codigos WHERE codigo = ?")
        .get(codigo);

    if(!usuario) return res.status(404).json({ error: "Código inválido" });

    res.json(usuario);
});

app.get("/api/codigos", (req, res) => {
    const codigos = db.prepare("SELECT id, codigo, nombre, tipo FROM codigos ORDER BY id").all();
    res.json({ codigos });
});

app.post("/api/codigos", (req, res) => {
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

app.put("/api/codigos/:id", (req, res) => {
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

app.delete("/api/codigos/:id", (req, res) => {
    const { id } = req.params;

    const resultado = db.prepare("DELETE FROM codigos WHERE id = ?").run(id);

    if(resultado.changes === 0){
        return res.status(404).json({ error: "Código no encontrado" });
    }

    res.status(204).end();
});

app.listen(PORT, () => {
    console.log(`Amber corriendo en http://localhost:${PORT}`);
});
