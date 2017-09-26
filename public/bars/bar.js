//TODO: animate in
//TODO: tooltip
//TODO: same number topics get same color
//TODO: show related topics with lines

//TODO: export repeated functions and variables to a library .js file
//ex. (randomDocument, getData, filter, randomColor, threshold (esp. threshold)) 

var csv_data;
var threshold = 0.05;
var colors = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
var used_colors = [];
var gray = "#7d8084";
var chart;

//filter out topics that are less than thresh or invalid
function filter(topic_array)
{
    var filtered = [];
    var total = 0; //total should add to one, need this to see total of "other"
    var count = 1;
    for(key in topic_array)
    {
        if(key.length === 0)
            continue
        if(topic_array[key] < threshold)
        {
            count++; //still increment count since we want absolute index in csv, not just in this list
            continue
        }
        var val = topic_array[key];
        var newEntry = {};
        newEntry["index"] = count; //TODO: method to insert these key values?
        newEntry["topic"] = key;
        newEntry["value"] = parseFloat(val);
        newEntry["color"] = randomColor();
        filtered.push(newEntry);
        total += parseFloat(val);
        count++;
    }
    var other = {};
    other["index"] = 0;
    other["topic"] = "other";
    other["value"] = 1 - total;
    other["color"] = gray;
    filtered.push(other);
    return filtered;
}

//get a random color from the colors array
function randomColor()
{
    var color;
    do
    {
        color = colors[Math.floor(Math.random()*colors.length)];
    }
    while(used_colors.indexOf(color) !== -1) //god I hate javascript

    used_colors.push(color);
    return color;
}

//gives a random index in the range of our documents
function randomDocument()
{   
    return Math.floor(Math.random()*csv_data.length);
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructChart function the first time
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 400 - margin.left - margin.right;
    height = width - margin.top - margin.bottom;
    radius = Math.min(width, height) / 2;

    // add the canvas to the DOM 
    chart = d3.select("#bar-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("stroke", gray)
        .attr("stroke-width", "0.5");

    tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("z-index", "10") //put it in front of the arcs
        .style("border-radius", "10px")
        .style("visibility", "hidden")
        .text("Error"); //bad to see this (obviously)

    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        var t1 = randomDocument();
        var t2 = randomDocument();
        constructBars(t1, t2);
    });
}

function main()
{
    getData();
}

//direct comparison of two documents by their topic makeup
function constructBars(t1, t2)
{
    var filtered_1 = filter(csv_data[t1]);
    var filtered_2 = filter(csv_data[t2]);
    console.log(filtered_1);
    console.log(filtered_2);

    var current_y = 0;
    var scale = 400;
    var width = 100;

    //TODO: should probably make this a function instead of repeating it twice
    chart.selectAll(".t1")
        .data(filtered_1) 
        .enter().append("rect")
        .attr("width", width)
        .attr("x", 0)
        .attr("y", current_y)
        .transition()
        .duration(500)
        .attr("y", function (d) { var x = current_y; current_y += d.value*scale; return x; })
        .attr("height", function (d) { return d.value*scale; })
        .style("fill", function (d) { return d.color });

    current_y = 0;
    chart.selectAll(".t2")
        .data(filtered_2)
        .enter().append("rect")
        .attr("width", width)
        .attr("x", 200)
        .attr("y", current_y)
        .transition()
        .duration(500)
        .attr("y", function (d) { var x = current_y; current_y += d.value*scale; return x; })
        .attr("height", function (d) { return d.value*scale; })
        .style("fill", function (d) { return d.color });
}



