const Category = require("../model/category");
const Product = require("../model/productModel"); //mongodb category model
const User = require("../model/userModel");
const Cart = require("../model/cartModel")
const Address = require("../model/addressModel");
const Order = require("../model/orderModel");
const Coupon = require("../model/couponModel");

// const Coupon = require("../model/couponModel");




// const { trusted } = require("mongoose");
// const mongoose = require('mongoose');
// const { log } = require("console");
// const product = require("../model/product");


//VIEW CART-------
const viewCart = async (req, res) => {
  console.log("viewCart", 16);
  try {
    const quantity = req.body.quantity
    console.log("cart count " + quantity)
    const userData1 = req.session.user_id;
    const categoryData = await Category.find()

    console.log(userData1, 20);
    const user = await User.findById(userData1).populate("cart.product_id");

    console.log(user, 23);
    if (!user) {
      throw new Error("User not found");
    }

    const categories = await Category.find();

    const cartData = user.cart;
    

    // Ensure that cartData is an array and not undefined
    if (!Array.isArray(cartData)) {
      cartData = [];
    }

    const cartItemCount = cartData.length;
    console.log('Cart Item Count:', cartItemCount);


    const subTotal = findSubTotal(cartData);


    res.render("users/cart", { userData1, categoryData, categories, subTotal, cartData, cartItemCount });

    

  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred");
  }
};
//global function to find cart subtotal
function findSubTotal(cartData) {
  let subTotal = 0; // Initialize the sum of products to 0


  // Loop through each item in the shopping cart and add its price * quantity to the sum
  for (let i = 0; i < cartData.length; i++) {
    subTotal += cartData[i].product_id.price * cartData[i].quantity;
  }
  return subTotal;
}


//ADD TO CART----------


const addToCart = async (req, res) => {
  try {
    if (req.session.user_id) {
      const userData1 = req.session.user_id;
      const categories = await Category.find();
      const productIds = req.body.productId;

      const quantity = 1;
      const productData = await Product.findById(productIds);

      const user = await User.findById(userData1);

      const existingCartItem = user.cart.find((item) => item.product_id == productIds);

      if (existingCartItem) {
        // If the product is already in the cart, increment the quantity.
        existingCartItem.quantity += quantity;
      } else {
        // If the product is not in the cart, add it to the cart.
        user.cart.push({ product_id: productIds, quantity: quantity });
      }

      const updatedUser = await user.save();
      req.session.user = updatedUser;

      return res.json({
        result: "success"
      });

    } else {
      return res.redirect("/login");
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      error: "An error occurred"
    });
  }
};
//REMOVE FROM CART------------------------
const deleteFromCart = async (req, res) => {
  try {
    const productId = req.query.id;

    const userData1 = req.session.user_id;

    const addressData = await User.findOneAndUpdate(
      { _id: userData1 },
      { $pull: { cart: { product_id: req.body.addressId } } },
      { new: true }
    );


    res.json({
      res: "success"

    });
  } catch (error) {
    console.log(error.message);
  }
};
const cartOperation = async (req, res) => {
  try {
    const userData1 = req.session.user_id;
    const a = req.body;
    const data = await User.find(
      { _id: userData1 },
      { _id: 0, cart: 1 }
    ).lean();
    data[0].cart.forEach((val, i) => {
      val.quantity = req.body.datas[i].quantity;
    });
    console.log('count product', 132 + req.body.datas[i].quantity)

    await User.updateOne(
      { _id: userData1._id },
      { $set: { cart: data[0].cart } }
    );

    res.json("from backend ,cartUpdation json");
  } catch (error) {
    console.log(error.message);
  }
};


const cartUpdation = async (req, res) => {

  try {
    const userId = req.session.user_id;
    const productIndex = Number(req.query.index);
    const quantity = req.body.quantity;

   
    if (quantity === "plus") {
      await User.updateOne(
        { _id: userId },
        { $inc: { [`cart.${productIndex}.quantity`]: 1 } }

      );
    } else if (quantity === "minus") {
      await User.updateOne(
        { _id: userId },
        { $inc: { [`cart.${productIndex}.quantity`]: -1 } }
      );
    }

    res.status(200).json({ message: "Cart updated successfully." });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "An error occurred while updating the cart." });
  }
};


//LOAD CHECKOUT
const loadCheckout = async (req, res) => {
  try {

    const userData1 = req.session.user_id;
    const user = await User.findOne({ _id: userData1 }).populate(
      "cart.product_id"
    );
    const cartData = user.cart;
    const categories = await Category.find();



    subTotal = findSubTotal(cartData);

    const address = await Address.find({ owner: userData1 });


    const addressData = address;

    const coupon=await Coupon.find();

    res.render("users/checkout", {
      userData1,
      cartData: cartData,
      subTotal,
      addressData: addressData,
      categories,
      coupon,
    });
  } catch (error) {
    console.log(error.message);
  }
};



