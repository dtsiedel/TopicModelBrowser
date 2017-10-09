//TODO (BARS)
//TODO: topic name on bars 
//TODO: tooltip
//TODO: show related topics with lines

//TODO: (DONUT)
//TODO: legend of topics (as per Chuah suggestion)
//TODO: tooltip off screen issue
//TODO: make tooltip a full info box instead of just text (rel ^)

//TODO: (GENERAL)
//TODO: split getData() so that we can consolidate repeated bits to library.js
//TODO: make same color for a topic between different views (see below)
//TODO: dynamic color generation based on current colors, or even spacing 
//      |-> once this is done, move color_map to library.js and we should have shared topic colors across all views

var csv_data;
//var threshold = 0.05;
var colors = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
var color_map = {}; //which topic is associated with which color 
var gray = "#7d8084";
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
    getData();
}

//direct comparison of two documents by their topic makeup
function constructBars(t1, t2)
{
    var filtered_1 = filter(csv_data[t1]);
    var filtered_2 = filter(csv_data[t2]);
    console.log(filtered_1);
    console.log(filtered_2);
    
    color_map = {}; //temporary until we have enough colors for all topics

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
