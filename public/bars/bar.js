//TODO: (BARS)
//TODO: topic name on bars 
//TODO: tooltip
//TODO: show related topics with lines

//TODO: (DONUT)

//TODO: (CORPUS)
//TODO: run offline for ribbon data
//TODO: duplicated data in ribbon arrays (accessor arrays can fix)
//TODO: repeated code with donut
//TODO: add the ribbons 
//TODO: figure out legend (maybe just have it scrollable?)

//TODO: (GENERAL)
//TODO: split getData() so that we can consolidate repeated bits to library.js - easiest way would be to make it take a parameter for the function that it calls at the end
//TODO: from each document pull up "related" and have a view/compare option for each to get to comparison view
//TODO: |->or have multiple select on corpus screen, we haven't decided
//TODO: make getTopicIndices() only called once (do this after we've merged views). Cache results of fetching csv data
//TODO: lot of general cleanup for repeated code, bad naming, etc.

//TODO: (SINGLE TOPIC)
//TODO: make it (lol)
//TODO: single topic view pulls beginning of documents and highlights words if they have them
//TODO: |->if the first n characters contains no key words, slide window doen

var chart;
var tooltip;

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructChart function the first time
//needs to be split later so that we can not duplicate code
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

function main()
{
    getTopicIndices([getData]);
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
        .attr("height", 0)
        .transition()
        .duration(500)
        .attr("y", function (d) { var x = current_y; current_y += d.value*scale; return x; })
        .attr("height", function (d) { return d.value*scale; })
        .attr("id", function(d,i) { return "bar_1_"+i; })
        .style("fill", function (d) { return d.color })
        .each("end", function(d,i) {
                var current = d3.select(this);
                var x = current.attr("x");
                var y = current.attr("y");
                //console.log(x + " " + y);
                current.selectAll(".barText")
                        .data(filtered_1)
                   .enter().append("text")
                        .attr("class", "barText")
                        .attr("x", x) //Move the text from the start angle of the arc
                        .attr("y", y) //Move the text down
                        .attr("letter-spacing", "1px")
                        .style("font-family", "sans-serif")
                   .append("textPath")
                        //.attr("xlink:href",function(d,i){return "#bar_1_"+i;}) 
                        .text(function(d){if(d.index === 0){return "Other";} return "T" + d.index;})
                        .style("fill", "white");
        });

    current_y = 0;
    chart.selectAll(".t2")
        .data(filtered_2)
        .enter().append("rect")
        .attr("width", width)
        .attr("x", 200)
        .attr("y", current_y)
        .attr("height", 0)
        .transition()
        .duration(500)
        .attr("y", function (d) { var x = current_y; current_y += d.value*scale; return x; })
        .attr("height", function (d) { return d.value*scale; })
        .style("fill", function (d) { return d.color });
}

//call main
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
