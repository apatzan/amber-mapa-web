const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "data", "amber.db");
const SEED_PATH = path.join(__dirname, "data", "codigos.json");

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

function contarCodigos(){
    return db.prepare("SELECT COUNT(*) AS total FROM codigos").get().total;
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

if(contarCodigos() === 0){
    sembrarDesdeJSON();
}

module.exports = db;
