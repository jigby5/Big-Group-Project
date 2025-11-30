// Load environment variables from .env file into memory
// Allows you to use process.env
require('dotenv').config();

const express = require("express");

//Needed for the session variable - Stored on the server to hold data
const session = require("express-session");

// Allows you to read the body of incoming HTTP requests and makes that data available on req.body
let bodyParser = require("body-parser");

let path = require("path");

// defines app (the whole page) as an express object
let app = express();

// Use EJS for the web pages - requires a views folder and all files are .ejs
app.set("view engine", "ejs");

// process.env.PORT is when you deploy and 3000 is for test
const port = process.env.PORT || 3000;

// provides session security 
app.use(
    session(
        {
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
        }
    )
); 

const knex = require("knex")({
    client: "pg",
    connection: {
        host : process.env.RDS_HOSTNAME || "localhost",
        user : process.env.RDS_USERNAME || "postgres",
        password : process.env.RDS_PASSWORD || "admin",
        database : process.env.RDS_DB_NAME || "project3",
        port : process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
}); // defines the connection to the PostgreSQL database that I setup the project table on

// tells the express object how to read form data through a request (req)
app.use(express.urlencoded({extended: true})); 

// tells where to find the linked styles sheet and other assets
app.use(express.static(path.join(__dirname, 'public')))

app.listen(port, () => {
    console.log("The server is listening 😎");
});

const bcrypt = require('bcrypt');

// --- Assuming the following imports are already present in your file ---
// const express = require('express');
// const knex = require('./path/to/your/knexInstance'); // Your Knex instance // Make sure this is imported!
// const app = express();
// ... other setup (session, body-parser, etc.)

app.post("/login", (req, res) => {
    let sName = req.body.username;
    let sPassword = req.body.password; // This is the plaintext password the user submitted

    // 1. Fetch only the user data needed for authentication and session
    knex.select("password", "level")
    .from('users')
    .where("username", sName)
    .first() // Use .first() since username should be unique, retrieving a single user or null
    .then(user => {
      // 2. Check if a user was found at all
      if (!user) {
        // No user with that username exists
        return res.render("login", { error_message: "Invalid username or password" });
      }

      // 3. Compare the plaintext password against the stored hash
      // The stored hash is in user.password
      bcrypt.compare(sPassword, user.password, (err, isMatch) => {
        if (err) {
          // Handle bcrypt error (e.g., hash is malformed)
          console.error("Bcrypt comparison error:", err);
          return res.render("login", { error_message: "An internal authentication error occurred." });
        }

        // 4. Check if the passwords matched
        if (isMatch) {
          // Passwords match! Authentication successful.
          const sLevel = user.level;
          req.session.isLoggedIn = true;
          req.session.username = sName;
          req.session.level = sLevel; // Set the level for manager checks
          
          res.redirect("/");
        } else {
          // Passwords do NOT match.
          // Note: It's best practice to give a generic error message
          // so attackers can't tell if the username or password was wrong.
          res.render("login", { error_message: "Invalid username or password" });
        }
      });
    })
    .catch(err => {
      console.error("Database or general login error:", err);
      // In case of a database connectivity issue or other unexpected error
      res.render("login", { error_message: "Could not process login request." });
    });
});

app.get("/", (req, res) => { // get request that is run on start (which is what the "/" does)
    res.render("index")
});

app.get("/login", (req, res) => { // get request that is run with any a tags to login.ejs
    res.render("login")
});

app.get("/register", (req, res) => { // get request that is run with any a tags to register.ejs
    res.render("register")
});

const saltRounds = 10; // tells bcrypt how complicated to make the encryption.

app.post("/register", (req, res) => {
    // 1. Extract all required fields from the request body
    const { username, password, email, level, phone } = req.body; 

    // Basic validation
    if (!username || !password || !email || !level || !phone) {
        return res.status(400).render("register", { 
            error_message: "Please fill in all required fields." 
        });
    }

    // 2. Hash the plaintext password before database insertion
    // Use an error-first callback pattern
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error("Error hashing password:", err);
            return res.status(500).render("register", { 
                error_message: "Server error during registration. Please try again." 
            });
        }

        // 3. Create the data object using the HASHED password
        const newUser = {
            username: username,
            // Store the HASHED password (must be VARCHAR(60) or TEXT in DB)
            password: hashedPassword, 
            email: email,
            level: level, 
            phone: phone 
        };

        // 4. Insert the user into the database using Knex
        knex("users")
            .insert(newUser)
            .then(() => {
                // Success: Redirect to login
                console.log(`New user successfully registered: ${username}`);
                res.redirect("/login");
            })
            .catch((dbErr) => {
                // Handle common database errors (e.g., unique constraint violation)
                console.error("Error inserting user:", dbErr.message);

                let errorMessage = "Registration failed. That username or email may already be taken.";

                // Render the form again with the error message
                res.status(500).render("register", { error_message: errorMessage });
            });
    });
});