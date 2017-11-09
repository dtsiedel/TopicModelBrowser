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

        var url = window.location.href;
        url = new URL(url);
    
        var d1 = url.searchParams.get("d1");
        var d2 = url.searchParams.get("d2");

        if((d1 === null) || (d2 == null))
        {
            var d1 = randomDocument();
            var d2 = randomDocument();
        }

        console.log(d1);
        console.log(d2);

        constructBars(d1, d2);
    });
}


//direct comparison of two documents by their topic makeup
function constructBars(d1, t2)
{
    var filtered_1 = filter(csv_data[d1]);
    var filtered_2 = filter(csv_data[t2]);
    console.log(filtered_1);
    console.log(filtered_2);
    
//    var current_y = 0;
//    var base_x = 0;
//    var scale = 400;
//    var width = 100;
//
//    //TODO: should probably make this a function instead of repeating it twice
//    chart.selectAll(".d1")
//        .data(filtered_1) 
//        .enter().append("rect")
//        .attr("width", width)
//        .attr("x", 0)
//        .attr("y", current_y)
//        .attr("height", 0)
//        .transition()
//        .duration(500)
//        .attr("y", function (d) { var x = current_y; current_y += d.value*scale; return x; })
//        .attr("height", function (d) { return d.value*scale; })
//        .attr("id", function(d,i) { return "bar_1_"+i; })
//        .style("fill", function (d) { return d.color })
//        .each("end", function(d,i) {
//            var current = d3.select(this);
//            chart.append("text")
//                .attr("class", "bar_text")
//                .attr("x", function() { return parseFloat(current[0][0].attributes[1].value) + 5;}) //what the hell
//                .attr("y", function() { return parseFloat(current[0][0].attributes[2].value) + 13;})
//                .text(function(){if(d.index === '~'){return "Other";}else{return "T" + d.index;}})
//                .style("fill", "white")
//        });
//
//
//    current_y = 0;
//    base_x = 200;
//    chart.selectAll(".t2")
//        .data(filtered_2)
//        .enter().append("rect")
//        .attr("width", width)
//        .attr("x", base_x)
//        .attr("y", current_y)
//        .attr("height", 0)
//        .transition()
//        .duration(500)
//        .attr("y", function (d) { var x = current_y; current_y += d.value*scale; return x; })
//        .attr("height", function (d) { return d.value*scale; })
//        .style("fill", function (d) { return d.color });

        generateBar(0, 0, 0, [filtered_1, filtered_2]);
        //generateBar(2, 200, 0, filtered_2);
}

//generate a single bar
function generateBar(num, x, y, data)
{
    var scale = 400;
    var width = 100;

    chart.selectAll(".d" + num)
        .data(data[num]) 
        .enter().append("rect")
        .attr("width", width)
        .attr("x", x)
        .attr("y", y)
        .attr("height", 0)
        .on("click", function(d) { window.location = "/topic?t="+d.index; })
        .transition()
        .duration(500)
        .attr("y", function (d) { var x = y; y += d.value*scale; return x; })
        .attr("height", function (d) { return d.value*scale; })
        .attr("id", function(d,i) { return "bar_" + num + "_"+i; })
        .style("fill", function (d) { return d.color })
        .each("end", function(d,i) {
            var current = d3.select(this);
            chart.append("text")
                .attr("class", "bar_text")
                .attr("font-weight", "bold")
                .attr("x", function() { return parseFloat(current[0][0].attributes[1].value) + 5;}) //what the hell
                .attr("y", function() { return parseFloat(current[0][0].attributes[2].value) + 13;})
                .text(function(){if(d.index === '~'){return "Other";}else{return "T" + d.index;}})
                .style("fill", function(){if(d.index=== "~"){return "black";} return "white";})
        });
    
    if(num !== data.length - 1)
    {
        generateBar(num+1, x+200, 0, data);
    }
}

function main()
{
    getTopicIndices(getData);
}

//call main
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
