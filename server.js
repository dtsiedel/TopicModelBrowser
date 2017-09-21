var express = require("express");
var html = require("html");
var app = express(); //start express
var path = require("path");

//load index.html
var publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));


app.listen(3000, function() {
  console.log("App started on http://localhost:3000/");
});
