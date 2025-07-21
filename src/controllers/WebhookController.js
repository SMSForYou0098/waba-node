import { ErrorExtractor } from "../../utils/ErrorHandler.js";

export const webHook = async (req, res) => {
  try {
    console.log('req', req.body);
    res.status(200).send("Received"); // You should respond to avoid hanging connections
  } catch (error) {
    console.error('Error:', ErrorExtractor(error));
    res.status(500).json({ error: ErrorExtractor(error) }); // Respond with error
  }
}
