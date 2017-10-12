//see bars for TODOs

var csv_data;
var gray = "#7d8084";
var arc_delay = 250;
var margin;
var width;
var height;
var radius;
var chart;
var tooltip;

//driver
function main()
{
    getData();
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructChart function the first time
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 1000 - margin.left - margin.right;
    height = width - margin.top - margin.bottom - 500;
    radius = Math.min(width, height) / 2.5;

    // add the canvas to the DOM 
    chart = d3.select("#donut-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + ((width/4)) + "," + ((height/2)+margin.top) + ")");

    tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("width", "200px")
        .style("background-color", "white")
        .style("padding-left", "5px")
        .style("z-index", "10") //put it in front of the arcs
        .style("border-radius", "10px")
        .style("visibility", "hidden")
        .style("border", "1px solid white")
        .text("Error"); //bad to see this (obviously)

    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        var target = randomDocument();
        constructChart(target);
    });
}

//comparison function to use when sorting our topics
function compare_value(a,b)
{
    return (a.value < b.value) ? 1 : -1;
}


//main work of making donut chart
function constructChart(n)
{
    var chosenDocument = csv_data[n];
    var filteredData = filter(chosenDocument);
    
    console.log(filteredData);

    function arcTween(d) {
        arc = d3.svg.arc().outerRadius(radius*1.1).innerRadius(radius-50).cornerRadius(5);
        return arc(d);
    }
    
    var arc = d3.svg.arc()
        .outerRadius(radius)
        .innerRadius(radius - 50)
        .cornerRadius(5);
    
    var pie = d3.layout.pie()
        .sort(null)
        .startAngle(0)
        .endAngle(2*Math.PI)
        .value(function(d) { return d.value; });

    var g = chart.selectAll(".arc")
        .data(pie(filteredData))
        .enter().append("g")
        .attr("class", "arc");

    chart.selectAll('.legend').remove();

    g.append("path")
      .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
      .on("mousemove", function(d){
            var topic_text = d3.select(this).data()[0]["data"]["topic"]; 
            var index = d3.select(this).data()[0]["data"]["index"];
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_tooltip_html(index, topic_text, d.value)).style("background-color", d.data.color).style("color", "white");})
      .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
      .style("fill", function(d) { return d.data.color; })
      .transition().duration(750)
      .attr("id", function(d,i) { return "arc_"+i; })
      .attrTween('d', function(d) {
           var i = d3.interpolate(d.startAngle, d.endAngle-.01); //calculate the in between positions to draw in 
           return function(t) {
               d.endAngle = i(t);
             return arc(d);
           }
        }).each("end", function(d,i) {
            //Append the month names within the arcs after all have loaded
            if(i == filteredData.length - 1)
            {
                g.selectAll(".arcText")
                        .data(filteredData)
                   .enter().append("text")
                        .attr("class", "arcText")
                        .attr("x", 7) //Move the text from the start angle of the arc
                        .attr("dy", 18) //Move the text down
                        .attr("letter-spacing", "1px")
                        .style("font-family", "sans-serif")
                   .append("textPath")
                        .attr("xlink:href",function(d,i){return "#arc_"+i;}) //xlink seems to bind the text to the arc
                        .text(function(d){if(d.index === 0){return "Other";} return "T" + d.index;}) 
                        .style("fill", "white");	 
                    
                    chart.append("text")
                        .attr("text-anchor", "middle")
                        .text("Document " + n)
                        .style("fill", "white")
                        .on("click", function(){ 
                            d3.selectAll(".arc").remove(); 
                            d3.select(this).remove(); 
                            setTimeout(constructChart(randomDocument()), 50); });
                    
                    addLegend(chart, filteredData, 18, 12);
        
            }
    });

}

//does all the text formatting for the tooltip
function generate_tooltip_html(topic_number, topic_name, percentage)
{
    topic_words = topic_name.split("_");
    text = "<div>";
    text += "T" + topic_number + " (" + (percentage*100).toFixed(2) + "%)" + "<br>Sample Words:<br>";
    for(var i = 0; i < topic_words.length; i++)
    {
        text += topic_words[i];
        text += "<br>"
    }
    text += "</div>";
    return text;
}

//call main on load
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
