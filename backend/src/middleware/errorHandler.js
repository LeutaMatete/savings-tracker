function notFound(req, res, next) {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'A related record could not be found' });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token, please log in again' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Your session expired, please log in again' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong. Please try again.';

  res.status(statusCode).json({ error: message });
}

module.exports = { notFound, errorHandler };