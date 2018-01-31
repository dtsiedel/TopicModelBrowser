var express = require("express");
var html = require("html");
var app = express(); //start express
var path = require("path");
var fs = require("fs");

//load index.html
var publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

var document_text = {};

//chop up the json file 
function read_in_document_text()
{
    var content = fs.readFileSync("filtered_merged_file.json");
    content = JSON.parse(content);
    var count = 0;
    
    for(var i = 0; i < content.length; i++)
    {
        var current = content[i];
        for(var j = 0; j < current.length; j++)
        {
            var this_doc = current[j];
            var data = {};
            data.date = this_doc["date"];
            data.text = this_doc["body"];
            data.url = this_doc["link"];
            data.title = this_doc["title"];
            document_text[count] = data;
            count++;
        }
    }
}

//ajax endpoint to get the document text we parsed
app.get("/document_text", function(req, res) {
    var doc = req.query.doc;
    //console.log("Serving document " + doc);
    if(document_text[doc])
    {
        res.send(document_text[doc]);
    }
    else
    {
        res.send("{\"error\":\"error\"}");
    }
});

app.listen(8000, function() {
    read_in_document_text();
    console.log("App started on http://localhost:8000/");
});

