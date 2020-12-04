module.exports = (req, res, next) => {
  if (!req.session.user.isAdmin) {
    req.flash("error", "You are not an admin!");
    return res.redirect("/");
  }
  next();
};
