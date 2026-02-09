import express from "express"
import { prisma } from "./prismaClient.js"
import { nanoid } from "nanoid"

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

app.get("/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;
  
  const url = await prisma.url.findUnique({
    where: { shortCode }
  });

  if(!url) {
    return res.status(404).json({ message: "Invalid code" })
  }

  res.redirect(url.origUrl);
})

app.post("/shorten", async (req, res) => {
  const origUrl = req.body.url;
  let shortCode = "";
  let isUnique = true;

  try {
  while(isUnique) {
    shortCode = nanoid(8);
    isUnique = await prisma.url.findUnique({
      where: { shortCode }
    });
    console.log(isUnique);
  }

  await prisma.url.create({
    data: { origUrl, shortCode }
  });

  res.json({ message: "Link was successfully shortened", shortCode });
  } catch(error) {
    console.log("Error: ", error);
    res.status(500).json({ message: "An error occurred, process was terminated" });
  }
});

app.delete("/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;

  try {
    await prisma.url.deleteMany({
      where: { shortCode }
    });

    return res.status(204).json({ message: "Shortened link was successfully disabled" });

  } catch(error) {
    console.log("Error: ", error);
    res.status(500).json({ message: "An error occurred, process was terminated" });
  }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
