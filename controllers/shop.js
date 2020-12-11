const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Product = require("../models/product");
const Order = require("../models/order");
const stripe = require("stripe")(`${process.env.STRIPE_KEY}`);

const items_per_page = 4;
exports.getProducts = (req, res, next) => {
  if (!req.user) {
    const page = +req.query.page || 1;
    let totalItems;
    Product.find()
      .countDocuments()
      .then((numProducts) => {
        totalItems = numProducts;
        return Product.find()
          .skip((page - 1) * items_per_page)
          .limit(items_per_page);
      })
      .then((products) => {
        res.render("shop/product-list", {
          prods: products,
          pageTitle: "All Paintings",
          path: "/products",
          currentPage: page,
          hasNextPage: items_per_page * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage: page - 1,
          lastPage: Math.ceil(totalItems / items_per_page),
        });
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    const page = +req.query.page || 1;
    let totalItems;
    Product.find({
      userId: { $ne: req.user._id },
    })
      .countDocuments()
      .then((numProducts) => {
        totalItems = numProducts;
        return Product.find({
          userId: { $ne: req.user._id },
        })
          .skip((page - 1) * items_per_page)
          .limit(items_per_page);
      })
      .then((products) => {
        res.render("shop/product-list", {
          prods: products,
          pageTitle: "All Paintings",
          path: "/products",
          currentPage: page,
          hasNextPage: items_per_page * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage: page - 1,
          lastPage: Math.ceil(totalItems / items_per_page),
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }
};
exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-details", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.getIndex = (req, res, next) => {
  res.render("shop/index", {
    pageTitle: "Shop",
    path: "/",
    errorMessage: req.flash("error"),
    success: req.flash("success"),
  });
};
exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
        errorMessage: req.flash("error"),
        success: req.flash("success"),
      });
    })
    .catch((err) => console.log(err));
};
exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      req.flash("success", "Added to cart successfully!");
      res.redirect("/cart");
    });
};
exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      req.flash("error", "Painting deleted from cart!");
      res.redirect("/cart");
    })
    .catch((err) => console.log(err));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((item) => {
        return {
          quantity: item.quantity,
          product: { ...item.productId._doc },
        };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      req.flash("success", "Order saved!");
      res.redirect("/orders");
    })
    .catch((err) => console.log(err));
};
exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((item) => {
        return {
          quantity: item.quantity,
          product: { ...item.productId._doc },
        };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      req.flash("success", "Payment received!");
      res.redirect("/orders");
    })
    .catch((err) => console.log(err));
};
exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
        errorMessage: req.flash("error"),
        success: req.flash("success"),
      });
    })
    .catch((err) => console.log(err));
};
exports.getCheckout = (req, res, next) => {
  let products;
  let total = 0;
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      products = user.cart.items;
      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((p) => {
          return {
            name: p.productId.title,
            description: p.productId.description,
            amount: p.productId.price * 100,
            currency: "inr",
            quantity: p.quantity,
          };
        }),
        mode: "payment",
        success_url:
          req.protocol + "://" + req.get("host") + "/checkout/success",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      });
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Your Cart",
        products: products,
        totalSum: total,
        errorMessage: req.flash("error"),
        success: req.flash("success"),
        sessionId: session.id,
      });
    })
    .catch((err) => console.log(err));
};
exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId).then((order) => {
    if (!order) {
      return next(new Error("Order not found"));
    }
    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error("Unauthorized!"));
    }
    const invoiceName = "invoice-" + orderId + ".pdf";
    const invoicePath = path.join("data", "invoices", invoiceName);

    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="' + invoiceName + '"'
    );
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text("Invoice", {
      underline: true,
    });
    pdfDoc.text("---------------------");
    let total = 0;
    order.products.forEach((prod) => {
      total += prod.quantity * prod.product.price;
      pdfDoc
        .fontSize(14)
        .text(
          prod.product.title +
            " - " +
            prod.quantity +
            " x " +
            "Rs." +
            prod.product.price
        );
    });
    pdfDoc.text("---------");
    pdfDoc.fontSize(20).text("Total Price(Rs.) - " + total);
    pdfDoc.end();
  });
};
