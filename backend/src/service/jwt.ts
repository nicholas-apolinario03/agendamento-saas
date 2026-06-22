import  jwt from "jsonwebtoken";

export function gerartoken(  empresaId: number, email: string): string {

    const token = jwt.sign(
        {
            empresaId,
            email
        },
        process.env.JWT_SECRET!,
        {
            expiresIn: "1d"
        }
    );

    return token;

  
}