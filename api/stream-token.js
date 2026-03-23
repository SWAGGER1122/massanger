import { StreamClient } from "@stream-io/node-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  const client = new StreamClient(
    process.env.STREAM_API_KEY,
    process.env.STREAM_SECRET
  );

  const token = client.createToken(userId);

  return res.status(200).json({ token });
}