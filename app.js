const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", "views");
const User = require("./models/user");
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const errorController = require("./controllers/error");

app.use((req, res, next) => {
  User.findById("61291820f2e956a6c799e867")
    .then((user) => {
      req.user = user;
      next();
    })
    .catch((err) => {
      console.log(err);
    });
});
app.use("/admin", adminRoutes);
app.use("/", shopRoutes);

app.use(errorController.get404);
mongoose
  .connect(
    "mongodb+srv://ritvika30:Perfect99@cluster0.b5wiw.mongodb.net/shop?retryWrites=true&w=majority"
  )
  .then((result) => {
    console.log("Connection");
    User.findOne().then((user) => {
      if (!user) {
        const user = new User({
          name: "Ritvika",
          email: "ritvika@gmail.com",
          cart: {
            items: [],
          },
        });
        user.save();
      }
    });
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
