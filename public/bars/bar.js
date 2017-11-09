var chart;
var tooltip;
var done;

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
    

    done = false;
    generateBar(0, 0, 0, [filtered_1, filtered_2], addLines);   
    
}

//generate a single bar
function generateBar(num, x, y, data, callback)
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
                .attr("x", function() { return fetchX(current) + 5;}) 
                .attr("y", function() { return fetchY(current) + 13;})
                .text(function(){if(d.index === '~'){return "Other";}else{return "T" + d.index;}})
                .style("fill", function(){if(d.index=== "~"){return "black";} return "white";})
            if(num !== data.length - 1)
            {
                generateBar(num+1, x+200, 0, data, callback);
            }
            else
            {
                if(!done)
                {
                    done = true;
                    addLines(data);
                }
            }
        });
    
}

//add lines between matching topics in bars listed in docList
//only supports two for now
function addLines(docList)
{
    var d1 = docList[0];
    var d2 = docList[1];
    matches = [];

    for(var i = 0; i < d1.length; i++)
    {
        var index = d1[i].index;
        var where = checkContains(index, d2);
        if(where !== -1)
        {
            matches.push([i, where]);
        }
    }
    for(var i = 0; i < matches.length; i++)
    {
        var t1 = d3.select("#bar_0_"+matches[i][0]); 
        var t2 = d3.select("#bar_1_"+matches[i][1]); 
        drawLine(fetchX(t1), fetchY(t1), fetchX(t2), fetchY(t2));
    }
}

//actually add the svg line to the bars
function drawLine(x1, y1, x2, y2)
{
    chart.append("line").style("stroke", "white").attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2);
}

//this is the worst thing. Curse you Brendan Eich
function fetchX(svrgect)
{
    return parseFloat(svrgect[0][0].attributes[1].value);
}

//also the worst thing
function fetchY(svrgect)
{
    return parseFloat(svrgect[0][0].attributes[2].value);
}

//check if list contains an entry with index *index*
function checkContains(index, list)
{
    for(var i = 0; i < list.length; i++)
    {
        if(list[i].index === index)
        {
            return i;
        }
    }
    return -1;
}

function main()
{
    getTopicIndices(getData);
}

//call main
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
