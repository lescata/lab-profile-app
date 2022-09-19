const router = require("express").Router();
const User = require("../models/User.model");
const express = require("express");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const{isAuthenticated} = require("../middleware/jwt.middleware");
const { response } = require("../app");
const fileUploader = require("../config/cloudinary.config");

const saltRounds = 10;

router.get("/", (req, res, next) => {
  res.json("All good in here");
});


router.post('/auth/signup', (req, res, next) => {
  const { username, password, campus, course, } = req.body;

  // Check if email or password or name are provided as empty string 
  if (username === '' || password === '' || campus === '' || course === '') {
    res.status(400).json({ message: "Provide username, password, campus and  course please" });
    return;
  }

  // Use regex to validate the password format
  const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!passwordRegex.test(password)) {
    res.status(400).json({ message: 'Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.' });
    return;
  }


  // Check the users collection if a user with the same email already exists
  User.findOne({ username  })
    .then((foundUser) => {
      // If the user with the same email already exists, send an error response
      if (foundUser) {
        res.status(400).json({ message: "User already exists." });
        return;
      }

      // If email is unique, proceed to hash the password
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // Create the new user in the database
      // We return a pending promise, which allows us to chain another `then` 
      return User.create({ username, password: hashedPassword, campus, course});
    })
    .then((createdUser) => {
      // Deconstruct the newly created user object to omit the password
      // We should never expose passwords publicly
      const { username, campus, course, _id } = createdUser;
    
      // Create a new object that doesn't expose the password
      const user = { username, campus, course,_id };

      // Send a json response containing the user object
      res.status(201).json({ user: user });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ message: "Internal Server Error" })
    });
});


router.post('/auth/login', (req, res, next) => {
  const { username, password } = req.body;

  // Check if email or password are provided as empty string 
  if (username === '' || password === '') {
    res.status(400).json({ message: "Provide username and password." });
    return;
  }

  // Check the users collection if a user with the same email exists
  User.findOne({ username })
    .then((foundUser) => {
    
      if (!foundUser) {
        // If the user is not found, send an error response
        res.status(401).json({ message: "User not found." })
        return;
      }

      // Compare the provided password with the one saved in the database
      const passwordCorrect = bcrypt.compareSync(password, foundUser.password);

      if (passwordCorrect) {
        // Deconstruct the user object to omit the password
        const { _id, username} = foundUser;
        
        // Create an object that will be set as the token payload
        const payload = { _id, username};

        // Create and sign the token
        const authToken = jwt.sign( 
          payload,
          process.env.TOKEN_SECRET,
          { algorithm: 'HS256', expiresIn: "6h" }
        );

        // Send the token as the response
        res.status(200).json({ authToken: authToken });
      }
      else {
        res.status(401).json({ message: "Unable to authenticate the user" });
      }

    })
    .catch(err => res.status(500).json({ message: "Internal Server Error" }));
});


router.get("/auth/verify",isAuthenticated, (req,res,next) =>{
  console.log(req.payload),
res.status(200).json(req.payload)

});


router.put("/users", isAuthenticated,fileUploader.single("image"),(req,res,next) =>{
console.log("LLLLLLLL aaaaaaaa", req.body)

User.findByIdAndUpdate(req.payload._id,{image:req.file.path},{new:true})
.then(reponse => {
  res.status(200).json(reponse)
})
.catch(err =>  {console.log("error is:", err) 
next(err)});
});


router.get("/users", isAuthenticated,(req,res,next) =>{
User.findById(req.payload._id)
.then(response => {
  res.json(response)
})
.catch(err => res.status(500).json({ message: "Internal Server Error" }
));


});

router.post("/upload", isAuthenticated, fileUploader.single("image"), (req, res, next) => {
  console.log("LAAaaaaaaaaaaaaaaaaaaaaa", req.body)
  if (!req.file) {
    next(new Error("No file uploaded!"));
    return;
  }
  
  // Get the URL of the uploaded file and send it as a response.
  // 'fileUrl' can be any name, just make sure you remember to use the same when accessing it on the frontend
  
  res.json({ image: req.file.path });
});


module.exports = router;