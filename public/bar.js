//makes two bars with lines indicating which two are matching
var chart; 

function setUpBars(parameters)
{
    constructBars(parameters[0], parameters[1]);
}

//direct comparison of two documents by their topic makeup
function constructBars(d1, d2)
{
    document.title = "Documents " + d1 + " & " + d2;
    width = 600;
    height = 560;

    chart = d3.select("#chart-container")
        .append('svg')
        .attr("class", "bar-svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("stroke", gray)
        .attr("stroke-width", "0.5");

    addCorpusLink(pages.bars);

    var filtered_1 = filter(csv_data[d1]);
    var filtered_2 = filter(csv_data[d2]);

    done = false;
    getDocumentData([d1,d2], function()
    {
        generateBar(0, 40, 100, [filtered_1,filtered_2], [d1,d2], addLines);   
    });
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
        .on("click", function(d) { 
            if(d.index !== "~")
            {
                goTo(pages.bars, pages.topic, [d.index, 1]); 
            }
        })
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
                .on("click", function() { 
                    goTo(pages.bars, pages.donut, indexList[num]);
                })
                .attr("x", x-10)
                .attr("y", 20)
                .text(conditional_clip(document_text[indexList[num]]["title"], 30))
                .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
                .on("mousemove", function(d){
                    var index = indexList[num];
                    return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_document_tooltip(index)).style("background-color", "#d3d3d3").style("color", "white");})
                .on("mouseout", function(){return tooltip.style("visibility", "hidden");}) 
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

    for(var i = 0; i < d1.length-1; i++)
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
        drawShape(t1, t2, i);
    }
}

//make a parellelogram across the bars
function drawShape(t1, t2, i)
{
    var offset = 1; //make it look less ugly
    var poly = [
        {"x":fetchX(t1)+fetchWidth(t1)+offset, "y":fetchY(t1)+offset},
        {"x":fetchX(t1)+fetchWidth(t1)+offset, "y":fetchY(t1)+fetchHeight(t1)-offset},
        {"x":fetchX(t2)-offset,"y":fetchY(t2)+fetchHeight(t2)-offset},
        {"x":fetchX(t2)-offset,"y":fetchY(t2)+offset}
    ];

    chart.selectAll("polygon.x"+i) //a bit of a hack - selects need to be distinct so I gave it the number rect we are drawing
        .data([poly])
        .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) { return [d.x,d.y].join(","); }).join(" ");})
            .attr("stroke",fetchColor(t1))
            .attr("fill",fetchColor(t1))
            .attr("stroke-width",2)
        .attr("opacity", .4);
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

function fetchWidth(svgrect)
{
    return parseFloat(svgrect[0][0].width.baseVal.value);
}

function fetchColor(svgrect)
{
    return svgrect[0][0].attributes[5].value.slice(6,-1);
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

//remove all traces of bars diagram
function barsCleanup()
{
    removeCorpusButton();
    d3.select(".tooltip").style("visibility", "hidden");
    d3.select(".bar-svg").remove();
}

//main
function barsMain(parameters)
{
    setUpBars(parameters);
}
