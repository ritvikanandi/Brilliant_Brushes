const path = require("path");
const express = require("express");
const adminController = require("../controllers/admin");
const isAuth = require("../middleware/isAuth");
const isAdmin = require("../middleware/isAdmin");
const router = express.Router();

router.get("/add-product", isAuth, isAdmin, adminController.getAddProduct);
router.get("/products", isAuth, isAdmin, adminController.getProducts);
router.post("/add-product", isAuth, isAdmin, adminController.postAddProduct);

router.get(
  "/edit-product/:productId",
  isAuth,
  isAdmin,
  adminController.getEditProduct
);

router.post("/edit-product", isAuth, isAdmin, adminController.postEditProduct);

router.post(
  "/delete-product",
  isAuth,
  isAdmin,
  adminController.postDeleteProduct
);

module.exports = router;
