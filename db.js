const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "data", "amber.db");
const SEED_PATH = path.join(__dirname, "data", "codigos.json");
const SEED_PROPIEDADES_PATH = path.join(__dirname, "data", "propiedades.json");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS codigos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS propiedades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_inmueble TEXT,
        titulo TEXT,
        codigo TEXT UNIQUE NOT NULL,
        giro_negocio TEXT,
        pais TEXT,
        municipio TEXT,
        departamento TEXT,
        metros_terreno TEXT,
        varas_terreno TEXT,
        region TEXT,
        latitud TEXT,
        longitud REAL,
        plano TEXT,
        maps TEXT,
        video TEXT
    )
`);

function contarCodigos(){
    return db.prepare("SELECT COUNT(*) AS total FROM codigos").get().total;
}

function contarPropiedades(){
    return db.prepare("SELECT COUNT(*) AS total FROM propiedades").get().total;
}

function sembrarDesdeJSON(){
    if(!fs.existsSync(SEED_PATH)) return;

    const datos = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
    const insertar = db.prepare(
        "INSERT OR IGNORE INTO codigos (codigo, nombre, tipo) VALUES (@codigo, @nombre, @tipo)"
    );

    const insertarTodos = db.transaction((codigos) => {
        for(const c of codigos) insertar.run(c);
    });

    insertarTodos(datos.codigos || []);
}

function sembrarPropiedadesDesdeJSON(){
    if(!fs.existsSync(SEED_PROPIEDADES_PATH)) return;

    const datos = JSON.parse(fs.readFileSync(SEED_PROPIEDADES_PATH, "utf8"));
    const insertar = db.prepare(`
        INSERT OR IGNORE INTO propiedades (
            tipo_inmueble, titulo, codigo, giro_negocio, pais, municipio, departamento,
            metros_terreno, varas_terreno, region, latitud, longitud, plano, maps, video
        ) VALUES (
            @tipo_inmueble, @titulo, @codigo, @giro_negocio, @pais, @municipio, @departamento,
            @metros_terreno, @varas_terreno, @region, @latitud, @longitud, @plano, @maps, @video
        )
    `);

    const insertarTodas = db.transaction((propiedades) => {
        for(const p of propiedades){
            insertar.run({
                tipo_inmueble: p["Tipo inmueble"] ?? null,
                titulo: p["Titulo"] ?? null,
                codigo: p["Código"] ?? null,
                giro_negocio: p["Giro de negocio"] ?? null,
                pais: p["Pais "] ?? null,
                municipio: p["Municipio"] ?? null,
                departamento: p["Departamento"] ?? null,
                metros_terreno: p["Metros Terreno"] === null || p["Metros Terreno"] === undefined ? null : String(p["Metros Terreno"]),
                varas_terreno: p["Varas terreno"] === null || p["Varas terreno"] === undefined ? null : String(p["Varas terreno"]),
                region: p["Región"] ?? null,
                latitud: p["Latitud"] === null || p["Latitud"] === undefined ? null : String(p["Latitud"]),
                longitud: typeof p["Longitud"] === "number" ? p["Longitud"] : null,
                plano: p["Plano"] ?? null,
                maps: p["Maps"] ?? null,
                video: p["Video"] ?? null
            });
        }
    });

    insertarTodas(datos || []);
}

if(contarCodigos() === 0){
    sembrarDesdeJSON();
}

if(contarPropiedades() === 0){
    sembrarPropiedadesDesdeJSON();
}

module.exports = db;
