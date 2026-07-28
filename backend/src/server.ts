/*import app from "./app"; 

const PORT = 3000;

app.listen(PORT, ()=> {

    console.log(`servidor rodando na porta ${PORT}`)
});*/
import "dotenv/config";
import app from "./app";

console.log("TIPO DO APP:", typeof app);
console.log("APP:", app);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});