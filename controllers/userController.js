const User = require('../model/userModel')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const Category = require("../model/category");
const Product = require("../model/productModel");
const Address = require("../model/addressModel");
const Order = require("../model/orderModel")
const Coupon=require("../model/couponModel")
const randomstring = require("randomstring")
const PDFDocument= require("pdfkit")




const loadHome = async (req, res) => {
    
    try {
        const categoryData=await Category.find()
        const productData=await Product.find()
        res.render('users/home',{ isLogged: req.session.userName,categoryData,productData})

    } catch (error) {
        console.log(error.message);
    }
 }

 const loadRegister = async (req, res) => {
    try {
        res.render('users/registration')
    } catch (error) {
        console.log(error.message);
    }

}

// USER INSERT (ADDING)--------
const insertUser = async (req, res) => {
    try {
    
        const name = req.body.name
        const email = req.body.email
       
        userRegData = req.body
        
        const existUser = await User.findOne({ email: email })

        if (existUser == null) {
          
            await sendVerifyMail(name, email)
            res.redirect('/otpverification')

        }
        else {
            if (existUser.email == email) {
                res.render('users/registration', { message1: 'User Alredy Exist' })
            }
        }
    }
    catch (error) {
        console.log(error.message)
    }
}

const loadverifyotp = async (req, res) => {

    try {
     
        res.render('users/otpverification')
    } catch (error) {
        console.log(error.message);
    }
}

// ...................send verify mail       ......
let userRegData;
function generateOTP(){
return otp = `${Math.floor(1000 + Math.random() * 90000)}`
}


