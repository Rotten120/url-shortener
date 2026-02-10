import { prisma } from "../prismaClient.js"
import { nanoid } from "nanoid"
 
export const sessionMiddleware = async (req, res, next) => {
  try {
    let visitorId = req.cookies?.visitorId;
    const visitor = await prisma.visitor.findUnique({
      where: { cookieId: visitorId }
    });
  
    if(!visitor) {
      visitorId = nanoid(15);
      await prisma.visitor.create({
        data: { cookieId: visitorId }
      });

      res.cookie("visitorId", visitorId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000*60*60*24*365
      });

      console.log("A new visitor. visitorId: ", visitorId);
    } else {
      console.log("Another visitor request. visitorId: ", visitorId);
    }

    req.visitorId = visitorId;
    next();
  } catch(error) {
    console.log(error);
    res.sendStatus(500);
  }
}
