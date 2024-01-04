const Admin = require('../model/adminModel')
const User = require('../model/userModel')
const Category = require('../model/category')
const Product = require('../model/productModel')
const Order = require("../model/orderModel");
const Coupon = require('../model/couponModel')
const Offer = require('../model/offerModel')

const loadLogin = async (req, res) => {
  try {

    res.render("admin/login")

  } catch (error) {
    console.log(error.message);
  }
}


const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    if (email != "" && password != "") {
      const adminData = await Admin.findOne({ email: email })
      console.log(adminData, 38);
      if (adminData) {
        req.session.admin_id = adminData._id;
        req.session.admin = true;
        res.redirect("admin/dashboard")
      } else {
        req.session.admin = false;

        res.render('admin/login', { message: "Email and password is incorrect" });
      }
    }
  } catch (error) {
    console.log(error.message);
  }
}




const usersList = async (req, res) => {
  try {

    const userData = await User.find()
    if (userData) {
      res.render('admin/users', { users: userData });
    } else {
      res.redirect('admin/dashboard');
    }

  } catch (error) {
    console.log(error.message);
  }
}

const blockUser = async (req, res) => {


  try {
    const blockid = req.query.id;
    const blockUserData = await User.findById(blockid);

    const block_status = blockUserData.is_blocked;

    await User.findByIdAndUpdate(
      blockid,
      { $set: { is_blocked: !block_status } },
      { new: true }
    );
    res.redirect("/admin/users");
  } catch (error) {
    console.log(error.message);
  }
}

const listProduct = async (req, res) => {
  try {
    const productData = await Product.find();
    const categoryData = await Category.find();
    res.render('admin/product', { product: productData, categoryData })

  } catch (error) {
    console.log(error.message);
  }
}
const logout = async (req, res) => {
  try {


    req.session.admin = false;
    req.session.destroy()
    res.redirect('/admin')
  } catch (error) {
    console.log(error.message);
  }
}

// ORDER MANAGEMENT
const orderHistory = async (req, res) => {
  try {
    //const orderData = await Order.find({ owner: userData1._id }).populate('items.product_id').populate('shippingAddress')

    const userData1 = req.session.user_id;

    const orderData = await Order.find()
      .populate("items.product_id")
      .populate("shippingAddress")
      .sort({ dateOrdered: -1 });

    console.log(orderData, "oorrddeerrr");

    res.render("admin/order", { order: orderData });
  } catch (error) {
    console.log(error.message);
  }
};







//ADMIN
const orderHistoryInside = async (req, res) => {
  try {
    const id = req.query.id;
    const orderDetail = await Order.findById(id)
      .populate("items.product_id")
      .populate("shippingAddress");

    res.render("admin/orderdetails", { orderDetail });
  } catch (error) {
    console.log(error.message);
  }
};

//ORDER STATUS CHANGE FOR ADMIN
const orderHistoryStatusChange = async (req, res) => {
  try {
    const orderId = req.body.id;
    const newStatus = req.body.status_change;
    await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: newStatus } },
      { new: true }
    );
    res.redirect("back"); // used to redirect the user back to the previous page after the update is complete.
  } catch (error) {
    console.log(error.message);
  }
};



//LOAD ADD COUPON
const loadAddCoupon = async (req, res) => {
  try {
    // const couponData = await Coupon.find();
    res.render("admin/addcoupon");
  } catch (error) {
    console.log(error.message);
  }
};

//ADD COUPON
const addCoupon = async (req, res) => {
  try {

    const name = req.body.code;

    const nameLo = name.toLowerCase();
    const couponData = await Coupon.findOne({ code: nameLo });

    if (
      Object.values(req.body).some(
        (value) => !value.trim() || value.trim().length === 0
      )
    ) {
      res.render("admin/addcoupon", { message: "please fill the field" });
    }


    if (couponData) {
      res.render("admin/addcoupon", { message: "Coupon exists" });
    } else {

      const inputDate = req.body.expiryDate; // assuming input is in yyyy-mm-dd hh:mm:ss format

      const coupon = new Coupon({
        code: req.body.code,
        discount: req.body.discount,
        expiryDate: inputDate,
        minBill: req.body.minBill,
        status: req.body.status,
      });
      await coupon.save();
      res.redirect("/admin/coupon");
    }

  } catch (error) {
    console.log(error.message);
  }
};



//LIST COUPON
const couponList = async (req, res) => {
  try {
    const couponData = await Coupon.find();
    res.render("admin/coupon", { couponData });
  } catch (error) {
    console.log(error.message);
  }
};

const offershow = async (req, res) => {
  try {
    console.log("entereddddddd")
    const categoryData = await Category.find();

    console.log(categoryData, "aaaaaaaaaaa")
    res.render('admin/addoffer', { categoryData })
  } catch (error) {
    console.log(error.message);
  }
}
const submitOffer = async (req, res) => {
  try {
    console.log("entered to submitOffer")
    const discount = req.body.discount;
    const category = req.body.category;
    const status = req.body.status;


    const offerUpdate = new Offer({
      discount,
      category,
      status
    });
    await offerUpdate.save();
    console.log(offerUpdate, "offerupdateeee")

    const productsToUpdate = await Product.find({ category: category });
    console.log(productsToUpdate, "producttttttt")

    // Update prices for each product in the category
    for (let i = 0; i < productsToUpdate.length; i++) {
      const oldPrice = productsToUpdate[i].price;
      console.log(oldPrice, "old priceeeee");
      const finalDiscount = (discount / 100) * oldPrice;
      console.log(finalDiscount, "final discount")
      const offerPrice = oldPrice - finalDiscount;
      console.log(offerPrice)

      // Update the price for the current product
      await Product.findOneAndUpdate(
        { _id: productsToUpdate[i]._id },
        { $set: { price: offerPrice } },
        { new: true }
      );
    }

    res.render('admin/addoffer', { message: "Offer added successfully" });
  } catch (error) {
    console.log(error.message);
  }
}


module.exports = {
  loadLogin,
  verifyLogin,
  // home,
  usersList,
  blockUser,
  listProduct,
  logout,


  orderHistory,
  orderHistoryInside,
  orderHistoryStatusChange,

  loadAddCoupon,
  addCoupon,
  couponList,
  submitOffer,
  offershow,

}