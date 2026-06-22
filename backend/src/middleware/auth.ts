import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export function auth( req: Request,res: Response, next: NextFunction){

    const authHeader = req.headers.authorization;
    if (!authHeader){
        return res.status(401).json({
            erro:"token nao informado"
        });
    }

const token = authHeader.split(" ")[1];
try{

     const payload = jwt.verify(
    token,
    process.env.JWT_SECRET!
  );

  (req as any).usuario = payload;

  next();


}catch(error){
    console.error("Erro JWT:", error);

    return res.status(401).json({
        erro:"token invalido"
    })
}
}