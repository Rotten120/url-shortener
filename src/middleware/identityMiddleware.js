import { prisma } from "../lib/prismaClient.js"
import { verifyToken } from "../lib/auth.js"
import { setCookie } from "../lib/cookies.js"
import { nanoid } from "nanoid"

/*
 * requireAuth
 * Description: Validates if req has the userId attribute
 *
 * Error:
 *   401 userId is not found or null
 */
export const requireAuth = (req, res, next) => {
  if(!req.userId) return res.status(401).send({ message: "Unauthorized" });
  next();
}

/*
 * requireOwner
 * Description: Validates if req has the ownerId attribute
 *
 * Error:
 *   401 ownerId is not found or null
 *
 * Note:
 *   May not be used if route already has the 'requieAuth' middleware
 *
 */
export const requireOwner = (req, res, next) => {
  if(!req.ownerId) return res.status(401).send({ message: "Unauthorized" });
  next();
}

/*
 * requireCodeOwner
 * Description: Validates if the req.urlOwner and req.ownerId matches
 *              url is owned by the same user
 * 
 * Error:
 *   401 url is not owned by user
 *
 */
export const requireCodeOwner = (req, res, next) => {
  if(req.urlOwner != req.ownerId) return res.status(401).send({ message: "Unauthorized" });
  next();
}

/*
 * shortCodeExist
 * Description: Extracts urlId if URL shortcode exists in db
 *
 * Path Params:
 *   shortCode (string)
 * 
 * Success Response:
 *   req.urlId - id of the corresponding URL
 *   req.urlOwner - id of the url owner
 *
 * Error:
 *   404 invalid code
 *   500 server error
 *
 */
export const shortCodeExist = async (req, res, next) => {
  try {
    const shortCode = req.params.shortCode;

    const url = await prisma.url.findUnique({
      where: { shortCode },
      select: { id: true, ownerId: true }
    });

    if(!url) {
      return res.status(404).json({ message: "Invalid code "});
    }

    req.urlId = url.id;
    req.urlOwner = url.ownerId;
    next();

  } catch(error) {
    console.log(error);
    res.sendStatus(500);
  }
}

/*
 * identityMiddleware
 * Description: Extracts auth token if exist and valid, otherwise
 *              extracts the visitor token instead
 *
 * Cookie Params:
 *   token: JWT
 *   visitor: string
 *
 * Token Params:
 *   userId: string
 *   
 * Success Response:
 *   (1) if auth cookie exists and auth token is valid:
 *     req.userId
 *     req.ownerId
 *   (2) otherwise, if visitor cookie exists and
 *       visitor token is valid:
 *     req.visitorId
 *     req.ownerId
 *
 * Error:
 *   401 invalid token
 *   404 user/visitor not found
 *   500 server error
 *
 * Note:
 *   (1) new visitor id could have collisions 
 */

export const identityMiddleware = async (req, res, next) => {
  //AUTH-TOKEN LAYER

  const authToken = req.cookies.token;
  
  try {
    if(authToken) {
      const decoded = verifyToken(authToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, ownerId: true }
      });

      if(user) {
        req.userId = user.id;
        req.ownerId = user.ownerId;
        return next();
      }

      return res.status(404).json({ message: "User not found" });
    }

  } catch(error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid token" }); 
  }

  //VISITOR-COOKIE LAYER

  const visitToken = req.cookies.visitor;

  try {
    let visitor;
    if(!visitToken) {
      const cookieId = nanoid(15);      // collisions could happen
      visitor = await prisma.visitor.create({
        data: {
          cookieId,
          owner: { create: {} }
        },
        select: { id: true, cookieId: true, ownerId: true }
      });

      await setCookie(res, "visitor", { cookieId: visitor.cookieId }, 1000*60*60*24*365);

    } else {
      const decoded = verifyToken(visitToken);
      visitor = await prisma.visitor.findUnique({
        where: { cookieId: decoded.cookieId },
        select: { id: true, ownerId: true }
      });
    }

    if(visitor) {
      req.visitorId = visitor.id;
      req.ownerId = visitor.ownerId;
      return next();
    }

    return res.status(404).json({ message: "Visitor not found" });

  } catch(error) {
    console.log(error);
    res.sendStatus(500);
  }

  return res.sendStatus(401);
}
