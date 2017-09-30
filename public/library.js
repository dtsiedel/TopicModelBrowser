//Includes functions used by multiple views, to avoid duplication

var threshold = 0.05; //how high must a topic be to be included?

document.addEventListener("DOMContentLoaded", function(e) {
    console.log("loaded libary");
});

//gives a random index in the range of our documents
function randomDocument()
{   
    return Math.floor(Math.random()*csv_data.length);
}

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
        newEntry["color"] = randomColor(count);
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

function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 600 - margin.left - margin.right;
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

function randomColor(n)
{
    if(n in color_map)
    {
        return color_map[n];   
    }
 
    var color;
    do
    {
        color = colors[Math.floor(Math.random()*colors.length)];
    }
    while(Object.values(color_map).indexOf(color) > -1) //god I hate javascript

    color_map[n] = color;
    return color;
}