const placeOrder = async (req, res) => {
  try {
   
    const userData1 = req.session.user_id;
   
    const user = await User.findOne({ _id: userData1 }).populate(
      "cart.product_id"
    );
    const cartData = user.cart;
    const paymentMethod = req.body.payment;
    const quantity = req.body.quantity;
   


    await Address.findOne({ _id: userData1 });


    const wallet = user.wallet;

    const cartItems = cartData.map((item) => ({
      product_id: item.product_id,
      quantity: req.body.quantity,
    }));


    let finalTotal;
    if (req.body.totalAfterDiscount) {
      finalTotal = req.body.totalAfterDiscount;
    } else {
      finalTotal = subTotal;
    }

    if (paymentMethod === "cashondelivery") {
      if (cartData.length > 0) {
        const order = new Order({
          owner: userData1,
          items: cartItems,
          shippingAddress: req.body.address,
          totalBill: finalTotal,
          status: req.body.status,
          paymentMode: paymentMethod,
          dateOrdered: req.body.dateOrdered,
          discountAmt: req.body.totalAfterDiscount,
          coupon: req.body.search,
        });
        await order.save();
        user.cart = [];
        await user.save();
        res.json({ codSuccess: true })
      } else {
        res.redirect("/shop");
      }
    } else if (paymentMethod === "razorpay") {
      if (cartData.length > 0) {
        const order = new Order({
          owner: userData1,
          items: cartItems,
          shippingAddress: req.body.address,
          totalBill: finalTotal,
          status: req.body.status,
          paymentMode: paymentMethod,
          dateOrdered: req.body.dateOrdered,
          discountAmt: req.body.totalAfterDiscount,
          coupon: req.body.search,
        });
        await order.save();
        // user.cart = [];
        const orderid = order._id;
        await user.save();

        res.json({ razorpay: true, order: order, bill: finalTotal })
      } else {
        res.redirect("/shop");
      }
    } else if (paymentMethod === "wallet") {

      if (cartData.length > 0) {
        // if (wallet >= finalTotal) {
        const order = new Order({
          owner: userData1,
          items: cartItems,
          shippingAddress: req.body.address,
          totalBill: finalTotal,
          status: req.body.status,
          paymentMode: paymentMethod,
          dateOrdered: req.body.dateOrdered,
          discountAmt: req.body.totalAfterDiscount,
          coupon: req.body.search,
        });

       

        await order.save();


        // Deduct the amount from the user's wallet
        user.wallet -= finalTotal;
        await user.save();

        console.log(user.wallet, "user.wallet", 467);
        user.cart = [];
        await user.save();

        console.log(user.cart, "user.cart", 471)

        res.json({ codeSuccess: true })
        //res.json({ wallet: true, order, bill: finalTotal });

      } else {
        res.redirect("/shop");
      }
    }

  } catch (error) {
    console.log(error.message);
  }
};


//ORDER SUCCESS
const loadOrderSuccess = async (req, res) => {
  try {
   
    const userData1 = req.session.user_id;
    const shippingAddress = req.body.address1
    const user = await User.findOne({ _id: userData1 }).populate(
      "cart.product_id"
    );
    
    user.cart = [];
    await user.save();
    res.render("users/ordersuccess", { userData1 });
  } catch (error) {
    console.log(error.message);
  }
};
const couponCheck = async (req, res) => {
  try {

    const userData1 = req.session.user_id;
    let coupon = req.query.couponval.trim();
    let total = req.query.total.trim()

    const couponData = await Coupon.findOne({ code: coupon })
    if (!couponData || couponData.length === 0) {
      res.json({ message: `invalid coupon` })
    } else if (couponData.status == "inactive") {
      res.json({ message: `invalid coupon` })
    } else if (parseFloat(total) < couponData.minBill) {
      res.json({ message: `Minimum bill amount is Rs${couponData.minBill}` })
   // }// else if (couponData.userid.includes(userData1._id)) {
    //   res.json({ message: `coupon already user` })
    } else {
      const discount = couponData.discount;
      const newTotal = parseFloat(total) - discount;
      couponData.userid.push(userData1._id);
      await couponData.save()
      res.json({
        message: "coupon applied sucessfully",
        newTotal,
        discount,
        success: true
      })
    }


  } catch (error) {
    console.log(error.message);
  }
}
const orderPayment = async (req, res) => {
  try {
    const userData1 = req.session.user_id;
    const instance = new Razorpay({
      key_id: "rzp_test_leh2a0T9Cta0qV",
      key_secret: "cUTMlosQ67l2jPuUgpYd2OnM",
    });

    const { amount } = req.body; // Check if this value is being received correctly
    let options = {
      amount: amount, // Amount in the smallest currency unit (req.body.amount)
      currency: "INR",
      receipt: "rcp1",
    };
    instance.orders.create(options, function (err, order) {
      if (err) {
        console.log(err.message);
        return res.status(500).json({ error: "Failed to create order" });
      }

      res.send({ orderId: order.id }); // Extract the id value and send it to checkout
    });
  } catch (error) {
    console.log(error.message)
  }
}

//PAYMENT VERIFY

const paymentverify = async (req, res) => {
  let body =
    req.body.response.razorpay_order_id +
    "|" +
    req.body.response.razorpay_payment_id;

  let crypto = require("crypto");
  let expectedSignature = crypto
    .createHmac("sha256", "cUTMlosQ67l2jPuUgpYd2OnM")
    .update(body.toString())
    .digest("hex");
  let response = { signatureIsValid: "false" };
  if (expectedSignature === req.body.response.razorpay_signature)
    response = { signatureIsValid: "true" };
  res.send(response);
};

const coupenshow = async (req, res) => {
  try {
    const userData1 = req.session.user_id;
    const couponData = await Coupon.find();
    res.render('users/coupons', { couponData, userData1 })
  } catch (error) {
    console.log(error.message);
  }
}





module.exports = {
  addToCart,
  viewCart,
  deleteFromCart,
  cartUpdation,
  cartOperation,
  loadCheckout,
  placeOrder,
  loadOrderSuccess,
  couponCheck,
  orderPayment,
  paymentverify,
  coupenshow,
}