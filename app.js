if (process.env.NODE_ENV != "production") { 
  require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
app.engine("ejs", ejsMate);
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname,"/public")));

const dbUrl = process.env.ATLASDB_URL;

main().then(() => {
    console.log("connected to database");
}).catch (err => {
    console.log(err);
});
async function main() {
    await mongoose.connect(dbUrl);
}

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 3600,
}); 

store.on("error", () => {
    console.log("ERROR IN MONGO SESSION STORE", err);
});
app.set('trust proxy', 1); // tells Express to trust Render's proxy

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false, // should be false in most cases
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 3, // 3 days
        httpOnly: true,
        secure: true,                   //  required for HTTPS (Render)
        sameSite: "lax"                 //  safe for forms + login
    }
};
// const sessionOptions = {
//     store,
//     secret : process.env.SECRET,
//     resave : false,
//     saveUninitialized : true,
//     cookie : {
//         expires : Date.now() + 1000*60*60*24*3,
//         maxAge : 1000*60*60*24*3,
//         httpOnly : true
//     }
// };

// app.get("/", (req,res) => {
//     res.send("The root is working");
// });

app.use(session(sessionOptions)); 
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//M.W to define local variables
app.use((req,res,next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next(); 
});






// app.get("/testListing", async(req,res) => {
//     let sampleListing = new Listing ({
//         title: "My new Villa",
//         description: "By the beach",
//         price: 1200,
//         location: "Calangute, Goa",
//         country: "India"
//     });
//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("successful testing");
// });

// app.get('/demouser', async(req,res) => {
//     let fakeUser = new User ({
//         email : "student@gmail.com",
//         username : "delta-student"
//     });
//      let registeredUser = await User.register(fakeUser, "helloworld");
//      res.send(registeredUser);
// })

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);


app.all("*", (req,res,next) => {
    next(new ExpressError(404, "Page Not Found"));
});

app.use((err,req,res,next) => {
   let {statusCode= 500, message= "Something went wrong"} = err;
   res.status(statusCode).render("error.ejs",{message});
});

app.listen(8080, () => {
    console.log("server is listening to port 8080");
});