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
    getTopicIndices(getData);
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructDonut function the first time
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
        .style("width", "225px")
        .style("background-color", "white")
        .style("padding-left", "5px")
        .style("z-index", "10") //put it in front of the arcs
        .style("border-radius", "10px")
        .style("visibility", "hidden")
        .style("border", "1px solid white")
        .text("Error"); //bad to see this (obviously)

    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        csv_data = rectify_csv_data(csv_data);
        
        var url_string = window.location.href; //fetch document we want to show
        var url = new URL(url_string);
        var doc = url.searchParams.get("doc");


        get_document_full_texts(function()
        {    
            if(doc === null)
                constructDonut(randomDocument());
            else
                constructDonut(doc);
        });
    });
}

//comparison function to use when sorting our topics
function compare_value(a,b)
{
    return (a.value < b.value) ? 1 : -1;
}


//main work of making donut chart
function constructDonut(n)
{
    var chosenDocument = csv_data[n];
    var filteredData = filter(chosenDocument);

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
        .attr("class", "arc")
        .on("click", function(d) { window.location.href = "/topic?t="+d.data.index });

    chart.selectAll('.legend').remove();

    g.append("path")
      .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
      .on("mousemove", function(d){
            var topic_text = d3.select(this).data()[0]["data"]["topic"]; 
            var index = d3.select(this).data()[0]["data"]["index"];
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_tooltip_html(index, topic_text, d.value)).style("background-color", d.data.color).style("color", "white");})
      .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
      .style("fill", function(d,i) { return d.data.color; })
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
                        .text(function(d){if(d.index === '~'){return "Other";} return "T" + d.index;}) 
                        .style("fill", "white");	 
                    
                    chart.append("text")
                        .attr("text-anchor", "middle")
                        .text(conditional_clip(document_text[n]["title"], 30))
                        .style("fill", "white")
                        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) 
                        .on("mousemove", function(d){
                                return tooltip.style("top", (event.pageY+20)+"px").style("left",(event.pageX+10)+"px").html(generate_document_tooltip(n)).style("background-color", gray).style("color", "white");})
                        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
                        .on("click", function(){ 
                            var url = document_text[n]["url"];
                            window.open(url, "_blank");
                        });
                    
                    addLegend(chart, filteredData, 18, 12);
            }
    });

    chart.append("text")
        .attr("x", -90)
        .attr("y", -200)
        .style("font-size", "35px")
        .style("fill", "white")
        .text("Document " + n);

}


//call main on load
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