const sendVerifyMail = async (name, email, res) => {
    
    try {
     
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        service:'gmail',
        auth: {
            user:"sreeragsree198@gmail.com",
            pass:"ejdg ettl gtlv oknt"
        }

       
        
      });
      const otp = generateOTP(); // Assuming you have a function to generate the OTP

      
      const mailOptions = {
        from: "sreeragsree198@gmail.com",
        to: email,
        subject: 'Verification Email',
        text: `${otp}`
      }
  
  
      const info = await transporter.sendMail(mailOptions);
      console.log(info, 54);
      console.log("Email has been sent:", info.response);
      res.redirect("/otpverification");
    
      return otp;
     
    } catch (error) {
      console.log("Error while sending email:", error);
      console.log(error.message);
    }
  };


  const verifyotp = async (req, res) => {
   
      try {
          
          const password = await bcrypt.hash(userRegData.password, 10);
          const enteredotp = req.body.otp;
         
          if (otp == enteredotp) {
              const user = new User({
                  name: userRegData.name,
                  mobile: userRegData.mobile,
                  email: userRegData.email,
                  password: password,
                  is_blocked: false,
                  is_verified: 1,
                  is_admin: 0
              })
              const userData = await user.save();
              res.redirect('login' )
          }
          else {
              res.render('users/otpverification', { message1: "Invalid otp" })
          }
      }
      catch (error) {
          console.log(error.message);
      }
  }
  
  const loginLoad = async (req, res) => {
    try {
        
        if (req.session.user_id) {
            res.redirect('/home')
        } else {
            res.render('users/login')
        }

    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({ email: email })
        
        if (userData) {
            const is_blocked = userData.is_blocked

                if(is_blocked===true){
                    res.render('users/login', { message: "User is already blocked" })
                    }
            req.session.userName = userData.name
            const passwordMatch = await bcrypt.compare(password, userData.password)
            
            if (passwordMatch) {
                if (userData.is_verified === 0) {
                    res.render('users/login', { message1: "Please verify your mail" })
                } else {
                    req.session.user_id = userData._id;
                    res.redirect('/home')
                }
            } else {
                res.render('users/login', { message2: "Email and password is incorect" })
            }
        } else {
            res.render('users/login', { message3: "Email and password is incorect" })
        }

    } catch (error) {
        console.log(error.message);
    }
}




  //DOWNLOAD INVOICE
  const invoiceDownload = async (req, res) => {
    try {
      const id = req.query.id;
      const order = await Order.findOne({ _id: id })
        .populate("items.product_id")
        .populate("shippingAddress");
  
      if (!order) {
        return res.status(404).send("Order not found");
      }
  
      // Create a new PDF document
      const doc = new PDFDocument({ font: "Helvetica" });
  



      // Set the response headers for downloading the PDF file
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="invoice-${order._id}.pdf"`
      );
  
      // Pipe the PDF document to the response
      doc.pipe(res);
     
      // Add the order details to the PDF document
      doc
        .fontSize(18)
        .text(`E-BUY  INVOICE`, { align: "center", lineGap: 20 }); // increase line gap for better spacing
  
      doc.moveDown(2); // move down by 2 lines
  


      doc.fontSize(12).text(
        `Ordered Date: ${order.dateOrdered.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
Time:${order.dateOrdered.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
        })}`,
        { lineGap: 10 } // increase line gap for better spacing
      );


      doc
        .fontSize(10)
        .text(`Order ID: ${order._id}`, { align: "left", lineGap: 10 }); // decrease line gap for tighter spacing
      doc.moveDown();
      doc.fontSize(12).text("Product Name", { width: 380, continued: true });
      doc
        .fontSize(12)
        .text("Price", { width: 100, align: "center", continued: true });
      doc.fontSize(12).text("Qty", { width: 50, align: "right" });
      doc.moveDown();
  
      let totalPrice = 0;
      order.items.forEach((item, index) => {
        doc
          .fontSize(12)
          .text(`${index + 1}. ${item.product_id.name}`, {
            width: 375,
            continued: true,
          });
  
        const totalCost = item.product_id.price * item.quantity;
        doc
          .fontSize(12)
          .text(`${totalCost}`, { width: 100, align: "center", continued: true });
  
        doc.fontSize(12).text(`${item.quantity}`, { width: 50, align: "right" });
        doc.moveDown();
        totalPrice += totalCost;
      });
  
      doc.moveDown(2); // move down by 2 lines
  
      doc.fontSize(12).text(`Subtotal: Rs ${totalPrice}`, { align: "right" });
      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Total Amount after discount: Rs ${order.totalBill}`, {
          align: "right",
        });
      doc.moveDown();
     
      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Payment Method: ${order.paymentMode}`, { lineGap: 10 });
      doc.moveDown();
      // doc.fontSize(12).text(`Coupon : ${order.coupon}`, { lineGap: 10 });
      // doc.moveDown();
     
      doc
        .fontSize(12)
        .text(
          `Shipping Address:\n ${order.shippingAddress.name},\n${order.shippingAddress.mobile},\n${order.shippingAddress.address1},\n${order.shippingAddress.address2},\n${order.shippingAddress.city}`,
          { lineGap: 10 }
        );
      doc.moveDown();
      doc.fontSize(12).text(`Order Status: ${order.status}`, { lineGap: 10 });
  
      doc.moveDown(2); // move down by 2 lines
  
      doc
        .fontSize(14)
        .text("Thank you for purchasing with us!", {
          align: "center",
          lineGap: 20,
        });
  
      doc.moveDown(); // move down by 1 line
  
      // End the PDF document
      doc.end();
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  };
  
//USER LOG-OUT----------------------------------------
const userLogout = async (req, res) => {
    try {

        req.session.destroy()
        res.redirect('/')

    } catch (error) {
        console.log(error.message);
    }
}

///--CATEGORY NN PRODUCT LIST CHEYYUM--
const loadCategoryProducts = async (req,res)=>{
    try{
       const categoryData=await Category.find();
        const productId=req.query.id
        const productData=await Product.find({category:productId})
        res.render('users/shop',{isLogged: req.session.userName,productData:productData,categoryData})

    }catch(error){
        console.log(error.message);
    }
}

//----SINGLE PRODUCT LOAD -----
const loadDeatails=async(req,res)=>{
    try {
        const categories=await Category.find();
        const id=req.query.id
        const userData1=req.session.user_id;
        let productData=await Product.findById(id);
        res.render("users/detail",{isLogged: req.session.userName,productData:productData,userData1,categories })
    } catch (error) {
        console.log(error.message);
    }
}
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


  const loadShop = async(req, res)=>{
    try {
        var cartItemCount
        const categoryData = await Category.find();
        const productData = await Product.find();
        User.findById({_id: req.session.user_id})
      .then(user => {
        if (user) {
           cartItemCount = user.cart.length;
          console.log('Cart Item Count:', cartItemCount);
        }})
        
    
        let search = '';
        if (req.query.search) {
          search = req.query.search;
    
          const shopData = await Product.find({
            is_blocked: false,
            name: { $regex: ".*" + search + ".*", $options: "i" }
          });
    
          if (shopData.length > 0) {
            res.render("users/shop", {
              isLogged: req.session.userName,
              productData: shopData,
              cartItemCount:cartItemCount,
              categoryData: categoryData
            });
            return; // Return early to prevent further execution
          }
        }
    
        let page = 1; // Default to page 1 if not provided
        if (req.query.page) {
          page = parseInt(req.query.page); // Parse page number to integer
        }
        
        const limit = 9;
        const skip = (page - 1) * limit;
        
        const query = {
          is_blocked: false,
          name: { $regex: new RegExp(search, "i") } // Use RegExp constructor instead of string concatenation
        };
        
        const [shopData, count] = await Promise.all([
          Product.find(query).limit(limit).skip(skip), // Fetch paginated data
          Product.countDocuments(query) // Count total documents matching the query
        ]);
        
        const totalPages = Math.ceil(count / limit);
        
        res.render("users/shop", {
          isLogged: req.session.userName,
          productData: shopData,
          totalPages: totalPages,
          currentPage: page,
          categoryData: categoryData,
          previousPage: page > 1 ? page - 1 : null, // Set previousPage to null for first page
          nextPage: page < totalPages ? page + 1 : null // Set nextPage to null for last page
        });
        
    
        res.render("users/shop", {
          isLogged: req.session.userName,
          productData: productData,
          categoryData: categoryData
        });
      } catch (error) {
        console.log(error.message);
      }
    };

    //USER-ADDRESSS---------------------------------------------------------------------------------------------

//LOAD ADDRESSES
const loadAddress = async (req, res) => {
  try {
    const categoryData = await Category.find();
    const userData1 = req.session.user_id;
    const addressData = await Address.find({ owner: userData1 });

    res.render("users/address", {
      userData1,
      addressData: addressData,
      categoryData: categoryData
    });
  } catch (error) {
    console.log(error.message);
  }
};


//LOAD ADD ADDRESS
const loadAddAddress = async (req, res) => {
  try {
    const categoryData = await Category.find();
    const userData1 = req.session.user_id;
    res.render("users/addaddress", { userData1,categoryData });
  } catch (error) {
    console.log(error.message);
  }
};



//POST ADD ADDRESS
const addAddress = async (req, res) => {

  try {
    const categoryData = await Category.find();
    const userData1 = req.session.user_id;
    if (
      //null validation
      Object.values(req.body).some(
        (value) => !value.trim() || value.trim().length === 0
      )
    ) {
      res.render("users/addaddress", {categoryData, message1: "Please fill the field" });
    } else {
      const address = new Address({
        owner: userData1,
        name: req.body.name,
        mobile: req.body.mobile,
        address1: req.body.address1,
        address2: req.body.address2,
        city: req.body.city,
        state: req.body.state,
        pin: req.body.pin,
        country: req.body.country,
      });
      const addressData = await address.save();
      if (addressData) {
        res.redirect("/address");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};




//LOAD EDIT ADDRESS
const loadEditAddress = async (req, res) => {
  try {
    const categoryData = await Category.find();
    const userData1 = req.session.user_id;
    const id = req.query.id;
    const addressData = await Address.findById(id);

    res.render("users/editaddress", { userData1, addressData ,categoryData});
  } catch (error) {
    console.log(error.message);
  }
};

//EDIT ADDRESS
const editAddress = async (req, res) => {
  try {
    const categoryData = await Category.find();
    const id = req.body.id;
    await Address.findByIdAndUpdate(
      { _id: id },
      {
        name: req.body.name,
        mobile: req.body.mobile,
        address1: req.body.address1,
        address2: req.body.address2,
        city: req.body.city,
        state: req.body.state,
        pin: req.body.pin,
        country: req.body.country,
      },
      { new: true }
    );
    res.redirect("/address",{categoryData});
  } catch (error) {
    console.log(error.message);
  }
};



//DELETE ADDRESS
const deleteAddress = async (req, res) => {
  try {
    const id = req.query.id;
    await Address.findByIdAndDelete({ _id: id });
    res.redirect("/address");
  } catch (error) {
    console.log(error.message);
  }
};


//USER-PROFILE-----------------------------------------

//USER PROFILE LOAD
const loadProfile = async (req, res) => {
  try {
    const categoryData = await Category.find();
    const userData1 = req.session.user_id;
    const id = userData1;
    const wallet = await User.findById({_id:id})
    const userData = await User.findById(id);
    const currentBalance=userData.wallet

    console.log(currentBalance,"currentBalance",798);


    if (!userData) {
      res.redirect("/logout");
    } else {
      const categories = await Category.find();

      console.log(categories, 383, "ind");

      res.render("users/profile", {
        userData,
        userData1,
        categories,
        currentBalance,
        isLogged: req.session.userName,
       wallet:wallet.wallet,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};



//LOAD EDIT PROFILE----------------------------------

const loadEditProfile = async (req, res) => {
  try {
    const categoryData = await Category.find();
    const userData1 = req.session.user_id;

    const id = req.query._id;

    const userData = await User.findById({_id:req.session.user_id});
    
    res.render("users/editprofile", {
      userData: userData,
      userData1,
      categoryData
    });

    console.log("loadEditProfile",userData,415);
  } catch (error) {
    console.log(error.message);
  }
};



//USER PROFILE EDIT------------------
const editProfile = async (req, res) => {
  
  try {
    const categoryData = await Category.find();
    const userData1 = req.session.user_id;

    const id = req.body.id;

    console.log(req.body.id,426);

    if (!id) {
      throw new Error('Invalid user ID');
    }

    const userData = await User.findByIdAndUpdate(
      {_id:id},
      {
        name: req.body.name,
        email: req.body.mail,
        mobile: req.body.mobile,
      },
      { new: true }
    );
 
    res.render("users/profile", { userData, userData1 ,categoryData});
  } catch (error) {
    console.log(error.message);

    res.status(500).send('Internal Server Error');
  }
};
//------------------------------------------------------
  
//forget password-------------------------------------------------------------



const forgetLoad = async (req, res) => {
  try {
      res.render('users/forget')

  } catch (error) {
      console.log(error.message);
  }
}








const forgetVerify = async (req, res) => {

 
  try {

      resetMail = req.body.email;
      const userData = await User.findOne({ email: resetMail })
      
      if (userData) {
          
          if (userData.is_verified === 0) {
              res.render('users/forget', { message: "Please verify your email " })


          } else {

              const rendomString = randomstring.generate();
              const updatedData = await User.updateOne({ email: resetMail }, { $set: { token: rendomString } });
              sendResetPasswordMail(userData.name, userData.email, rendomString);
              res.redirect('/otpforgotpassword')
          }
      } else {

          res.render('users/forget', { message: "User email is incorrect" })

      }

  } catch (error) {
      console.log(error.message);
  }
}

const forgetPasswordOtpLoad=async(req,res)=>{
console.log("forgetPasswordOtpLoad")
  try {
      res.render('users/otpforgotpassword')
  } catch (error) {
      console.log(error.message);
  }
}

const forgetVerifyotp=async(req,res)=>{
console.log("forgetVerifyotp");
  const forgototp=req.body.otp
  console.log(forgototp);
  try {
      if(otp==forgototp){
          res.render('users/resetpassword1')
      }else{
        res.render( 'users/otpforgotpassword', { message: 'Entered otp wrong' });

      }
  } catch (error) {
      console.log(error.message);
  }
}

const loadresetpassword=async(req,res)=>{
  try {
      res.render('users/resetpassword1')
  } catch (error) {
      console.log(error.message);
  }
}


const resetpassword = async (req, res) => {
  // Get the email and new password from the request body
  const password  = req.body.password

  try {
    // Hash the new password using your `securePassword` function
    const hashedPassword = await securePassword(password);

    // Find the user by their email and update their password
    const user = await User.updateOne({ email: resetMail }, { $set: { password: hashedPassword } });

    // If the user was found and their password was updated successfully, redirect to the login page
    if (user) {
      resetMail=null
      res.redirect('/login',{message12:'PASSWORD SUCCESSFULLY CHANGED'});
    } else {
      // If the user was not found, render an error page
      res.render('error', { message: 'User not found' });
    }
  } catch (error) {
    console.log(error.message);
    // If there was an error, render an error page with the error message
    //res.render('error', { message: error.message });
  }
};




const forgetPasswordLoad = async (req, res) => {
  try {

      const token = req.query.token;
      const tokenData = await User.findOne({ token: token });
      if (tokenData) {
          res.render('forget-password', { user_id: tokenData_id })
      } else {
          res.render('404', { message: "Tokken is invalid" })
      }
  } catch (error) {
      console.log(error.message);
  }
}

//----
const resetPassword = async (req, res) => {
  try {
      const password = req.body.password;
      const user_id = req.body.user_id;

      const secure_Password = await securePassword(password);

      const updateData = await User.findByIdAndUpdate({ _id: user_id }, { $set: { password: secure_Password, token: '' } })

      res.redirect("/login")
  } catch (error) {
      console.log(error.message);
  }
}  
const securePassword = async (password) => {
  try {

      const passwordHash = await bcrypt.hash(password, 10);
      return passwordHash;

  } catch (error) {
      console.log(error.message);
  }
}


///ORDER HISTORY
const orderHistory = async (req, res) => {
  try {
    const userData1 = req.session.user_id;
    const orderData = await Order.find({ owner: userData1})
      .populate("items.product_id")
      .populate("shippingAddress")
      .sort({ dateOrdered: -1 });

      console.log(orderData);
    res.render("users/orderhistory", { userData1, orderData });
  } catch (error) {
    console.log(error.message);
  }
};



//LOAD ORDER HISTORY DETAILS
const orderHistoryDetails = async (req, res) => {
  try {
    const userData1 = req.session.user_id;

    // const orderData = await Order.find({ owner: userData1._id }).populate('items.product_id').populate('shippingAddress')
    // console.log('this is zorerdata');
    // console.log(orderData);
    // console.log('this is zoorderdatas items');
    // const obj=orderData.items
    // console.log(obj);

    const id = req.query.id;
    const orderDetail = await Order.findById(id)
      .populate("items.product_id")
      .populate("shippingAddress")
      .populate("owner");
    //const itemsData = orderDetail.items;

    console.log(orderDetail.status,880,"orderDetail");                                   

    res.render("users/orderhistorydetails", {
      userData1,
      orderDetail,
    });
  } catch (error) {
    console.log(error.message);
  }
};


//for reset send mail function--------------------------------------------------------------------------
const sendResetPasswordMail = async (name, email, token) => {
  try {

    console.log("sendResetPasswordMail",89);

      const transporter = nodemailer.createTransport({
        service:'gmail',
        auth: {
          user: "sreeragsree198@gmail.com",
          pass: "ejdg ettl gtlv oknt"
        }
      });
      console.log(transporter,"transporter",98);

      const otp = generateOTP(); // Assuming you have a function to generate the OTP
      console.log(otp,"otp",101);
      
      const mailoptions = {
        from: "sreeragsree198@gmail.com",
        to: email,
          subject: 'for Reset Password mail',
          text: `${otp}`
          
          //html: '<p>hii' + name + ', please click to <a href="http://127.0.0.1:3000/forget-password?token=' + token + '">Reset  </a> your password</p>'

      }
      console.log(mailoptions,"mailoptions",110);
      transporter.sendMail(mailoptions, function (error, info) {
          if (error) {
              console.log("error while sending email:" , error)
          }
          else {
              console.log("Email has been sent:", info.response);
              res.redirect("/otpverification")
          }
          return otp;
      })

      console.log(transporter,"transporter",122);
  } catch (error) {
      console.log(error.message);
  }
}

const reotp= async(req,res)=>{
  try{
    const { name, email } = userRegData; // Fetch the user's data here
    console.log(email)

  // Resend the OTP email using your mail sending function
  const otp = await sendVerifyMail(name, email, res);
  }catch (error) {
    console.log(error.message);
    console.log("aaaaaaaaaaaaaaaaa")
  }
}

const orderCancel = async (req, res) => {
  try {
    const userId=req.session.user_id;
    const userData=await User.findById(userId)
    const orderId=req.body.id

    const orderData= await Order.findById(orderId)
    const paymentMethod = orderData.paymentMode
    const currentBalance=userData.wallet
    const refundAmount =orderData.totalBill;

    const updateTotalAmount=currentBalance+refundAmount
   

    if(paymentMethod == "razorpay" ||paymentMethod =="wallet"){
      
      const updatewalletAmount=await User.findByIdAndUpdate(

        userData._id,
        {$set:{wallet:updateTotalAmount}},
        {new:true})

        console.log("order completed");
      
    }

    

    


    const { id } = req.body;
    const updatedData = await Order.findByIdAndUpdate(
      { _id: id },
      { status: "cancelled" },
      { new: true }
    );
    res.json(updatedData);
  } catch (error) {
    console.log(error.message);
  }
};



const orderReturn= async (req,res)=>{
  try{
    console.log("entered to return");
  const userId=req.session.user_id
  const userData=await User.findById(userId);
  const orderId=req.body.id;

const orderData=await Order.findById(orderId);
const paymentMethode=orderData.paymentMode;
const currentBalance=userData.wallet;
const refundAmount=orderData.totalBill

const updateTotalAmount=currentBalance+refundAmount

const updatelwalletAmount=await User.findByIdAndUpdate(
  userData._id,
  {$set:{wallet:updateTotalAmount}},
  {new:true})

  console.log("order complected")

const {id}=req.body;
const updatedData=await Order.findByIdAndUpdate(
  id,
  {status:'returned'},
  {new:true});
  res.json(updatedData)
}catch(error){
console.log(error.message);
res.status(500).json({ error: 'Something went wrong' });
}

}

const walletview = async(req,res)=>{
  try{
    const id= req.session.user_id
    console.log(id)
    const wallet = await User.findById({_id:id})
    console.log(wallet.wallet)
    res.render("users/wallet",{walletamt:wallet.wallet})
  } catch (error) {
    console.log(error.message);
  }
}



 module.exports={
    loadHome,
    loadRegister,
    insertUser,
    loadverifyotp,
    verifyotp,
    loginLoad,
    verifyLogin,
    userLogout,
    loadCategoryProducts,
    loadDeatails,
    addToCart,
    loadShop,

    loadAddress,
    loadAddAddress,
    addAddress,
    loadEditAddress,
    editAddress,
    deleteAddress,
    walletview,


    loadProfile,
    loadEditProfile,
    editProfile,
    invoiceDownload,
    
    forgetLoad,
    forgetVerify,
    forgetPasswordLoad,
    resetPassword,
    loadverifyotp,
    verifyotp,
    forgetPasswordOtpLoad,
    forgetVerifyotp,
    loadresetpassword,
    resetpassword,
    reotp,




    orderHistory,
    orderHistoryDetails,
    orderCancel,
    orderReturn,
 }