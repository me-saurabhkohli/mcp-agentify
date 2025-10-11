// Next.js dynamic API route
export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    return res.status(200).json({ order: { id } });
  }
  
  if (req.method === 'PUT') {
    return res.status(200).json({ message: `Order ${id} updated` });
  }
  
  if (req.method === 'DELETE') {
    return res.status(200).json({ message: `Order ${id} deleted` });
  }
  
  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}