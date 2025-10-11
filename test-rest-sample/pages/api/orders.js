// Next.js API routes example
export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ orders: [] });
  }
  
  if (req.method === 'POST') {
    return res.status(201).json({ message: 'Order created' });
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}