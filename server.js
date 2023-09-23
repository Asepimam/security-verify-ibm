const express = require("express");
const session = require("express-session");
const { OAuthContext } = require("ibm-verify-sdk");
const path = require("path");
const app = express();
const cors = require("cors");

app.use(
  session({
    secret: "my-secret",
    resave: true,
    saveUninitialized: false,
  }),
  cors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "front-end"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// load contents of .env into process.env
require("dotenv").config();

const config = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  responseType: process.env.RESPONSE_TYPE,
  flowType: process.env.FLOW_TYPE,
  scope: process.env.SCOPE,
};

const authClient = new OAuthContext(config);
console.log(authClient);

// Home route
app.get("/", (req, res) => {
  if (req.session.token) {
    res.redirect(process.env.URL_FRONTEND + "tasks");
  } else {
    res.redirect(process.env.URL_FRONTEND);
  }
});
// login route
app.get("/login", (req, res) => {
  authClient
    .authenticate()
    .then((url) => {
      res.redirect(url);
    })
    .catch((error) => {
      console.log(`There was an error with the authentication process:`, error);
      res.send(error);
    });
});
// callback route
app.get(process.env.REDIRECT_URI_ROUTE, (req, res) => {
  authClient
    .getToken(req.url)
    .then((token) => {
      token.expiry = new Date().getTime() + token.expires_in * 10;
      req.session.token = token;
      res.redirect(process.env.URL_FRONTEND + "tasks");
    })
    .catch((error) => {
      res.send("ERROR: " + error);
    });
});
// dashboard route
app.get("/user/details", (req, res) => {
  if (req.session.token) {
    authClient
      .userInfo(req.session.token)
      .then((response) => {
        const data = response.response;
        res.json(data); // Mengirimkan data sebagai JSON
      })
      .catch((err) => {
        res.json(err);
      });
    console.log("token nya nih", req.session.token);
  } else {
    console.log("======== Current session had no token available.");
    console.log(req.session.token);
    res.redirect(process.env.URL_FRONTEND);
  }
});

// delete token from storage when logging out
app.get("/logout", (req, res) => {
  if (!req.session.token) {
    console.log("", req.session.token);
    const message = "No token to revoke.";
    res.send(message);
    return;
  }
  authClient
    .revokeToken(req.session.token, "access_token")
    .then(() => {
      delete req.session.token;
      const message = "Token revoked.";
      res.json(message);
    })
    .catch((err) => {
      console.log("======== Error revoking token: ", err);
      res.redirect("/");
    });
});

app.listen(3000, () => {
  console.log("Server started");
  console.log("Navigate to http://localhost:3000");
});
