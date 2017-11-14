var chart;
var tooltip;
var done;

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructBars function the first time
//needs to be split later so that we can not duplicate code
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 600 - margin.left - margin.right;
    height = width - margin.top - margin.bottom + 140;
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
        .style("width", "200px")
        .style("padding-left", "5px")
        .style("position", "absolute")
        .style("z-index", "10") //put it in front of the arcs
        .style("border-radius", "10px")
        .style("visibility", "hidden")
        .style("border", "1px solid white")
        .text("Error"); //bad to see this (obviously)

    get_document_full_texts(function()
    {
        d3.csv("/topic_frame.csv", function(error, response) {
            csv_data = response;

            var url = window.location.href;
            url = new URL(url);
        
            var d1 = url.searchParams.get("d1");
            var d2 = url.searchParams.get("d2");

            if(d1 === null)
            {
                d1 = randomDocument();
            }
            if(d2 === null)
            {
                d2 = randomDocument();
            }

            constructBars(d1, d2);
        });
    });
}

//direct comparison of two documents by their topic makeup
function constructBars(d1, d2)
{
    var filtered_1 = filter(csv_data[d1]);
    var filtered_2 = filter(csv_data[d2]);

    console.log(filtered_1)
    
    done = false;
    generateBar(0, 40, 100, [filtered_1,filtered_2], [d1,d2], addLines);   
}

//generate a single bar
function generateBar(num, x, y, data, indexList, callback)
{
    var scale = 400;
    var width = 100;
    var given_y = y;

    chart.selectAll(".d" + num)
        .data(data[num]) 
        .enter().append("rect")
        .attr("width", width)
        .attr("x", x)
        .attr("y", y)
        .attr("height", 0)
        .on("click", function(d) { window.location = "/topic?t="+d.index; })
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
        .on("mousemove", function(d){
            var topic_text;
            if(d.index === "~") 
            {
                topic_text = "Other";
            }
            else
            {
                topic_text = reverse_topic_indices[d.index];
            }
            var index = d.index;
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_tooltip_html(index, topic_text, d.value)).style("background-color", d.color).style("color", "white");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
        .transition()
        .duration(500)
        .attr("y", function (d) { var x = y; y += d.value*scale; return x; })
        .attr("height", function (d) { return d.value*scale; })
        .attr("id", function(d,i) { return "bar_" + num + "_" +i;})
        .style("fill", function (d) { return d.color })
        .each("end", function(d,i) {
            var current = d3.select(this);
            chart.append("text")
                .attr("class", "bar_text")
                .attr("font-weight", function(){if(d.index==="~"){ return "bold";}})
                .attr("x", function() { return fetchX(current) + 5;}) 
                .attr("y", function() { return fetchY(current) + 14;})
                .text(function(){if(d.index === '~'){return "Other";}else{return "T" + d.index;}})
                .style("fill", function(){if(d.index==="~"){return "black";} return "white";})

            chart.append("text")
                .attr("class", "document_text")
                .on("click", function() { window.location.href = "/donut?doc="+indexList[num]; })
                .attr("x", x-10)
                .attr("y", 20)
                .text(conditional_clip(document_text[indexList[num]]["title"], 30))
                .style("fill", "white");

            if(num !== data.length - 1)
            {
                generateBar(num+1, x+250, given_y, data, indexList, callback);
            }
            else
            {
                if(!done)
                {
                    done = true;
                    addLines(data, indexList);
                }
            }
        });
}

//add lines between matching topics in bars listed in docList
//only supports two for now
function addLines(docList, indexList)
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
        drawLine(fetchX(t1), fetchY(t1), fetchHeight(t1), fetchX(t2), fetchY(t2), fetchHeight(t2), fetchColor(t2));
    }
}

//actually add the svg line to the bars
function drawLine(x1, y1, height1, x2, y2, height2, color)
{
    var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate("basis");

    x1 += 50;
    x2 += 50;
    y1 += height1 / 2;
    y2 += height2 / 2;
    color = color.slice(6, -1);

    var midX = ((x1 + x2) / 2) + randomOffset(100);
    var midY = ((y1 + y2) / 2) + randomOffset(75);

    var points = [{"x": x1, "y": y1}, {"x": midX, "y": midY}, {"x": x2, "y":y2}];

    chart.append("path")
        .style("fill", "none")
        .style("stroke", color)
        .style("stroke-width", "4")
        .attr("d", function() { return line(points) });
}

//essentially randint in range (-max,max)
function randomOffset(max)
{
    var num = Math.floor(Math.random()*max+1); 
    num *= Math.floor(Math.random()*2) > 1 ? 1 : -1; 
    return num;
}

//this is the worst thing. Curse you Brendan Eich
function fetchX(svgrect)
{
    return parseFloat(svgrect[0][0].attributes[1].value);
}

//also the worst thing
function fetchY(svgrect)
{
    return parseFloat(svgrect[0][0].attributes[2].value);
}

//wait actually this is worse
function fetchHeight(svgrect)
{
    return parseFloat(svgrect[0][0].height.baseVal.value);
}

function fetchColor(svgrect)
{
    return svgrect[0][0].attributes[5].value;
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
