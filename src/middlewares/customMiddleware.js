// Custom middleware template

export default (req, res, next) => {
  // TODO: Add your middleware logic here
  console.log('Middleware triggered:', req.method, req.url);
  next();
};
